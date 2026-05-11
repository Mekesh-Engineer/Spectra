// src/layouts/Dashboard.tsx
// ─── Spectra AI · Enhanced Dashboard Shell ────────────────────────────────────
// Preserves original structure with added: collapsible sidebar, command palette,
// notification panel, live header stats, staggered animations, micro-UI details.

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAlerts } from "@/hooks/useFirebaseData";
import { alertService } from "@/services/alertService";
import { applyThemeMode, getThemeMode, type ThemeMode } from "@/lib/themeMode";

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarItem {
    label: string;
    icon: string;
    path: string;
    badge?: number;
    shortcut?: string;
    description?: string;
}

interface SidebarSection {
    title: string;
    items: SidebarItem[];
}

interface Notification {
    id: string;
    type: "error" | "warning" | "success" | "info";
    title: string;
    message: string;
    time: string;
    read: boolean;
}

// ─── Navigation Data ──────────────────────────────────────────────────────────

const SIDEBAR_SECTIONS: SidebarSection[] = [
    {
        title: "Overview",
        items: [
            {
                label: "Dashboard",
                icon: "dashboard",
                path: "/dashboard",
                shortcut: "G D",
                description: "Main overview & KPIs",
            },
            {
                label: "Live Inspection",
                icon: "videocam",
                path: "/dashboard/inspect",
                shortcut: "G L",
                description: "Real-time camera feed",
            },
        ],
    },
    {
        title: "Data",
        items: [
            {
                label: "Analytics",
                icon: "analytics",
                path: "/dashboard/analytics",
                shortcut: "G A",
                description: "Trends & defect charts",
            },
            {
                label: "History",
                icon: "history",
                path: "/dashboard/history",
                shortcut: "G H",
                description: "Past inspection runs",
            },
            {
                label: "Inventory",
                icon: "inventory_2",
                path: "/dashboard/inventory",
                shortcut: "G I",
                description: "Parts & batch tracking",
            },
            {
                label: "Alerts",
                icon: "notifications_active",
                path: "/dashboard/alerts",
                badge: 3,
                shortcut: "G N",
                description: "Active defect alerts",
            },
        ],
    },
];

const BOTTOM_ITEMS: SidebarItem[] = [
    { label: "Settings", icon: "settings", path: "/admin/settings", description: "System configuration" },
    { label: "System Health", icon: "monitor_heart", path: "/admin/health", description: "Hardware diagnostics" },
];

const MOCK_NOTIFICATIONS: Notification[] = [
    { id: "1", type: "error", title: "Defect Spike Detected", message: "Line 3 · FAIL rate crossed 2% threshold — 14 rejects in last 5 min", time: "2m ago", read: false },
    { id: "2", type: "warning", title: "Camera 02 Drift", message: "Confidence dropping below 90% on Cam-02. Recalibration recommended.", time: "8m ago", read: false },
    { id: "3", type: "warning", title: "Tolerance Boundary", message: "Batch CP-992-X: 3 parts near ±0.08mm limit on copper pipe run.", time: "15m ago", read: false },
    { id: "4", type: "success", title: "Batch SR-724-A Complete", message: "Steel rods: 247/247 inspected · Yield 99.6% · No critical failures.", time: "22m ago", read: true },
    { id: "5", type: "info", title: "Model Updated", message: "YOLOv9-S retrained on 340 new samples. Accuracy improved to 99.8%.", time: "1h ago", read: true },
];

const NOTIF_ICON: Record<Notification["type"], string> = {
    error: "error", warning: "warning", success: "check_circle", info: "info",
};
const NOTIF_COLOR: Record<Notification["type"], string> = {
    error: "var(--sys-error)", warning: "var(--sys-warning)",
    success: "var(--sys-success)", info: "var(--sys-info)",
};

// Page labels map
const PAGE_LABEL: Record<string, { label: string; icon: string; context: string }> = {
    "/dashboard": { label: "Dashboard", icon: "dashboard", context: "Overview" },
    "/dashboard/inspect": { label: "Live Inspection", icon: "videocam", context: "Camera Feed" },
    "/dashboard/analytics": { label: "Analytics", icon: "analytics", context: "Production Trends" },
    "/dashboard/history": { label: "History", icon: "history", context: "Past Runs" },
    "/dashboard/inventory": { label: "Inventory", icon: "inventory_2", context: "Parts Tracking" },
    "/dashboard/alerts": { label: "Alerts", icon: "notifications_active", context: "Issue Center" },
    "/admin/settings": { label: "Settings", icon: "settings", context: "System Controls" },
    "/admin/health": { label: "System Health", icon: "monitor_heart", context: "Diagnostics" },
};

// ─── Micro-components ─────────────────────────────────────────────────────────

/** Animated pulsing live dot */
function LiveDot({ color = "var(--sys-success)", size = 7 }: { color?: string; size?: number }) {
    return (
        <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
            <motion.span
                animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color }}
            />
            <span style={{ position: "relative", display: "block", width: "100%", height: "100%", borderRadius: "50%", background: color }} />
        </span>
    );
}

/** Keyboard shortcut pill */
function KbdPill({ keys }: { keys: string }) {
    return (
        <span className="hidden group-hover:flex items-center gap-0.5">
            {keys.split(" ").map((k, i) => (
                <kbd
                    key={i}
                    className="inline-flex items-center justify-center px-1 py-0 rounded text-[8px] font-mono font-bold leading-tight"
                    style={{
                        background: "color-mix(in srgb, var(--sys-text-primary) 7%, transparent)",
                        border: "1px solid var(--sys-border)",
                        color: "var(--sys-text-secondary)",
                        minWidth: 16,
                    }}
                >
                    {k}
                </kbd>
            ))}
        </span>
    );
}

/** Tooltip wrapper */
function Tooltip({ children, label }: { children: ReactNode; label: string }) {
    return (
        <div className="relative group/tip flex items-center">
            {children}
            <div
                className="absolute left-full ml-2.5 z-50 pointer-events-none"
                style={{
                    opacity: 0,
                    transform: "translateX(-4px)",
                    transition: "all 0.15s ease",
                }}
            >
                <div
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-lg"
                    style={{
                        background: "var(--sys-bg-tertiary)",
                        border: "1px solid var(--sys-border)",
                        color: "var(--sys-text-primary)",
                    }}
                >
                    {label}
                </div>
            </div>
            <style>{`.group\\/tip:hover > div:last-child { opacity: 1 !important; transform: translateX(0) !important; }`}</style>
        </div>
    );
}

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({
    open,
    onClose,
    notifications,
    onMarkRead,
}: {
    open: boolean;
    onClose: () => void;
    notifications: Notification[];
    onMarkRead: (id: string) => void;
}) {
    const unread = notifications.filter((n) => !n.read).length;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-70"
                        onClick={onClose}
                    />
                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed z-71 right-4 top-[58px] w-[360px] rounded-2xl shadow-2xl overflow-hidden"
                        style={{
                            background: "var(--sys-bg-secondary)",
                            border: "1px solid var(--sys-border)",
                            boxShadow: "0 24px 60px rgba(0,0,0,0.25), 0 0 0 1px color-mix(in srgb, var(--sys-accent) 8%, transparent)",
                        }}
                    >
                        {/* Panel header */}
                        <div
                            className="flex items-center justify-between px-4 py-3"
                            style={{ borderBottom: "1px solid var(--sys-border)" }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-icons-round text-[16px]" style={{ color: "var(--sys-accent)" }}>
                                    notifications
                                </span>
                                <span className="text-[13px] font-bold" style={{ color: "var(--sys-text-primary)" }}>
                                    Notifications
                                </span>
                                {unread > 0 && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                                        style={{ background: "var(--sys-error)" }}
                                    >
                                        {unread}
                                    </motion.span>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-lg transition-colors hover:bg-sys-bg-tertiary"
                                style={{ color: "var(--sys-text-secondary)" }}
                            >
                                <span className="material-icons-round text-[16px]">close</span>
                            </button>
                        </div>

                        {/* Notifications list */}
                        <div className="overflow-y-auto max-h-[420px]">
                            {notifications.map((n, i) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05, duration: 0.25 }}
                                    onClick={() => onMarkRead(n.id)}
                                    className="flex gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-sys-bg-tertiary/50"
                                    style={{
                                        borderBottom: "1px solid var(--sys-border)",
                                        opacity: n.read ? 0.55 : 1,
                                        background: n.read ? "transparent" : "color-mix(in srgb, var(--sys-accent) 2%, transparent)",
                                    }}
                                >
                                    {/* Icon */}
                                    <div
                                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                                        style={{
                                            background: `color-mix(in srgb, ${NOTIF_COLOR[n.type]} 12%, transparent)`,
                                            border: `1px solid color-mix(in srgb, ${NOTIF_COLOR[n.type]} 25%, transparent)`,
                                        }}
                                    >
                                        <span
                                            className="material-icons-round text-[14px]"
                                            style={{ color: NOTIF_COLOR[n.type] }}
                                        >
                                            {NOTIF_ICON[n.type]}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: "var(--sys-text-primary)" }}>
                                                {n.title}
                                            </p>
                                            <span className="shrink-0 text-[10px] font-mono" style={{ color: "var(--sys-text-secondary)" }}>
                                                {n.time}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-[11px] leading-relaxed line-clamp-2" style={{ color: "var(--sys-text-secondary)" }}>
                                            {n.message}
                                        </p>
                                    </div>
                                    {!n.read && (
                                        <div className="mt-1.5 shrink-0">
                                            <LiveDot color="var(--sys-accent)" size={5} />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {/* Panel footer */}
                        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: "1px solid var(--sys-border)" }}>
                            <span className="text-[10px]" style={{ color: "var(--sys-text-secondary)" }}>
                                {unread} unread · {notifications.length} total
                            </span>
                            <button
                                className="text-[10px] font-semibold transition-colors hover:underline"
                                style={{ color: "var(--sys-accent)" }}
                                onClick={() => notifications.forEach((n) => onMarkRead(n.id))}
                            >
                                Mark all read
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ─── Command Palette ──────────────────────────────────────────────────────────

const ALL_COMMANDS = [
    ...SIDEBAR_SECTIONS.flatMap((s) => s.items),
    ...BOTTOM_ITEMS,
    { label: "Go to Home", icon: "home", path: "/", description: "Landing page", shortcut: "G /" },
    { label: "Demo Page", icon: "play_circle", path: "/demo", description: "Interactive demo", shortcut: "" },
];

function CommandPalette({
    open,
    onClose,
    onNav,
}: {
    open: boolean;
    onClose: () => void;
    onNav: (path: string) => void;
}) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const results = query
        ? ALL_COMMANDS.filter(
            (c) =>
                c.label.toLowerCase().includes(query.toLowerCase()) ||
                c.description?.toLowerCase().includes(query.toLowerCase())
        )
        : ALL_COMMANDS;

    useEffect(() => {
        if (open) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 80); }
    }, [open]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); onClose(); }
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -16 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed z-[81] left-1/2 -translate-x-1/2 top-[18vh] w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden"
                        style={{
                            background: "var(--sys-bg-secondary)",
                            border: "1px solid var(--sys-border)",
                            boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px color-mix(in srgb, var(--sys-accent) 15%, transparent)",
                        }}
                    >
                        {/* Search input */}
                        <div
                            className="flex items-center gap-3 px-4 py-3.5"
                            style={{ borderBottom: "1px solid var(--sys-border)" }}
                        >
                            <span className="material-icons-round text-[18px] shrink-0" style={{ color: "var(--sys-text-secondary)" }}>
                                search
                            </span>
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search pages, actions…"
                                className="flex-1 bg-transparent text-sm outline-none placeholder-sys-text-secondary"
                                style={{ color: "var(--sys-text-primary)", fontSize: 14 }}
                            />
                            <kbd
                                className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded"
                                style={{
                                    background: "color-mix(in srgb, var(--sys-text-primary) 7%, transparent)",
                                    border: "1px solid var(--sys-border)",
                                    color: "var(--sys-text-secondary)",
                                }}
                            >
                                ESC
                            </kbd>
                        </div>

                        {/* Results */}
                        <div className="max-h-[360px] overflow-y-auto py-1.5">
                            {results.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--sys-text-secondary)" }}>
                                    No results for "{query}"
                                </div>
                            ) : (
                                results.map((cmd, i) => (
                                    <motion.button
                                        key={cmd.path}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        onClick={() => { onNav(cmd.path); onClose(); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sys-bg-tertiary focus:outline-none group"
                                    >
                                        <div
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                                            style={{
                                                background: "color-mix(in srgb, var(--sys-accent) 10%, transparent)",
                                                border: "1px solid color-mix(in srgb, var(--sys-accent) 20%, transparent)",
                                            }}
                                        >
                                            <span className="material-icons-round text-[14px]" style={{ color: "var(--sys-accent)" }}>
                                                {cmd.icon}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--sys-text-primary)" }}>
                                                {cmd.label}
                                            </p>
                                            {cmd.description && (
                                                <p className="text-[11px] truncate" style={{ color: "var(--sys-text-secondary)" }}>
                                                    {cmd.description}
                                                </p>
                                            )}
                                        </div>
                                        {cmd.shortcut && (
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {cmd.shortcut.split(" ").map((k, j) => (
                                                    <kbd
                                                        key={j}
                                                        className="px-1 py-0 rounded text-[9px] font-mono"
                                                        style={{
                                                            background: "color-mix(in srgb, var(--sys-text-primary) 7%, transparent)",
                                                            border: "1px solid var(--sys-border)",
                                                            color: "var(--sys-text-secondary)",
                                                        }}
                                                    >
                                                        {k}
                                                    </kbd>
                                                ))}
                                            </div>
                                        )}
                                        <span className="material-icons-round text-[14px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--sys-text-secondary)" }}>
                                            arrow_forward
                                        </span>
                                    </motion.button>
                                ))
                            )}
                        </div>

                        {/* Footer hint */}
                        <div
                            className="px-4 py-2 flex items-center gap-4"
                            style={{ borderTop: "1px solid var(--sys-border)" }}
                        >
                            {[
                                { k: "↑↓", label: "navigate" },
                                { k: "↵", label: "select" },
                                { k: "ESC", label: "close" },
                            ].map((h) => (
                                <div key={h.k} className="flex items-center gap-1">
                                    <kbd
                                        className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                                        style={{
                                            background: "color-mix(in srgb, var(--sys-text-primary) 7%, transparent)",
                                            border: "1px solid var(--sys-border)",
                                            color: "var(--sys-text-secondary)",
                                        }}
                                    >
                                        {h.k}
                                    </kbd>
                                    <span className="text-[10px]" style={{ color: "var(--sys-text-secondary)" }}>{h.label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────

function SidebarNavItem({
    item,
    active,
    collapsed,
    onClick,
    index,
}: {
    item: SidebarItem;
    active: boolean;
    collapsed: boolean;
    onClick: () => void;
    index: number;
}) {
    const content = (
        <motion.button
            onClick={onClick}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`group relative w-full flex items-center gap-x-2.5 py-2 rounded-lg transition-all duration-200 focus:outline-none ${collapsed ? "px-2 justify-center" : "px-2.5"
                } ${active
                    ? "text-white font-semibold"
                    : "text-sys-text-secondary font-medium hover:bg-sys-bg-tertiary hover:text-sys-text-primary focus:bg-sys-bg-tertiary focus:text-sys-text-primary"
                }`}
            style={
                active
                    ? {
                        background: "linear-gradient(135deg, var(--sys-accent) 0%, var(--sys-accent-dark) 100%)",
                        boxShadow: "0 2px 12px color-mix(in srgb, var(--sys-accent) 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.12)",
                    }
                    : undefined
            }
        >
            {/* Active glow track */}
            {active && (
                <motion.div
                    layoutId="sidebar-active-glow"
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    style={{
                        background: "linear-gradient(135deg, var(--sys-accent) 0%, var(--sys-accent-dark) 100%)",
                        opacity: 0,
                        filter: "blur(8px)",
                    }}
                />
            )}

            {/* Icon */}
            <span
                className={`material-icons-round shrink-0 transition-all duration-200 ${active ? "text-white" : "text-sys-text-secondary group-hover:text-sys-text-primary"
                    }`}
                style={{ fontSize: 18 }}
            >
                {item.icon}
            </span>

            {/* Label + badge */}
            {!collapsed && (
                <>
                    <span className="flex-1 text-left text-[13px]">{item.label}</span>

                    {/* Keyboard hint (desktop hover) */}
                    {item.shortcut && <KbdPill keys={item.shortcut} />}

                    {/* Badge */}
                    {item.badge != null && item.badge > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                            style={{
                                background: active ? "rgba(255,255,255,0.28)" : "var(--sys-error)",
                                boxShadow: active ? "none" : "0 1px 6px color-mix(in srgb, var(--sys-error) 40%, transparent)",
                            }}
                        >
                            {item.badge}
                        </motion.span>
                    )}

                    {/* Active dot */}
                    {active && (
                        <motion.span
                            layoutId="sidebar-active"
                            className="h-1.5 w-1.5 rounded-full bg-white"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    )}
                </>
            )}

            {/* Collapsed badge */}
            {collapsed && item.badge != null && item.badge > 0 && (
                <span
                    className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white px-0.5"
                    style={{ background: "var(--sys-error)" }}
                >
                    {item.badge}
                </span>
            )}
        </motion.button>
    );

    if (collapsed && item.description) {
        return <Tooltip label={`${item.label} — ${item.description}`}>{content}</Tooltip>;
    }
    return content;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [notifOpen, setNotifOpen] = useState(false);
    const [cmdOpen, setCmdOpen] = useState(false);
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => getThemeMode());

    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const { alerts } = useAlerts("All");

    const notifications: Notification[] = alerts.map(a => ({
        id: a.id,
        type: a.severity === 'critical' ? 'error' : a.severity === 'info' ? 'info' : (a.severity === 'success' ? 'success' : 'warning'),
        title: a.title || 'System Alert',
        message: a.message,
        time: timeAgo(a.created_at),
        read: a.is_read
    }));

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Derive current page info
    const currentPage = Object.entries(PAGE_LABEL).find(
        ([key]) => key === location.pathname || (key !== "/dashboard" && location.pathname.startsWith(key))
    );
    const pageLabel = currentPage?.[1] ?? { label: "Dashboard", icon: "dashboard", context: "Overview" };

    // ── Helpers ────────────────────────────────────────────────────────────────

    const isActive = (path: string) => {
        if (path === "/dashboard") return location.pathname === "/dashboard";
        return location.pathname.startsWith(path);
    };

    const handleNav = useCallback(
        (path: string) => {
            navigate(path);
            setSidebarOpen(false);
        },
        [navigate]
    );

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    const handleMarkRead = async (id: string) => {
        try {
            await alertService.markRead(id);
        } catch (error) {
            console.error("Failed to mark alert as read", error);
        }
    };

    // ── Keyboard shortcuts ─────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setCmdOpen((o) => !o);
            }
            if (e.key === "Escape") {
                setCmdOpen(false);
                setNotifOpen(false);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    useEffect(() => {
        applyThemeMode(themeMode);
    }, [themeMode]);

    const handleThemeToggle = () => {
        setThemeMode((previousTheme) => {
            const nextTheme = previousTheme === "dark" ? "light" : "dark";
            return nextTheme;
        });
    };

    const sidebarWidth = sidebarCollapsed ? 60 : 240;

    return (
        <>
            {/* ══════════ COMMAND PALETTE ══════════ */}
            <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNav={handleNav} />

            {/* ══════════ NOTIFICATION PANEL ══════════ */}
            <NotificationPanel
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                notifications={notifications}
                onMarkRead={handleMarkRead}
            />

            {/* ══════════ HEADER ══════════ */}
            <motion.header
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="fixed top-0 inset-x-0 z-[48] lg:z-[61] flex items-center w-full h-[52px] text-sm"
                style={{
                    background: "color-mix(in srgb, var(--sys-bg-secondary) 92%, transparent)",
                    backdropFilter: "blur(12px)",
                    borderBottom: "1px solid var(--sys-border)",
                    boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
                }}
            >
                <nav className="px-4 sm:px-5 flex items-center w-full mx-auto">
                    <div className="w-full flex items-center gap-x-1.5">
                        {/* ── Left group ── */}
                        <ul className="flex items-center gap-2">
                            {/* Brand pill */}
                            <li className="inline-flex items-center gap-1 relative pe-1.5 after:absolute after:top-1/2 after:end-0 after:inline-block after:w-px after:h-3.5 after:bg-sys-border after:rounded-full after:-translate-y-1/2 after:rotate-12">
                                <motion.button
                                    whileHover={{ scale: 1.06 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleNav("/dashboard")}
                                    className="shrink-0 inline-flex justify-center items-center size-8 rounded-lg text-xl font-semibold focus:outline-none"
                                    style={{
                                        background: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))",
                                        boxShadow: "0 2px 10px color-mix(in srgb, var(--sys-accent) 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)",
                                    }}
                                    aria-label="Spectra Home"
                                >
                                    <span className="material-icons-round text-white text-[16px]">precision_manufacturing</span>
                                </motion.button>

                                <div className="hidden sm:flex flex-col leading-none ms-1">
                                    <span className="text-[13px] font-bold tracking-tight" style={{ color: "var(--sys-text-primary)" }}>
                                        Spectra
                                    </span>
                                    <span
                                        className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                                        style={{ color: "var(--sys-accent)" }}
                                    >
                                        Dashboard
                                    </span>
                                </div>

                                {/* Sidebar toggle */}
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        if (window.innerWidth >= 1024) {
                                            setSidebarCollapsed((c) => !c);
                                        } else {
                                            setSidebarOpen((o) => !o);
                                        }
                                    }}
                                    className="p-1.5 size-[30px] inline-flex items-center justify-center rounded-md border border-transparent transition-colors hover:bg-sys-bg-tertiary focus:outline-none ms-1"
                                    style={{ color: "var(--sys-text-secondary)" }}
                                    aria-label="Toggle sidebar"
                                >
                                    <svg className="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="18" height="18" x="3" y="3" rx="2" />
                                        <path d="M15 3v18" />
                                        <path d="m10 15-3-3 3-3" />
                                    </svg>
                                </motion.button>
                            </li>

                            {/* Breadcrumb with animated page icon */}
                            <li className="inline-flex items-center relative">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={location.pathname}
                                        initial={{ opacity: 0, x: -6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 6 }}
                                        transition={{ duration: 0.2 }}
                                        className="hidden md:flex items-center gap-2 rounded-xl px-3 py-1.5"
                                        style={{
                                            color: "var(--sys-text-primary)",
                                            background: "color-mix(in srgb, var(--sys-text-primary) 4%, transparent)",
                                            border: "1px solid var(--sys-border)",
                                        }}
                                    >
                                        <div
                                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                                            style={{
                                                background: "color-mix(in srgb, var(--sys-accent) 12%, transparent)",
                                                color: "var(--sys-accent)",
                                            }}
                                        >
                                            <span className="material-icons-round text-[15px]">{pageLabel.icon}</span>
                                        </div>
                                        <div className="flex min-w-0 flex-col leading-none">
                                            <span className="text-[13px] font-semibold">{pageLabel.label}</span>
                                            <span className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--sys-text-secondary)" }}>
                                                {pageLabel.context}
                                            </span>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </li>
                        </ul>

                        {/* ── Right group ── */}
                        <ul className="ms-auto flex flex-row items-center gap-x-2">

                            {/* Search / command palette trigger */}
                            <li>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setCmdOpen(true)}
                                    className="hidden md:flex h-9 min-w-[220px] items-center justify-between gap-3 rounded-xl px-3.5 text-sm transition-all"
                                    style={{
                                        background: "color-mix(in srgb, var(--sys-text-primary) 5%, transparent)",
                                        border: "1px solid var(--sys-border)",
                                        color: "var(--sys-text-secondary)",
                                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--sys-accent) 24%, var(--sys-border))";
                                        e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--sys-accent) 8%, transparent)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "var(--sys-border)";
                                        e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04)";
                                    }}
                                    aria-label="Open command palette"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="material-icons-round text-[16px]">search</span>
                                        <span className="text-[12px] font-medium">Search pages, actions, history</span>
                                    </span>
                                    <kbd
                                        className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-mono"
                                        style={{
                                            background: "color-mix(in srgb, var(--sys-text-primary) 7%, transparent)",
                                            border: "1px solid var(--sys-border)",
                                        }}
                                    >
                                        ⌘K
                                    </kbd>
                                </motion.button>
                            </li>

                            {/* Theme toggle */}
                            <li>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.94 }}
                                    onClick={handleThemeToggle}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-sys-bg-tertiary focus:outline-none"
                                    style={{
                                        color: "var(--sys-text-primary)",
                                        background: "color-mix(in srgb, var(--sys-text-primary) 4%, transparent)",
                                        border: "1px solid var(--sys-border)",
                                    }}
                                    aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} theme`}
                                    title={`Switch to ${themeMode === "dark" ? "light" : "dark"} theme`}
                                >
                                    <span className="material-icons-round text-[18px]" style={{ color: "var(--sys-accent)" }}>
                                        {themeMode === "dark" ? "light_mode" : "dark_mode"}
                                    </span>
                                </motion.button>
                            </li>

                            {/* Notification bell */}
                            <li>
                                <motion.button
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={() => { setNotifOpen((o) => !o); setNotifOpen(true); }}
                                    className="relative inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 transition-colors hover:bg-sys-bg-tertiary focus:outline-none"
                                    style={{
                                        color: "var(--sys-text-secondary)",
                                        background: "color-mix(in srgb, var(--sys-text-primary) 4%, transparent)",
                                        border: "1px solid var(--sys-border)",
                                    }}
                                    aria-label="Notifications"
                                >
                                    <motion.span
                                        animate={unreadCount > 0 ? { rotate: [0, -4, 3, 0] } : {}}
                                        transition={{ duration: 0.45, repeat: Infinity, repeatDelay: 12 }}
                                        className="material-icons-round text-[18px]"
                                    >
                                        notifications
                                    </motion.span>
                                    <span className="hidden xl:inline text-[12px] font-medium" style={{ color: "var(--sys-text-primary)" }}>
                                        {unreadCount > 0 ? `${unreadCount} alert${unreadCount > 1 ? "s" : ""}` : "Inbox"}
                                    </span>
                                    {unreadCount > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: [1, 1.12, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
                                            className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white px-0.5"
                                            style={{ background: "var(--sys-error)" }}
                                        >
                                            {unreadCount}
                                        </motion.span>
                                    )}
                                </motion.button>
                            </li>

                            {/* User avatar + dropdown */}
                            <li className="inline-flex items-center">
                                <div className="relative group">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        className="p-0.5 inline-flex shrink-0 items-center rounded-full transition-colors hover:bg-sys-bg-tertiary focus:outline-none"
                                        aria-label="Account"
                                    >
                                        <motion.div
                                            className="shrink-0 size-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                                            style={{
                                                background: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))",
                                                boxShadow: "0 0 0 2px color-mix(in srgb, var(--sys-accent) 25%, transparent)",
                                            }}
                                            whileHover={{ boxShadow: "0 0 0 3px color-mix(in srgb, var(--sys-accent) 40%, transparent)" }}
                                        >
                                            {user?.email?.charAt(0)?.toUpperCase() ?? "S"}
                                        </motion.div>
                                    </motion.button>

                                    {/* Dropdown */}
                                    <div className="absolute right-0 top-full pt-1 z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="w-64 rounded-xl shadow-2xl overflow-hidden"
                                            style={{
                                                background: "var(--sys-bg-secondary)",
                                                border: "1px solid var(--sys-border)",
                                                boxShadow: "0 16px 48px rgba(0,0,0,0.2), 0 0 0 1px color-mix(in srgb, var(--sys-accent) 8%, transparent)",
                                            }}
                                        >
                                            {/* User info */}
                                            <div
                                                className="py-3 px-3.5 flex items-center gap-3"
                                                style={{ borderBottom: "1px solid var(--sys-border)" }}
                                            >
                                                <div
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                                                    style={{ background: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))" }}
                                                >
                                                    {user?.email?.charAt(0)?.toUpperCase() ?? "S"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-bold truncate" style={{ color: "var(--sys-text-primary)" }}>
                                                        {user?.name ?? "Operator"}
                                                    </p>
                                                    <p className="text-[11px] truncate" style={{ color: "var(--sys-text-secondary)" }}>
                                                        {user?.email ?? "operator@spectra.dev"}
                                                    </p>
                                                </div>
                                                <div
                                                    className="ms-auto px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
                                                    style={{
                                                        background: "color-mix(in srgb, var(--sys-accent) 12%, transparent)",
                                                        color: "var(--sys-accent)",
                                                    }}
                                                >
                                                    Admin
                                                </div>
                                            </div>
                                            <div className="p-1.5">
                                                {[
                                                    { icon: "settings", label: "Settings", path: "/admin/settings" },
                                                    { icon: "monitor_heart", label: "System Health", path: "/admin/health" },
                                                ].map((item) => (
                                                    <button
                                                        key={item.path}
                                                        onClick={() => handleNav(item.path)}
                                                        className="flex items-center gap-x-3 py-2 px-3 w-full rounded-lg text-sm transition-colors hover:bg-sys-bg-tertiary focus:outline-none"
                                                        style={{ color: "var(--sys-text-primary)" }}
                                                    >
                                                        <span className="material-icons-round shrink-0 text-[16px]" style={{ color: "var(--sys-text-secondary)" }}>
                                                            {item.icon}
                                                        </span>
                                                        {item.label}
                                                    </button>
                                                ))}
                                                <div style={{ borderTop: "1px solid var(--sys-border)", margin: "4px 0" }} />
                                                <button
                                                    onClick={handleLogout}
                                                    className="flex items-center gap-x-3 py-2 px-3 w-full rounded-lg text-sm transition-colors focus:outline-none"
                                                    style={{ color: "var(--sys-error)" }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--sys-error) 8%, transparent)")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                                >
                                                    <span className="material-icons-round shrink-0 text-[16px]">logout</span>
                                                    Log out
                                                </button>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </div>
                </nav>
            </motion.header>
            {/* ══════════ END HEADER ══════════ */}

            {/* ══════════ SIDEBAR ══════════ */}
            {/* Mobile backdrop */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[59] lg:hidden"
                        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={{ width: 240 }}
                animate={{ width: sidebarCollapsed ? 60 : 240 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={`fixed inset-y-0 start-0 z-[60] bg-sys-bg-secondary border-r border-sys-border
                    lg:block lg:translate-x-0
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
                style={{
                    boxShadow: "1px 0 0 var(--sys-border), 4px 0 16px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                }}
                role="dialog"
                aria-label="Sidebar"
            >
                <div className="pt-[52px] relative flex flex-col h-full max-h-full">

                    {/* Body */}
                    <nav
                        className="p-2 size-full flex flex-col overflow-y-auto overflow-x-hidden"
                        style={{
                            scrollbarWidth: "thin",
                            scrollbarColor: "var(--sys-border) transparent",
                        }}
                    >
                        {/* Mobile-only close */}
                        <div className="lg:hidden mb-2 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(false)}
                                className="p-1.5 size-[30px] inline-flex items-center justify-center rounded-md transition-colors hover:bg-sys-bg-tertiary focus:outline-none"
                                style={{ color: "var(--sys-text-secondary)" }}
                                aria-label="Close sidebar"
                            >
                                <svg className="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Nav sections */}
                        {SIDEBAR_SECTIONS.map((section, sIdx) => (
                            <motion.div
                                key={section.title}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: sIdx * 0.08 }}
                                className="pt-3 mt-3 flex flex-col border-t border-sys-border first:border-t-0 first:pt-0 first:mt-0"
                            >
                                {/* Section label */}
                                <AnimatePresence>
                                    {!sidebarCollapsed && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="block ps-2.5 mb-2 font-bold text-[9px] uppercase tracking-[0.16em]"
                                            style={{ color: "var(--sys-text-secondary)" }}
                                        >
                                            {section.title}
                                        </motion.span>
                                    )}
                                </AnimatePresence>

                                <ul className="flex flex-col gap-y-0.5">
                                    {section.items.map((item, iIdx) => {
                                        const dynamicItem = item.label === "Alerts" ? { ...item, badge: unreadCount } : item;
                                        return (
                                            <li key={item.path}>
                                                <SidebarNavItem
                                                    item={dynamicItem}
                                                    active={isActive(item.path)}
                                                    collapsed={sidebarCollapsed}
                                                    onClick={() => handleNav(item.path)}
                                                    index={sIdx * 10 + iIdx}
                                                />
                                            </li>
                                        )
                                    })}
                                </ul>
                            </motion.div>
                        ))}
                    </nav>
                    {/* End Body */}

                    {/* Footer */}
                    <footer
                        className="mt-auto p-2 flex flex-col"
                        style={{ borderTop: "1px solid var(--sys-border)" }}
                    >
                        <ul className="flex flex-col gap-y-0.5 mb-2">
                            {BOTTOM_ITEMS.map((item, i) => (
                                <li key={item.path}>
                                    <SidebarNavItem
                                        item={item}
                                        active={isActive(item.path)}
                                        collapsed={sidebarCollapsed}
                                        onClick={() => handleNav(item.path)}
                                        index={100 + i}
                                    />
                                </li>
                            ))}
                        </ul>

                        {/* User profile card */}
                        <AnimatePresence mode="wait">
                            {!sidebarCollapsed ? (
                                <motion.div
                                    key="full"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                                    style={{
                                        border: "1px solid color-mix(in srgb, var(--sys-border) 60%, transparent)",
                                        background: "var(--sys-bg-primary)",
                                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                                    }}
                                >
                                    <div
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                                        style={{
                                            background: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))",
                                            boxShadow: "0 2px 6px color-mix(in srgb, var(--sys-accent) 35%, transparent)",
                                        }}
                                    >
                                        {user?.email?.charAt(0)?.toUpperCase() ?? "S"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[12px] font-bold" style={{ color: "var(--sys-text-primary)" }}>
                                            {user?.name ?? "Operator"}
                                        </p>
                                        <p className="truncate text-[10px]" style={{ color: "var(--sys-text-secondary)" }}>
                                            {user?.email ?? "operator@spectra.dev"}
                                        </p>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.12 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleLogout}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                                        style={{ color: "var(--sys-text-secondary)" }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--sys-error) 10%, transparent)";
                                            (e.currentTarget as HTMLButtonElement).style.color = "var(--sys-error)";
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                            (e.currentTarget as HTMLButtonElement).style.color = "var(--sys-text-secondary)";
                                        }}
                                        title="Sign out"
                                    >
                                        <span className="material-icons-round text-[16px]">logout</span>
                                    </motion.button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="collapsed"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex justify-center"
                                >
                                    <Tooltip label={user?.name ?? "Operator"}>
                                        <div
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-white cursor-pointer"
                                            style={{ background: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))" }}
                                        >
                                            {user?.email?.charAt(0)?.toUpperCase() ?? "S"}
                                        </div>
                                    </Tooltip>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </footer>
                    {/* End Footer */}
                </div>
            </motion.aside>
            {/* ══════════ END SIDEBAR ══════════ */}

            {/* ══════════ MAIN CONTENT ══════════ */}
            <motion.main
                initial={{ paddingLeft: 240 }}
                animate={{ paddingLeft: sidebarCollapsed ? 60 : 240 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="bg-sys-bg-primary lg:fixed lg:inset-0 pt-[52px] px-3 pb-3 hidden lg:block"
            >
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="h-[calc(100dvh-62px)] lg:h-full overflow-hidden flex flex-col bg-sys-bg-primary border border-sys-border shadow-xs rounded-xl"
                >
                    {/* Page transition wrapper */}
                    <div className="flex-1 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="h-full"
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.main>

            {/* Mobile main (non-fixed) */}
            <main className="lg:hidden bg-sys-bg-primary pt-[52px] px-3 pb-3">
                <div className="overflow-hidden flex flex-col bg-sys-bg-primary border border-sys-border shadow-xs rounded-xl min-h-[calc(100dvh-62px)]">
                    <div className="flex-1 overflow-y-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
            {/* ══════════ END MAIN CONTENT ══════════ */}
        </>
    );
}
