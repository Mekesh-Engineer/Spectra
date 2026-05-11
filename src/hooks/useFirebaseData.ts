import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, limit, doc, startAfter, QueryConstraint, DocumentData } from 'firebase/firestore';
import { useUserStore } from '@/store/userStore';

const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED !== 'false';
const GUEST_USER_ID = import.meta.env.VITE_GUEST_USER_ID || 'anonymous';

function resolveUserId(userId?: string) {
  if (userId) return userId;
  return AUTH_REQUIRED ? null : GUEST_USER_ID;
}

export function useAlerts(severityFilter: string) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useUserStore((s) => s.user);

  const effectiveUserId = resolveUserId(user?.id);

  useEffect(() => {
    if (!effectiveUserId) return;
    let filters: QueryConstraint[] = [
      where("user_id", "==", effectiveUserId),
      orderBy("created_at", "desc")
    ];
    if (severityFilter !== "All") {
      filters.push(where("severity", "==", severityFilter));
    }
    const q = query(collection(db, "alerts"), ...filters);

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
      setAlerts(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return unsub;
  }, [severityFilter, effectiveUserId]);

  return { alerts, loading };
}

export function useDashboardStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = useUserStore((s) => s.user);

  const effectiveUserId = resolveUserId(user?.id);

  useEffect(() => {
    if (!effectiveUserId) return;
    const unsub = onSnapshot(doc(db, "dashboard_stats", effectiveUserId || "global_stats"), (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data());
      } else {
        setStats({ totalInspections: 0, activeCameras: 0, openAlerts: 0, passRate: "0.0%", totalInventory: 0 });
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return unsub;
  }, [effectiveUserId]);

  return { stats, loading };
}

export async function fetchRecentInspections(userId: string, days: number) {
  const effectiveUserId = resolveUserId(userId);
  if (!effectiveUserId) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, "inspections"),
    where("user_id", "==", effectiveUserId),
    where("created_at", ">=", since),
    orderBy("created_at", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
  }));
}

export async function fetchHistory(userId: string, page: number, perPage: number, statusFilter?: string, lastDoc?: DocumentData) {
  const effectiveUserId = resolveUserId(userId);
  if (!effectiveUserId) return [];

  let filters: QueryConstraint[] = [
    where("user_id", "==", effectiveUserId)
  ];
  if (statusFilter && statusFilter !== "All") filters.push(where("status", "==", statusFilter));
  filters.push(orderBy("created_at", "desc"));
  if (lastDoc) filters.push(startAfter(lastDoc));
  filters.push(limit(perPage));

  const q = query(collection(db, "inspections"), ...filters);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
  }));
}
