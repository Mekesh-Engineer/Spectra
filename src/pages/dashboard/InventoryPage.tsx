import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { inventoryService } from "@/services/inventoryService";
import type { InventoryRow } from "@shared/types";

// ─── Animations ──────────────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// ─── Component ───────────────────────────────────────────────────────────────
export default function InventoryPage() {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<"All" | "rod" | "pipe">("All");
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    const [items, setItems] = useState<InventoryRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await inventoryService.list(1, 100, {
                type: typeFilter !== "All" ? typeFilter : undefined,
                search: search || undefined,
            });
            setItems(result.items);
            setTotal(result.total);
        } catch {
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [typeFilter, search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const rodCount = items.filter((i) => i.type === "rod").length;
    const pipeCount = items.filter((i) => i.type === "pipe").length;

    const handleExport = () => {
        const csv = [
            "ID,Type,Material,Diameter,Length,Batch,Status,Inspected",
            ...items.map((r) => `${r.id},${r.type},${r.material},${r.diameter} ${r.unit},${r.length} ${r.unit},${r.batch},${r.status},${r.created_at}`),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "spectra-inventory.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <motion.div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" variants={container} initial="hidden" animate="visible">
            {/* Header */}
            <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-sys-text-primary">Inventory</h1>
                    <p className="mt-1 text-sm text-sys-text-secondary">Track measured items and their recorded dimensions.</p>
                </div>
                <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl border border-sys-border bg-sys-bg-secondary px-4 py-2.5 text-sm font-medium text-sys-text-primary transition-colors hover:bg-sys-bg-tertiary">
                    <span className="material-icons-round text-[16px]">download</span>
                    Export CSV
                </button>
            </motion.div>

            {/* Summary Cards */}
            <motion.div variants={container} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    { label: "Total Items", value: total, icon: "inventory_2", color: "var(--sys-text-primary)" },
                    { label: "Rods", value: rodCount, icon: "linear_scale", color: "var(--sys-accent)" },
                    { label: "Pipes", value: pipeCount, icon: "plumbing", color: "var(--sys-info)" },
                ].map((card) => (
                    <motion.div key={card.label} variants={fadeUp} className="rounded-2xl border border-sys-border bg-sys-bg-secondary p-5 transition-all hover:border-sys-accent/30" whileHover={{ y: -2 }}>
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] font-medium text-sys-text-secondary">{card.label}</p>
                            <span className="material-icons-round text-[20px]" style={{ color: card.color }}>{card.icon}</span>
                        </div>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-sys-text-primary">{card.value}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Filters */}
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <span className="material-icons-round pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-sys-text-secondary">search</span>
                    <input
                        type="text"
                        placeholder="Search by ID, material, or batch…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-sys-border bg-sys-bg-secondary py-2.5 pl-10 pr-4 text-sm text-sys-text-primary placeholder-sys-text-secondary outline-none focus:border-sys-accent"
                    />
                </div>
                <div className="flex rounded-xl border border-sys-border bg-sys-bg-secondary p-1">
                    {(["All", "rod", "pipe"] as const).map((f) => (
                        <button key={f} onClick={() => setTypeFilter(f)} className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${typeFilter === f ? "bg-sys-accent text-white shadow-sm" : "text-sys-text-secondary hover:text-sys-text-primary"}`}>
                            {f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="flex rounded-xl border border-sys-border bg-sys-bg-secondary p-1">
                    {(["table", "grid"] as const).map((v) => (
                        <button key={v} onClick={() => setViewMode(v)} className={`rounded-lg px-2 py-1.5 text-[12px] transition-all ${viewMode === v ? "bg-sys-accent text-white shadow-sm" : "text-sys-text-secondary hover:text-sys-text-primary"}`}>
                            <span className="material-icons-round text-[16px]">{v === "table" ? "view_list" : "grid_view"}</span>
                        </button>
                    ))}
                </div>
                <span className="text-[12px] text-sys-text-secondary">{total} items</span>
            </motion.div>

            {/* Content */}
            {viewMode === "table" ? (
                <motion.div variants={fadeUp} className="mt-6 overflow-x-auto rounded-2xl border border-sys-border">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-sys-bg-secondary">
                            <tr>
                                {["ID", "Type", "Material", "Diameter", "Length", "Batch", "Status", "Inspected"].map((h) => (
                                    <th key={h} className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sys-border/60">
                            {loading ? (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-sys-text-secondary">Loading…</td></tr>
                            ) : items.length > 0 ? items.map((item) => (
                                <tr key={item.id} className="bg-sys-bg-primary transition-colors hover:bg-sys-bg-secondary">
                                    <td className="px-4 py-3 font-medium text-sys-text-primary">{item.id.slice(0, 8)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.type === "rod" ? "bg-sys-accent/10 text-sys-accent" : "bg-sys-info/10 text-sys-info"}`}>
                                            <span className="material-icons-round text-[12px]">{item.type === "rod" ? "linear_scale" : "plumbing"}</span>
                                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sys-text-secondary">{item.material}</td>
                                    <td className="px-4 py-3 font-mono text-[12px] text-sys-text-primary">{item.diameter} {item.unit}</td>
                                    <td className="px-4 py-3 font-mono text-[12px] text-sys-text-primary">{item.length} {item.unit}</td>
                                    <td className="px-4 py-3 font-mono text-[12px] text-sys-text-secondary">{item.batch}</td>
                                    <td className="px-4 py-3">
                                        <span className="material-icons-round text-[16px]" style={{ color: item.status === "pass" ? "var(--sys-success)" : "var(--sys-error)" }}>
                                            {item.status === "pass" ? "check_circle" : "cancel"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[12px] text-sys-text-secondary">{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-sys-text-secondary">No items found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </motion.div>
            ) : (
                <motion.div variants={container} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item) => (
                        <motion.div key={item.id} variants={fadeUp} whileHover={{ y: -2 }} className="rounded-2xl border border-sys-border bg-sys-bg-secondary p-4 transition-all hover:border-sys-accent/30">
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-semibold text-sys-text-primary">{item.id.slice(0, 8)}</span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.type === "rod" ? "bg-sys-accent/10 text-sys-accent" : "bg-sys-info/10 text-sys-info"}`}>
                                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                </span>
                            </div>
                            <p className="mt-2 text-[12px] text-sys-text-secondary">{item.material}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                    <span className="text-sys-text-secondary">Diameter</span>
                                    <p className="font-mono font-semibold text-sys-text-primary">{item.diameter} {item.unit}</p>
                                </div>
                                <div>
                                    <span className="text-sys-text-secondary">Length</span>
                                    <p className="font-mono font-semibold text-sys-text-primary">{item.length} {item.unit}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[11px]">
                                <span className="text-sys-text-secondary">{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                <span className="material-icons-round text-[14px]" style={{ color: item.status === "pass" ? "var(--sys-success)" : "var(--sys-error)" }}>
                                    {item.status === "pass" ? "check_circle" : "cancel"}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </motion.div>
    );
}
