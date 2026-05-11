import Dashboard from '@/components/Dashboard';

/**
 * DashboardLayout wraps all dashboard child routes.
 * Uses <Dashboard /> so nested routes (/dashboard, /dashboard/inspect, etc.) render within the shell.
 */
export default function DashboardLayout() {
    return <Dashboard />;
}
