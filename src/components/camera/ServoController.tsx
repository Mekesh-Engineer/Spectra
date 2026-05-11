import { motion } from "framer-motion";
import { useServoControl } from "@/hooks/useServoControl";

export default function ServoController() {
    const servo = useServoControl();

    const panPercent = (servo.pan / 180) * 100;
    const tiltPercent = (servo.tilt / 180) * 100;
    // Radar needle angle: 0°→left, 180°→right, displayed as 0–180 sweep
    const radarAngle = servo.pan;

    return (
        <div className="rounded-2xl border border-sys-border bg-sys-bg-secondary p-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-icons-round text-[18px] text-sys-accent">sports_esports</span>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-sys-text-secondary">
                        Servo Controller
                    </h2>
                </div>
                <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                        background: servo.connected
                            ? "color-mix(in srgb, var(--sys-success) 15%, transparent)"
                            : "color-mix(in srgb, var(--sys-warning) 15%, transparent)",
                        color: servo.connected ? "var(--sys-success)" : "var(--sys-warning)",
                    }}
                >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
                    {servo.connected ? "Connected" : "Offline"}
                </span>
            </div>

            {servo.error && (
                <p className="mt-2 rounded-lg bg-red-900/20 px-3 py-1.5 text-[11px] text-red-400">
                    {servo.error}
                </p>
            )}

            {/* ── Radar Visualization ─────────────────────────────────── */}
            <div className="mt-4 flex justify-center">
                <div className="relative h-[100px] w-[200px]">
                    {/* Radar arc (half-circle) */}
                    <svg viewBox="0 0 200 105" className="h-full w-full">
                        {/* Background arc */}
                        <path
                            d="M 10 100 A 90 90 0 0 1 190 100"
                            fill="none"
                            stroke="var(--sys-border)"
                            strokeWidth="1.5"
                        />
                        {/* Degree markers */}
                        {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
                            const rad = (Math.PI * deg) / 180;
                            const x1 = 100 - 85 * Math.cos(rad);
                            const y1 = 100 - 85 * Math.sin(rad);
                            const x2 = 100 - 90 * Math.cos(rad);
                            const y2 = 100 - 90 * Math.sin(rad);
                            const lx = 100 - 77 * Math.cos(rad);
                            const ly = 100 - 77 * Math.sin(rad);
                            return (
                                <g key={deg}>
                                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--sys-text-secondary)" strokeWidth="1" opacity="0.5" />
                                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="var(--sys-text-secondary)" opacity="0.6">
                                        {deg}°
                                    </text>
                                </g>
                            );
                        })}
                        {/* Sweep needle */}
                        <motion.line
                            x1="100"
                            y1="100"
                            x2={100 - 88 * Math.cos((Math.PI * radarAngle) / 180)}
                            y2={100 - 88 * Math.sin((Math.PI * radarAngle) / 180)}
                            stroke="var(--sys-accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            initial={false}
                            animate={{
                                x2: 100 - 88 * Math.cos((Math.PI * radarAngle) / 180),
                                y2: 100 - 88 * Math.sin((Math.PI * radarAngle) / 180),
                            }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                        />
                        {/* Center dot */}
                        <circle cx="100" cy="100" r="3" fill="var(--sys-accent)" />
                    </svg>
                </div>
            </div>

            {/* ── Pan Slider ──────────────────────────────────────────── */}
            <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-sys-text-secondary">
                    <span>Pan (Horizontal)</span>
                    <span className="font-mono font-semibold text-sys-text-primary">{servo.pan}°</span>
                </div>
                <div className="relative mt-1.5">
                    <input
                        type="range"
                        min={0}
                        max={180}
                        step={1}
                        value={servo.pan}
                        onChange={(e) => servo.movePan(Number(e.target.value))}
                        className="servo-slider w-full"
                        disabled={servo.scanning}
                    />
                    <div
                        className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-sys-accent/30"
                        style={{ width: `${panPercent}%` }}
                    />
                </div>
            </div>

            {/* ── Tilt Slider ─────────────────────────────────────────── */}
            <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-sys-text-secondary">
                    <span>Tilt (Vertical)</span>
                    <span className="font-mono font-semibold text-sys-text-primary">{servo.tilt}°</span>
                </div>
                <div className="relative mt-1.5">
                    <input
                        type="range"
                        min={0}
                        max={180}
                        step={1}
                        value={servo.tilt}
                        onChange={(e) => servo.moveTilt(Number(e.target.value))}
                        className="servo-slider w-full"
                    />
                    <div
                        className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-sys-accent/30"
                        style={{ width: `${tiltPercent}%` }}
                    />
                </div>
            </div>

            {/* ── Quick Positions ──────────────────────────────────────── */}
            <div className="mt-4 grid grid-cols-3 gap-1.5">
                <button onClick={() => servo.moveToPosition(0, 0)} className="servo-btn" title="Top-Left">
                    <span className="material-icons-round text-[14px]">north_west</span>
                </button>
                <button onClick={() => servo.moveToPosition(90, 0)} className="servo-btn" title="Top-Center">
                    <span className="material-icons-round text-[14px]">north</span>
                </button>
                <button onClick={() => servo.moveToPosition(180, 0)} className="servo-btn" title="Top-Right">
                    <span className="material-icons-round text-[14px]">north_east</span>
                </button>
                <button onClick={() => servo.moveToPosition(0, 90)} className="servo-btn" title="Middle-Left">
                    <span className="material-icons-round text-[14px]">west</span>
                </button>
                <button onClick={() => servo.center()} className="servo-btn !bg-sys-accent/15 !text-sys-accent" title="Center">
                    <span className="material-icons-round text-[14px]">filter_center_focus</span>
                </button>
                <button onClick={() => servo.moveToPosition(180, 90)} className="servo-btn" title="Middle-Right">
                    <span className="material-icons-round text-[14px]">east</span>
                </button>
                <button onClick={() => servo.moveToPosition(0, 180)} className="servo-btn" title="Bottom-Left">
                    <span className="material-icons-round text-[14px]">south_west</span>
                </button>
                <button onClick={() => servo.moveToPosition(90, 180)} className="servo-btn" title="Bottom-Center">
                    <span className="material-icons-round text-[14px]">south</span>
                </button>
                <button onClick={() => servo.moveToPosition(180, 180)} className="servo-btn" title="Bottom-Right">
                    <span className="material-icons-round text-[14px]">south_east</span>
                </button>
            </div>

            {/* ── Auto-Scan Toggle ─────────────────────────────────────── */}
            <div className="mt-4">
                <button
                    onClick={() => servo.scanning ? servo.stopScan() : servo.startScan()}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${servo.scanning
                            ? "bg-sys-accent text-white shadow-md"
                            : "border border-sys-border bg-sys-bg-primary text-sys-text-primary hover:bg-sys-bg-tertiary"
                        }`}
                >
                    <span className="material-icons-round text-[16px]">
                        {servo.scanning ? "stop" : "radar"}
                    </span>
                    {servo.scanning ? "Stop Scan" : "Auto-Scan (Radar)"}
                    {servo.scanning && (
                        <motion.span
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="h-2 w-2 rounded-full bg-white"
                        />
                    )}
                </button>
            </div>
        </div>
    );
}
