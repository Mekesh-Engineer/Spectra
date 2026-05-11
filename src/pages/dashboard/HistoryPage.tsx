import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { inspectionService } from "@/services/inspectionService";
import type { InspectionRow } from "@shared/types";

const ITEMS_PER_PAGE = 8;

// ─── Animations ──────────────────────────────────────────────────────────────
const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function HistoryPage() {
    const [filter, setFilter] = useState<"All" | "Pass" | "Fail">("All");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [items, setItems] = useState<InspectionRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const statusFilter = filter === "Pass" ? "completed" : filter === "Fail" ? "error" : undefined;
            const result = await inspectionService.list(page, ITEMS_PER_PAGE, { status: statusFilter, search: search || undefined });
            setItems(result.items);
            setTotal(result.total);
        } catch {
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, filter, search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    const handleExport = () => {
        const csv = [
            "ID,Date,Session,Objects,Pass,Fail,Status,Duration",
            ...items.map((r) => `${r.id},${r.created_at},${r.session_name},${r.total_objects},${r.pass_count},${r.fail_count},${r.status},${formatDuration(r.duration)}`),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "spectra-inspection-history.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <motion.div
            className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
            {/* Header */}
            <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-sys-text-primary">Inspection History</h1>
                    <p className="mt-1 text-sm text-sys-text-secondary">
                        Browse past inspection sessions and their results.
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 rounded-xl border border-sys-border bg-sys-bg-secondary px-4 py-2.5 text-sm font-medium text-sys-text-primary transition-colors hover:bg-sys-bg-tertiary"
                >
                    <span className="material-icons-round text-[16px]">download</span>
                    Export CSV
                </button>
            </motion.div>

            {/* Filters */}
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <span className="material-icons-round pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-sys-text-secondary">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Search by ID, session, or batch…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full rounded-xl border border-sys-border bg-sys-bg-secondary py-2.5 pl-10 pr-4 text-sm text-sys-text-primary placeholder-sys-text-secondary outline-none transition-colors focus:border-sys-accent"
                    />
                </div>
                <div className="flex rounded-xl border border-sys-border bg-sys-bg-secondary p-1">
                    {(["All", "Pass", "Fail"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f); setPage(1); }}
                            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${filter === f
                                ? f === "Pass"
                                    ? "bg-sys-success text-white"
                                    : f === "Fail"
                                        ? "bg-sys-error text-white"
                                        : "bg-sys-accent text-white"
                                : "text-sys-text-secondary hover:text-sys-text-primary"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <span className="text-[12px] text-sys-text-secondary">{total} results</span>
            </motion.div>

            {/* Table */}
            <motion.div variants={fadeUp} className="mt-6 overflow-x-auto rounded-2xl border border-sys-border">
                <table className="w-full text-left text-sm">
                    <thead className="bg-sys-bg-secondary">
                        <tr>
                            <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary">ID</th>
                            <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary">Date</th>
                            <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary">Session</th>
                            <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary">Objects</th>
                            <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary">Duration</th>
                            <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary">Result</th>
                            <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-sys-border/60">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-12 text-center text-sys-text-secondary">Loading…</td>
                            </tr>
                        ) : items.length > 0 ? (
                            items.map((record) => {
                                const result = record.fail_count > 2 ? "Fail" : "Pass";
                                return (
                                    <motion.tr
                                        key={record.id}
                                        layout
                                        className="cursor-pointer bg-sys-bg-primary transition-colors hover:bg-sys-bg-secondary"
                                        onClick={() => setExpanded(expanded === record.id ? null : record.id)}
                                    >
                                        <td className="px-5 py-3.5 font-medium text-sys-text-primary">{record.id.slice(0, 8)}</td>
                                        <td className="px-5 py-3.5 text-sys-text-secondary">{new Date(record.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                                        <td className="px-5 py-3.5 text-sys-text-secondary font-mono text-[12px]">{record.session_name || "—"}</td>
                                        <td className="px-5 py-3.5 text-sys-text-primary font-semibold">{record.total_objects}</td>
                                        <td className="px-5 py-3.5 text-sys-text-secondary font-mono text-[12px]">{formatDuration(record.duration)}</td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                                style={{
                                                    background: result === "Pass"
                                                        ? "color-mix(in srgb, var(--sys-success) 12%, transparent)"
                                                        : "color-mix(in srgb, var(--sys-error) 12%, transparent)",
                                                    color: result === "Pass" ? "var(--sys-success)" : "var(--sys-error)",
                                                }}
                                            >
                                                <span className="material-icons-round text-[12px]">
                                                    {result === "Pass" ? "check_circle" : "cancel"}
                                                </span>
                                                {result}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`material-icons-round text-[18px] text-sys-text-secondary transition-transform ${expanded === record.id ? "rotate-180" : ""}`}>
                                                expand_more
                                            </span>
                                        </td>
                                    </motion.tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-5 py-12 text-center text-sys-text-secondary">
                                    No records match your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Expanded Detail */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden border-t border-sys-border bg-sys-bg-secondary px-5 py-4"
                        >
                            {(() => {
                                const rec = items.find((r) => r.id === expanded);
                                if (!rec) return null;
                                return (
                                    <div className="flex flex-wrap items-center gap-6 text-sm">
                                        <div>
                                            <span className="text-[11px] text-sys-text-secondary">Details</span>
                                            <p className="font-medium text-sys-text-primary">{rec.session_name || "Inspection"} — {rec.total_objects} objects, {rec.fail_count} defects detected</p>
                                        </div>
                                        <div>
                                            <span className="text-[11px] text-sys-text-secondary">Pass / Fail</span>
                                            <p className="font-medium">
                                                <span className="text-sys-success">{rec.pass_count} pass</span>
                                                {" · "}
                                                <span className="text-sys-error">{rec.fail_count} fail</span>
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
                <motion.div variants={fadeUp} className="mt-4 flex items-center justify-between">
                    <span className="text-[12px] text-sys-text-secondary">
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-sys-border text-sys-text-secondary transition-colors hover:bg-sys-bg-secondary disabled:opacity-40"
                        >
                            <span className="material-icons-round text-[16px]">chevron_left</span>
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-semibold transition-all ${p === page
                                    ? "bg-sys-accent text-white"
                                    : "border border-sys-border text-sys-text-secondary hover:bg-sys-bg-secondary"
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-sys-border text-sys-text-secondary transition-colors hover:bg-sys-bg-secondary disabled:opacity-40"
                        >
                            <span className="material-icons-round text-[16px]">chevron_right</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
