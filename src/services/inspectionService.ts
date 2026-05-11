import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, getDoc, limit, startAfter, serverTimestamp, writeBatch, increment, setDoc } from 'firebase/firestore';
import type { InspectionRow } from '@shared/types';
import { useUserStore } from '@/store/userStore';

export interface DashboardStats {
  totalInspections: number;
  activeCameras: number;
  openAlerts: number;
  passRate: string;
  totalInventory: number;
}

type NormalizedResult = Record<string, unknown> & {
  pass: boolean;
  status: "pass" | "fail";
  type: string;
  diameter: number;
  length: number;
  unit: string;
  material?: string;
  batch?: string;
};

function normalizeResult(result: Record<string, unknown>): NormalizedResult {
  const pass =
    typeof result.pass === "boolean"
      ? result.pass
      : (result.status as string | undefined) !== "fail";

  const status = pass ? "pass" : "fail";
  const model = (result.model as string | undefined) ?? "line";
  const diameter = Number(result.diameter ?? 0) || 0;
  const length = Number(result.length ?? 0) || 0;
  const type =
    (result.type as string | undefined) ??
    (model === "circle" || diameter > 0 ? "pipe" : "rod");

  return {
    ...result,
    pass,
    status,
    type,
    diameter,
    length,
    unit: (result.unit as string | undefined) ?? "mm",
  };
}

function getUserId() {
  return useUserStore.getState().user?.id || 'anonymous';
}

export const inspectionService = {
  subscribeStats: (callback: (data: DashboardStats) => void) => {
    const userId = getUserId();
    // In a real app we'd use onSnapshot here but to match existing API lets just fetch. 
    // Or we export this explicitly.
  },

  list: async (page = 1, pageSize = 20, filters?: { status?: string; search?: string }) => {
    const userId = getUserId();
    const constraints: any[] = [where("user_id", "==", userId)];
    if (filters?.status && filters.status !== "All") constraints.push(where("status", "==", filters.status));
    constraints.push(orderBy("created_at", "desc"));
    // Simplification for search and pagination for demo
    constraints.push(limit(pageSize));

    const q = query(collection(db, "inspections"), ...constraints);
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
    })) as InspectionRow[];
    return { items, total: items.length }; // True total would require count() query
  },

  getById: async (id: string) => {
    const d = await getDoc(doc(db, "inspections", id));
    if (!d.exists()) throw new Error("Not found");
    const data = d.data();
    return {
      id: d.id,
      ...data,
      created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      inspection_results: []
    } as any;
  },

  create: async (data: Partial<InspectionRow>) => {
    const ref = await addDoc(collection(db, "inspections"), {
      ...data,
      user_id: getUserId(),
      created_at: serverTimestamp(),
      status: "active"
    });
    return { id: ref.id, ...data } as InspectionRow;
  },

  update: async (id: string, data: Partial<InspectionRow>) => {
    const ref = doc(db, "inspections", id);
    await updateDoc(ref, data);
    return { id, ...data } as InspectionRow;
  },

  saveResults: async (inspectionId: string, results: Record<string, unknown>[]) => {
    const batch = writeBatch(db);
    results.forEach(res => {
      const ref = doc(collection(db, "detections"));
      batch.set(ref, {
        ...res,
        inspection_id: inspectionId,
        user_id: getUserId(),
        created_at: serverTimestamp()
      });
    });
    await batch.commit();
    return results;
  },

  finalize: async (inspectionId: string, data: { results: Record<string, unknown>[]; duration: number }) => {
    const normalizedResults = data.results.map(normalizeResult);

    // 1. Update inspection
    const failCount = normalizedResults.filter((r) => !r.pass).length;
    const passCount = normalizedResults.length - failCount;
    const totalCount = normalizedResults.length;
    const passRate = totalCount > 0 ? `${((passCount / totalCount) * 100).toFixed(1)}%` : "0.0%";
    
    await updateDoc(doc(db, "inspections", inspectionId), {
      status: "completed",
      duration: data.duration,
      pass_count: passCount,
      fail_count: failCount,
      total_objects: totalCount,
      completed_at: new Date().toISOString(),
    });

    // We do batch client-side instead of cloud-functions for demo implementation
    const batch = writeBatch(db);
    let alertsCreated = 0;
    let inventoryCreated = 0;

    normalizedResults.forEach((res, idx) => {
      const dRef = doc(collection(db, "detections"));
      batch.set(dRef, {
        ...res,
        inspection_id: inspectionId,
        user_id: getUserId(),
        created_at: serverTimestamp()
      });

      const invRef = doc(collection(db, "inventory"));
      batch.set(invRef, {
        name: `${res.type} #${idx + 1}`,
        type: res.type,
        material: (res.material as string | undefined) ?? "unknown",
        diameter: res.diameter,
        length: res.length,
        wall_thickness: null,
        unit: res.unit,
        status: res.status,
        batch: (res.batch as string | undefined) ?? `batch-${inspectionId.slice(0, 8)}`,
        location: "",
        inspection_id: inspectionId,
        user_id: getUserId(),
        created_at: serverTimestamp()
      });
      inventoryCreated++;
    });

    if (failCount > 0) {
      const altRef = doc(collection(db, "alerts"));
      batch.set(altRef, {
        inspection_id: inspectionId,
        type: "inspection_defect",
        severity: failCount >= 5 ? "critical" : failCount >= 2 ? "warning" : "info",
        title: `${failCount} defect${failCount > 1 ? "s" : ""} detected`,
        message: `Inspection completed with ${passCount} pass and ${failCount} fail objects.`,
        is_read: false,
        dismissed: false,
        user_id: getUserId(),
        created_at: serverTimestamp()
      });
      alertsCreated = 1;
    }

    await batch.commit();

    // 2. Update dashboard_stats correctly using increment (mocking cloud function)
    const statsRef = doc(db, "dashboard_stats", getUserId() || "global_stats");
    await setDoc(statsRef, {
      totalInspections: increment(1),
      openAlerts: increment(alertsCreated),
      totalInventory: increment(inventoryCreated),
      passRate
    }, { merge: true });

    return { inspection: { id: inspectionId }, resultsSaved: normalizedResults.length, alertsCreated, inventoryCreated } as any;
  },

  getStats: async () => {
    const d = await getDoc(doc(db, "dashboard_stats", getUserId() || "global_stats"));
    if (d.exists()) {
       return d.data() as DashboardStats;
    }
    return {
      totalInspections: 0,
      activeCameras: 0,
      openAlerts: 0,
      passRate: "0.0%",
      totalInventory: 0
    };
  },

  getRecent: async (days = 7) => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const q = query(
        collection(db, "inspections"), 
        where("user_id", "==", getUserId()),
        where("created_at", ">=", since),
        orderBy("created_at", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
    })) as InspectionRow[];
  },

  getProfileCount: async () => {
    return { count: 1 };
  }
};
