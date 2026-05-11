import { Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import { RequireAuth, RequireRole } from "@/routes/guards";

// Public pages
import HomePage from "@/pages/public/HomePage";
import DemoPage from "@/pages/public/DemoPage";
import DocsPage from "@/pages/public/DocsPage";
import PricingPage from "@/pages/public/PricingPage";

// Auth pages
import { AuthModalRoute } from "@/pages/auth/AuthModal";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import AuthCallbackPage from "@/pages/auth/AuthCallbackPage";

// Dashboard pages
import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import InspectionPage from "@/pages/dashboard/InspectionPage";
import AnalyticsPage from "@/pages/dashboard/AnalyticsPage";
import HistoryPage from "@/pages/dashboard/HistoryPage";
import InventoryPage from "@/pages/dashboard/InventoryPage";
import AlertsPage from "@/pages/dashboard/AlertsPage";

// Admin pages
import AdminPanel from "@/pages/admin/AdminPanel";
import SettingsPage from "@/pages/admin/SettingsPage";
import HealthPage from "@/pages/admin/HealthPage";
import NotFoundPage from "@/pages/public/NotFoundPage";

export default function AppRouter() {
    return (
        <Routes>
            <Route element={<Layout />}>
                {/* Public */}
                <Route path="/" element={<HomePage />} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/pricing" element={<PricingPage />} />

                {/* Auth */}
                <Route path="/login" element={<AuthModalRoute initialView="login" />} />
                <Route path="/register" element={<AuthModalRoute initialView="register" />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />

            </Route>

            {/* Protected: any authenticated user (operator, supervisor, administrator) */}
            <Route element={<RequireAuth />}>
                <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/dashboard/inspect" element={<InspectionPage />} />
                    <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
                    <Route path="/dashboard/history" element={<HistoryPage />} />
                    <Route path="/dashboard/inventory" element={<InventoryPage />} />
                    <Route path="/dashboard/alerts" element={<AlertsPage />} />

                    {/* Admin: administrator only */}
                    <Route element={<RequireRole roles={["administrator"]} />}>
                        <Route path="/admin" element={<AdminPanel />} />
                        <Route path="/admin/settings" element={<SettingsPage />} />
                        <Route path="/admin/health" element={<HealthPage />} />
                    </Route>
                </Route>
            </Route>

            {/* 404 Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
