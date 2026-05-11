import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useDashboardStats, fetchRecentInspections } from "@/hooks/useFirebaseData";
import { useUserStore } from "@/store/userStore";

type RangeKey = "7d" | "30d" | "90d";
const ranges: { key: RangeKey; label: string }[] = [
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
];

const rangeInDays: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

// ─── Animations ──────────────────────────────────────────────────────────────
const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-sys-border px-4 py-3 shadow-xl" style={{ background: "var(--sys-bg-primary)" }}>
            <p className="text-[12px] font-semibold text-sys-text-primary">{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="text-[11px] text-sys-text-secondary">
                    {p.name}: <span className="font-semibold text-sys-text-primary">{p.value}</span>
                </p>
            ))}
        </div>
    );
};

interface Stats { totalInspections: number; passRate: string; activeCameras: number; openAlerts: number; totalInventory: number; }
interface InspRow { created_at: string; pass_count: number; fail_count: number; total_objects: number; }

// ─── Component ───────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    const { user } = useUserStore();
    const effectiveUserId = user?.id ?? (import.meta.env.VITE_AUTH_REQUIRED === "false" ? (import.meta.env.VITE_GUEST_USER_ID || "anonymous") : undefined);
    const [range, setRange] = useState<RangeKey>("30d");
    const { stats, loading: statsLoading } = useDashboardStats();
    const [recentData, setRecentData] = useState<InspRow[]>([]);
    const [recentLoading, setRecentLoading] = useState(true);

    const loading = statsLoading || recentLoading;

    useEffect(() => {
        if (!effectiveUserId) return;
        let cancelled = false;
        (async () => {
            setRecentLoading(true);
            try {
                const r = await fetchRecentInspections(effectiveUserId, rangeInDays[range]);
                if (!cancelled) { setRecentData(r as any); }
            } catch { /* keep defaults */ }
            if (!cancelled) setRecentLoading(false);
        })();
        return () => { cancelled = true; };
    }, [range, effectiveUserId]);

    // Derive chart data from recent inspections
    const totalDefects = recentData.reduce((s, r) => s + r.fail_count, 0);
    const totalPass = recentData.reduce((s, r) => s + r.pass_count, 0);
    const totalFail = totalDefects;

    // Group by date label for trend
    const trendMap = new Map<string, { inspections: number; defects: number; passCount: number; total: number }>();
    recentData.forEach((r) => {
        const label = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const cur = trendMap.get(label) || { inspections: 0, defects: 0, passCount: 0, total: 0 };
        cur.inspections++;
        cur.defects += r.fail_count;
        cur.passCount += r.pass_count;
        cur.total += r.total_objects;
        trendMap.set(label, cur);
    });
    const trendData = Array.from(trendMap, ([date, v]) => ({
        date,
        inspections: v.inspections,
        defects: v.defects,
        passRate: v.total > 0 ? Math.round((v.passCount / v.total) * 1000) / 10 : 100,
    }));

    const kpiCards = [
        { label: "Total Inspections", value: stats ? stats.totalInspections.toLocaleString() : "—", delta: `${recentData.length} in selected period`, icon: "assignment", color: "var(--sys-accent)" },
        { label: "Pass Rate", value: stats ? stats.passRate : "—", delta: "Overall", icon: "verified", color: "var(--sys-success)" },
        { label: "Active Cameras", value: stats ? String(stats.activeCameras) : "—", delta: "Online", icon: "videocam", color: "var(--sys-info)" },
        { label: "Defects Found", value: String(totalDefects), delta: `in last ${range}`, icon: "report_problem", color: "var(--sys-error)" },
    ];

    const passFailData = [
        { name: "Pass", value: totalPass, color: "var(--sys-success)" },
        { name: "Fail", value: totalFail, color: "var(--sys-error)" },
    ];

    return (
        <motion.div
            className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-sys-text-primary">Analytics</h1>
                    <p className="mt-1 text-sm text-sys-text-secondary">
                        Inspection performance metrics and historical data.
                    </p>
                </div>
                <div className="flex rounded-xl border border-sys-border bg-sys-bg-secondary p-1">
                    {ranges.map((r) => (
                        <button
                            key={r.key}
                            onClick={() => setRange(r.key)}
                            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${range === r.key
                                ? "bg-sys-accent text-white shadow-sm"
                                : "text-sys-text-secondary hover:text-sys-text-primary"
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* KPI Cards */}
            <motion.div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={container}>
                {kpiCards.map((card) => (
                    <motion.div
                        key={card.label}
                        variants={fadeUp}
                        whileHover={{ y: -2 }}
                        className={`group rounded-2xl border border-sys-border bg-sys-bg-secondary p-5 transition-all hover:border-sys-accent/30 ${loading ? "animate-pulse" : ""}`}
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] font-medium text-sys-text-secondary">{card.label}</p>
                            <div
                                className="flex h-9 w-9 items-center justify-center rounded-xl"
                                style={{ background: `color-mix(in srgb, ${card.color} 12%, transparent)` }}
                            >
                                <span className="material-icons-round text-[18px]" style={{ color: card.color }}>{card.icon}</span>
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tracking-tight text-sys-text-primary">{card.value}</p>
                        <p className="mt-1 text-[11px] text-sys-text-secondary">{card.delta}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Line Chart — Inspection Trends */}
            <motion.div variants={fadeUp} className="mt-8 rounded-2xl border border-sys-border bg-sys-bg-secondary p-6">
                <h2 className="text-lg font-semibold text-sys-text-primary">Inspection Trends</h2>
                <p className="mt-0.5 text-[13px] text-sys-text-secondary">Monthly inspection count and pass rate</p>
                <div className="mt-6 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--sys-border)" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--sys-text-secondary)" }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "var(--sys-text-secondary)" }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" domain={[85, 100]} tick={{ fontSize: 12, fill: "var(--sys-text-secondary)" }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line yAxisId="left" type="monotone" dataKey="inspections" name="Inspections" stroke="var(--sys-accent)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--sys-accent)" }} activeDot={{ r: 6 }} />
                            <Line yAxisId="right" type="monotone" dataKey="passRate" name="Pass Rate (%)" stroke="var(--sys-success)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: "var(--sys-success)" }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Bar + Pie Row */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Bar Chart — Defect Categories */}
                <motion.div variants={fadeUp} className="lg:col-span-2 rounded-2xl border border-sys-border bg-sys-bg-secondary p-6">
                    <h2 className="text-lg font-semibold text-sys-text-primary">Defects Over Time</h2>
                    <p className="mt-0.5 text-[13px] text-sys-text-secondary">Daily defect counts</p>
                    <div className="mt-6 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--sys-border)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--sys-text-secondary)" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: "var(--sys-text-secondary)" }} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="defects" name="Defects" fill="var(--sys-accent)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Pie Chart — Pass/Fail */}
                <motion.div variants={fadeUp} className="rounded-2xl border border-sys-border bg-sys-bg-secondary p-6">
                    <h2 className="text-lg font-semibold text-sys-text-primary">Pass / Fail</h2>
                    <p className="mt-0.5 text-[13px] text-sys-text-secondary">Overall distribution</p>
                    <div className="mt-4 h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={passFailData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {passFailData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-2 flex justify-center gap-6">
                        {passFailData.map((d) => (
                            <div key={d.name} className="flex items-center gap-2 text-[12px]">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                                <span className="text-sys-text-secondary">{d.name}</span>
                                <span className="font-semibold text-sys-text-primary">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
