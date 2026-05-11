import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@shared/types";

interface RoleGuardProps {
    roles: UserRole[];
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * A wrapper component that conditionally renders its children
 * if the current authenticated user has one of the allowed roles.
 */
export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
    const { user, isProfileLoaded } = useAuth();

    if (!isProfileLoaded || !user) {
        return <>{fallback}</>;
    }

    if (!roles.includes(user.role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}