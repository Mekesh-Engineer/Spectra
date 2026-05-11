import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@shared/types";

/**
 * Blocks unauthenticated users — redirects to /login.
 * Also blocks users whose account status is "disabled".
 */
export function RequireAuth() {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div
                    className="h-10 w-10 rounded-full border-[3px] border-sys-border animate-spin"
                    style={{ borderTopColor: "var(--sys-accent)" }}
                />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.status === "disabled") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 text-center">
                <span className="material-icons-round text-[48px] text-sys-error">block</span>
                <h2 className="text-xl font-bold text-sys-text-primary">Account Disabled</h2>
                <p className="text-sm text-sys-text-secondary max-w-md">
                    Your account has been disabled by an administrator. Please contact your system administrator for assistance.
                </p>
            </div>
        );
    }

    return <Outlet />;
}

/**
 * Requires the authenticated user to have one of the specified roles.
 * Must be nested inside a RequireAuth route.
 */
export function RequireRole({ roles }: { roles: UserRole[] }) {
    const { user, isProfileLoaded } = useAuth();

    if (!isProfileLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div
                    className="h-10 w-10 rounded-full border-[3px] border-sys-border animate-spin"
                    style={{ borderTopColor: "var(--sys-accent)" }}
                />
            </div>
        );
    }

    if (!user || !roles.includes(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 text-center">
                <span className="material-icons-round text-[48px] text-sys-warning">gpp_bad</span>
                <h2 className="text-xl font-bold text-sys-text-primary">Access Denied</h2>
                <p className="text-sm text-sys-text-secondary max-w-md">
                    You do not have permission to access this page. Required role: {roles.join(" or ")}.
                </p>
            </div>
        );
    }

    return <Outlet />;
}
