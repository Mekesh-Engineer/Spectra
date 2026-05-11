import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, deleteDoc, limit, serverTimestamp } from 'firebase/firestore';
import type { InventoryRow } from '@shared/types';
import { useUserStore } from '@/store/userStore';

function getUserId() {
  return useUserStore.getState().user?.id || 'anonymous';
}

export const inventoryService = {
  list: async (page = 1, pageSize = 50, filters?: { type?: string; search?: string }) => {
    const userId = getUserId();
    const constraints: any[] = [where("user_id", "==", userId)];
    
    if (filters?.type && filters.type !== "All") constraints.push(where("type", "==", filters.type));
    constraints.push(orderBy("created_at", "desc"));
    constraints.push(limit(pageSize));

    const q = query(collection(db, "inventory"), ...constraints);
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
    })) as InventoryRow[];

    return { items, total: items.length };
  },

  create: async (data: Partial<InventoryRow>) => {
    const ref = await addDoc(collection(db, "inventory"), {
      ...data,
      user_id: getUserId(),
      created_at: serverTimestamp()
    });
    return { id: ref.id, ...data } as InventoryRow;
  },

  update: async (id: string, data: Partial<InventoryRow>) => {
    const ref = doc(db, "inventory", id);
    await updateDoc(ref, data);
    return { id, ...data } as InventoryRow;
  },

  delete: async (id: string) => {
    const ref = doc(db, "inventory", id);
    await deleteDoc(ref);
    return { success: true };
  }
};
