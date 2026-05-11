import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole, UserStatus } from "@shared/types";

interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  status: UserStatus;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isProfileLoaded: boolean;
  isAuthLoading: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
  setAuthLoading: (loading: boolean) => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isProfileLoaded: false,
      isAuthLoading: false, // Init sequence handles this locally now without network wait
      setUser: (user) => set({ user, isAuthenticated: true, isProfileLoaded: true }),
      clearUser: () => set({ user: null, isAuthenticated: false, isProfileLoaded: false }),
      setAuthLoading: (loading) => set({ isAuthLoading: loading }),
      hasRole: (...roles) => {
        const { user } = get();
        return !!user && roles.includes(user.role);
      },
    }),
    {
      name: "spectra-user-storage",
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated, 
        isProfileLoaded: state.isProfileLoaded 
      }),
    }
  )
);
