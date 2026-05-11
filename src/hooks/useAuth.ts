import { useEffect, useCallback } from "react";
import { useUserStore } from "../store/userStore";
import { authService } from "../services/auth";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import type { UserRole, UserStatus } from "@shared/types";

async function loadProfile(
  userId: string,
  fallbackEmail: string,
  setUser: (u: { id: string; email: string; name?: string; role: UserRole; status: UserStatus }) => void,
  clearUser: () => void
) {
  try {
    const profile = await authService.fetchProfile(userId) as any;
    if (profile) {
      setUser({
        id: profile.id,
        email: profile.email ?? fallbackEmail,
        name: profile.full_name ?? undefined,
        role: (profile.role ?? "operator") as UserRole,
        status: (profile.status ?? "active") as UserStatus,
      });
      return;
    }
    clearUser();
    throw new Error("Unprovisioned account: User profile not found");
  } catch (err) {
    clearUser();
    throw err;
  }
}

let hasInitializedAuth = false;

function initAuth() {
  if (hasInitializedAuth) return;
  hasInitializedAuth = true;

  const { setUser, clearUser, setAuthLoading } = useUserStore.getState();

  // Listen to Firebase auth state changes
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        await loadProfile(firebaseUser.uid, firebaseUser.email ?? "", setUser, clearUser);
      } catch {
        clearUser();
      }
    } else {
      clearUser();
    }
    setAuthLoading(false);
  });
}

export function useAuth() {
  const { user, isAuthenticated, isProfileLoaded, isAuthLoading, setUser, clearUser, hasRole } = useUserStore();

  useEffect(() => {
    initAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authService.login({ email, password });
      if (data.user) {
        await loadProfile(data.user.id, data.user.email ?? "", setUser, clearUser);
      }
    },
    [setUser, clearUser]
  );

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const data = await authService.register({ email, password, fullName });
    if (data.user) {
      await loadProfile(data.user.id, data.user.email ?? "", setUser, clearUser);
    }
  }, [setUser, clearUser]);

  const logout = useCallback(async () => {
    await authService.logout();
    clearUser();
  }, [clearUser]);

  const resetPassword = useCallback(async (email: string) => {
    await authService.resetPassword(email);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const data = await authService.loginWithGoogle();
    if (data.user) {
      await loadProfile(data.user.id, data.user.email ?? "", setUser, clearUser);
    }
  }, [setUser, clearUser]);

  return {
    user,
    isAuthenticated,
    isProfileLoaded,
    loading: isAuthLoading,
    login,
    register,
    logout,
    resetPassword,
    loginWithGoogle,
    hasRole,
  };
}
