import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, deleteDoc, writeBatch, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { AlertRow } from '@shared/types';
import { useUserStore } from '@/store/userStore';

function getUserId() {
  return useUserStore.getState().user?.id || 'anonymous';
}

export const alertService = {
  subscribe: (filters: { severity?: string }, callback: (alerts: AlertRow[]) => void) => {
    const userId = getUserId();
    const constraints: any[] = [where("user_id", "==", userId)];
    
    if (filters?.severity && filters.severity !== "All") {
      constraints.push(where("severity", "==", filters.severity));
    }
    
    constraints.push(orderBy("created_at", "desc"));
    
    const q = query(collection(db, "alerts"), ...constraints);
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as AlertRow[];
      callback(data);
    });
  },

  list: async (filters?: { severity?: string }) => {
    const userId = getUserId();
    const constraints: any[] = [where("user_id", "==", userId)];
    if (filters?.severity && filters.severity !== "All") {
      constraints.push(where("severity", "==", filters.severity));
    }
    constraints.push(orderBy("created_at", "desc"));
    
    const q = query(collection(db, "alerts"), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
    })) as AlertRow[];
  },

  create: async (data: Partial<AlertRow>) => {
    const ref = await addDoc(collection(db, "alerts"), {
      ...data,
      user_id: getUserId(),
      created_at: serverTimestamp()
    });
    return { id: ref.id, ...data } as AlertRow;
  },

  markRead: async (id: string) => {
    const ref = doc(db, "alerts", id);
    await updateDoc(ref, { is_read: true });
    return { id, is_read: true } as unknown as AlertRow;
  },

  markAllRead: async () => {
    const userId = getUserId();
    const q = query(collection(db, "alerts"), where("user_id", "==", userId), where("is_read", "==", false));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { is_read: true }));
    await batch.commit();
    return { success: true };
  },

  dismiss: async (id: string) => {
    const ref = doc(db, "alerts", id);
    await deleteDoc(ref); // Or mark as dismissed
    return { success: true };
  },
};
