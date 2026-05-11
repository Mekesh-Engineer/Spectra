// server/services/storageService.ts
// ─── Firestore Database Service ─────────────────────────────────────────────
// Replaces all Supabase PostgREST CRUD with Firebase Admin Firestore operations.

import { adminDb } from "../config/firebase";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

function generateId(): string {
  return adminDb.collection("_").doc().id;
}

function toRecord(snap: FirebaseFirestore.DocumentSnapshot): Record<string, unknown> {
  const data = snap.data();
  if (!data) return {};
  // Convert Firestore Timestamps to ISO strings for API compatibility
  const out: Record<string, unknown> = { id: snap.id };
  for (const [k, v] of Object.entries(data)) {
    out[k] = v instanceof Timestamp ? v.toDate().toISOString() : v;
  }
  return out;
}

export function createStorage() {
  return {
    // ─── Inspections ──────────────────────────────────────────────────────────

    saveInspection: async (data: Record<string, unknown>) => {
      const id = generateId();
      const doc = {
        ...data,
        created_at: FieldValue.serverTimestamp(),
      };
      await adminDb.collection("inspections").doc(id).set(doc);
      return { id, ...data, created_at: new Date().toISOString() };
    },

    getInspections: async (userId: string, page = 1, limit = 20, filters?: { status?: string; search?: string }) => {
      let query: FirebaseFirestore.Query = adminDb
        .collection("inspections")
        .where("user_id", "==", userId)
        .orderBy("created_at", "desc");

      if (filters?.status && filters.status !== "All") {
        query = query.where("status", "==", filters.status.toLowerCase());
      }

      // Firestore doesn't support ilike — fetch all and filter client-side for search
      const snapshot = await query.get();
      let items = snapshot.docs.map(toRecord);

      if (filters?.search) {
        const search = filters.search.toLowerCase();
        items = items.filter(
          (item) =>
            String(item.session_name ?? "").toLowerCase().includes(search) ||
            String(item.batch_id ?? "").toLowerCase().includes(search)
        );
      }

      const total = items.length;
      const from = (page - 1) * limit;
      const paged = items.slice(from, from + limit);

      return { items: paged, total };
    },

    getInspectionById: async (id: string, userId: string) => {
      const snap = await adminDb.collection("inspections").doc(id).get();
      if (!snap.exists) throw new Error("Inspection not found");
      const data = toRecord(snap);
      if (data.user_id !== userId) throw new Error("Unauthorized");

      // Fetch sub-collection: inspection_results
      const resultsSnap = await adminDb
        .collection("inspections")
        .doc(id)
        .collection("results")
        .get();
      const inspection_results = resultsSnap.docs.map(toRecord);

      return { ...data, inspection_results };
    },

    updateInspection: async (id: string, userId: string, updates: Record<string, unknown>) => {
      const ref = adminDb.collection("inspections").doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("Inspection not found");
      if (snap.data()?.user_id !== userId) throw new Error("Unauthorized");

      await ref.update({ ...updates, updated_at: FieldValue.serverTimestamp() });
      const updated = await ref.get();
      return toRecord(updated);
    },

    // ─── Inspection Results ───────────────────────────────────────────────────

    saveInspectionResults: async (results: Record<string, unknown>[]) => {
      if (results.length === 0) return [];
      const batch = adminDb.batch();
      const saved: Record<string, unknown>[] = [];

      for (const result of results) {
        const inspectionId = result.inspection_id as string;
        const id = generateId();
        const ref = adminDb
          .collection("inspections")
          .doc(inspectionId)
          .collection("results")
          .doc(id);
        const doc = { ...result, created_at: FieldValue.serverTimestamp() };
        batch.set(ref, doc);
        saved.push({ id, ...result, created_at: new Date().toISOString() });
      }

      await batch.commit();
      return saved;
    },

    // ─── Cameras ──────────────────────────────────────────────────────────────

    getCameras: async (userId: string) => {
      const snap = await adminDb
        .collection("cameras")
        .where("user_id", "==", userId)
        .orderBy("created_at", "desc")
        .get();
      return snap.docs.map(toRecord);
    },

    getCameraById: async (id: string, userId: string) => {
      const snap = await adminDb.collection("cameras").doc(id).get();
      if (!snap.exists) throw new Error("Camera not found");
      const data = toRecord(snap);
      if (data.user_id !== userId) throw new Error("Unauthorized");
      return data;
    },

    createCamera: async (camera: Record<string, unknown>) => {
      const id = generateId();
      const doc = { ...camera, created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() };
      await adminDb.collection("cameras").doc(id).set(doc);
      return { id, ...camera, created_at: new Date().toISOString() };
    },

    updateCamera: async (id: string, userId: string, updates: Record<string, unknown>) => {
      const ref = adminDb.collection("cameras").doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("Camera not found");
      if (snap.data()?.user_id !== userId) throw new Error("Unauthorized");

      await ref.update({ ...updates, updated_at: FieldValue.serverTimestamp() });
      const updated = await ref.get();
      return toRecord(updated);
    },

    deleteCamera: async (id: string, userId: string) => {
      const ref = adminDb.collection("cameras").doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("Camera not found");
      if (snap.data()?.user_id !== userId) throw new Error("Unauthorized");
      await ref.delete();
    },

    // ─── Inventory ────────────────────────────────────────────────────────────

    getInventory: async (userId: string, page = 1, limit = 50, filters?: { type?: string; search?: string }) => {
      let query: FirebaseFirestore.Query = adminDb
        .collection("inventory")
        .where("user_id", "==", userId)
        .orderBy("created_at", "desc");

      if (filters?.type && filters.type !== "All") {
        query = query.where("type", "==", filters.type.toLowerCase());
      }

      const snapshot = await query.get();
      let items = snapshot.docs.map(toRecord);

      if (filters?.search) {
        const search = filters.search.toLowerCase();
        items = items.filter(
          (item) =>
            String(item.name ?? "").toLowerCase().includes(search) ||
            String(item.material ?? "").toLowerCase().includes(search) ||
            String(item.batch ?? "").toLowerCase().includes(search)
        );
      }

      const total = items.length;
      const from = (page - 1) * limit;
      const paged = items.slice(from, from + limit);

      return { items: paged, total };
    },

    createInventoryItem: async (item: Record<string, unknown>) => {
      const id = generateId();
      const doc = { ...item, created_at: FieldValue.serverTimestamp() };
      await adminDb.collection("inventory").doc(id).set(doc);
      return { id, ...item, created_at: new Date().toISOString() };
    },

    createInventoryItems: async (items: Record<string, unknown>[]) => {
      if (items.length === 0) return [];
      const batch = adminDb.batch();
      const saved: Record<string, unknown>[] = [];

      for (const item of items) {
        const id = generateId();
        const ref = adminDb.collection("inventory").doc(id);
        batch.set(ref, { ...item, created_at: FieldValue.serverTimestamp() });
        saved.push({ id, ...item, created_at: new Date().toISOString() });
      }

      await batch.commit();
      return saved;
    },

    updateInventoryItem: async (id: string, userId: string, updates: Record<string, unknown>) => {
      const ref = adminDb.collection("inventory").doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("Item not found");
      if (snap.data()?.user_id !== userId) throw new Error("Unauthorized");

      await ref.update(updates);
      const updated = await ref.get();
      return toRecord(updated);
    },

    deleteInventoryItem: async (id: string, userId: string) => {
      const ref = adminDb.collection("inventory").doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("Item not found");
      if (snap.data()?.user_id !== userId) throw new Error("Unauthorized");
      await ref.delete();
    },

    // ─── Alerts ───────────────────────────────────────────────────────────────

    getAlerts: async (userId: string, filters?: { severity?: string }) => {
      let query: FirebaseFirestore.Query = adminDb
        .collection("alerts")
        .where("user_id", "==", userId)
        .where("dismissed", "==", false)
        .orderBy("created_at", "desc");

      if (filters?.severity && filters.severity !== "All") {
        query = query.where("severity", "==", filters.severity.toLowerCase());
      }

      const snapshot = await query.get();
      return snapshot.docs.map(toRecord);
    },

    createAlert: async (alert: Record<string, unknown>) => {
      const id = generateId();
      const doc = { ...alert, created_at: FieldValue.serverTimestamp() };
      await adminDb.collection("alerts").doc(id).set(doc);
      return { id, ...alert, created_at: new Date().toISOString() };
    },

    markAlertRead: async (id: string, userId: string) => {
      const ref = adminDb.collection("alerts").doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("Alert not found");
      if (snap.data()?.user_id !== userId) throw new Error("Unauthorized");

      await ref.update({ is_read: true });
      const updated = await ref.get();
      return toRecord(updated);
    },

    markAllAlertsRead: async (userId: string) => {
      const snapshot = await adminDb
        .collection("alerts")
        .where("user_id", "==", userId)
        .where("is_read", "==", false)
        .get();

      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.update(doc.ref, { is_read: true }));
      await batch.commit();
    },

    dismissAlert: async (id: string, userId: string) => {
      const ref = adminDb.collection("alerts").doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("Alert not found");
      if (snap.data()?.user_id !== userId) throw new Error("Unauthorized");

      await ref.update({ dismissed: true });
      const updated = await ref.get();
      return toRecord(updated);
    },

    // ─── Settings ─────────────────────────────────────────────────────────────

    getSettings: async (userId: string) => {
      const snapshot = await adminDb
        .collection("settings")
        .where("user_id", "==", userId)
        .get();
      return snapshot.docs.map(toRecord);
    },

    upsertSetting: async (userId: string, key: string, value: unknown) => {
      // Use a composite ID for upsert behavior
      const compositeId = `${userId}_${key}`;
      const ref = adminDb.collection("settings").doc(compositeId);
      const data = {
        user_id: userId,
        key,
        value,
        updated_at: FieldValue.serverTimestamp(),
      };
      await ref.set(data, { merge: true });
      const updated = await ref.get();
      return toRecord(updated);
    },

    // ─── Analytics / Stats ────────────────────────────────────────────────────

    getDashboardStats: async (userId: string) => {
      const [inspSnap, alertSnap, camSnap, invSnap] = await Promise.all([
        adminDb.collection("inspections").where("user_id", "==", userId).get(),
        adminDb.collection("alerts").where("user_id", "==", userId).where("is_read", "==", false).where("dismissed", "==", false).get(),
        adminDb.collection("cameras").where("user_id", "==", userId).where("status", "==", "online").get(),
        adminDb.collection("inventory").where("user_id", "==", userId).get(),
      ]);

      const allInspections = inspSnap.docs.map((d) => d.data());
      const totalInspections = inspSnap.size;
      const totalPass = allInspections.reduce((s, i) => s + (Number(i.pass_count) || 0), 0);
      const totalObjects = allInspections.reduce((s, i) => s + (Number(i.total_objects) || 0), 0);
      const passRate = totalObjects > 0 ? ((totalPass / totalObjects) * 100).toFixed(1) : "0.0";

      return {
        totalInspections,
        activeCameras: camSnap.size,
        openAlerts: alertSnap.size,
        passRate: `${passRate}%`,
        totalInventory: invSnap.size,
      };
    },

    getRecentInspections: async (userId: string, days = 7) => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const snapshot = await adminDb
        .collection("inspections")
        .where("user_id", "==", userId)
        .where("created_at", ">=", Timestamp.fromDate(since))
        .orderBy("created_at", "asc")
        .get();
      return snapshot.docs.map(toRecord);
    },

    // ─── Profiles ─────────────────────────────────────────────────────────────

    getProfileCount: async () => {
      const snapshot = await adminDb.collection("profiles").get();
      return snapshot.size;
    },
  };
}

export type StorageService = ReturnType<typeof createStorage>;
