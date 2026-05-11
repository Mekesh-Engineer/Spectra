// src/pages/public/DemoPage.tsx
// ─── Spectra AI · Live Demo Dashboard ─────────────────────────────────────────
// Supports webcam input and image upload for real-time AI inference.
// Styled with sys-* CSS design tokens (variables.css) to match HomePage.tsx.

import {
    useRef, useState, useEffect, useCallback,
    type ReactNode, type ChangeEvent,
} from 'react';
import {
    motion, AnimatePresence, useMotionValue, useSpring,
} from 'framer-motion';
import { useCameraStream } from '@/hooks/useCameraStream';
import { inferenceService } from '@/services/inferenceService';
import type { DualDetectionResult } from '@/services/inferenceService';
import { inspectionService } from '@/services/inspectionService';
import type { Detection } from '@shared/types/detection.types';
import type { MeasurementOutput, DimensionalMeasurement } from '@shared/types/measurement.types';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepId = 'select' | 'detect' | 'measure' | 'results';
type InputMode = 'webcam' | 'esp32' | 'upload';
type TaggedDetection = Detection & { model: 'circle' | 'line' };

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS: { id: StepId; label: string; icon: string }[] = [
    { id: 'select', label: 'Select', icon: 'layers' },
    { id: 'detect', label: 'Detect', icon: 'search' },
    { id: 'measure', label: 'Measure', icon: 'straighten' },
    { id: 'results', label: 'Results', icon: 'analytics' },
];

// [CHANGE] MODEL_COLORS: replaced hardcoded hex values with CSS design tokens
// so colours adapt automatically when the theme changes.
const MODEL_COLORS = {
    circle: { border: 'var(--sys-info)', bg: 'var(--sys-info)' },
    line: { border: 'var(--sys-warning)', bg: 'var(--sys-warning)' },
};

// ─── CSS Variable Helpers ─────────────────────────────────────────────────────

const alpha = (token: string, pct: number) =>
    `color-mix(in srgb, ${token} ${pct}%, transparent)`;

const V = {
    bgPrimary: 'var(--sys-bg-primary)',
    bgSecondary: 'var(--sys-bg-secondary)',
    bgTertiary: 'var(--sys-bg-tertiary)',
    border: 'var(--sys-border)',
    textPrimary: 'var(--sys-text-primary)',
    textSecondary: 'var(--sys-text-secondary)',
    accent: 'var(--sys-accent)',
    success: 'var(--sys-success)',
    error: 'var(--sys-error)',
    warning: 'var(--sys-warning)',
    info: 'var(--sys-info)',
} as const;

// ─── Session Timer ────────────────────────────────────────────────────────────

function useSessionTimer(isRunning: boolean) {
    const [elapsed, setElapsed] = useState(0);
    const ref = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    useEffect(() => {
        if (isRunning) {
            setElapsed(0);
            ref.current = setInterval(() => setElapsed(p => p + 1), 1000);
        } else { clearInterval(ref.current); }
        return () => clearInterval(ref.current);
    }, [isRunning]);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    return `${m}:${s}`;
}

// ─── Framer Motion Variants ───────────────────────────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay },
    }),
};

// ─── Cursor Glow ──────────────────────────────────────────────────────────────

function CursorGlow() {
    const x = useMotionValue(-200);
    const y = useMotionValue(-200);
    const sx = useSpring(x, { stiffness: 80, damping: 18 });
    const sy = useSpring(y, { stiffness: 80, damping: 18 });
    useEffect(() => {
        const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
        window.addEventListener('mousemove', move);
        return () => window.removeEventListener('mousemove', move);
    }, [x, y]);
    return (
        <motion.div
            style={{
                position: 'fixed', top: 0, left: 0, x: sx, y: sy,
                width: 320, height: 320, borderRadius: '50%',
                background: 'radial-gradient(circle, color-mix(in srgb, var(--sys-accent) 6%, transparent) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 9999,
                translateX: '-50%', translateY: '-50%',
            }}
        />
    );
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function PulseDot({ color = V.success, size = 8 }: { color?: string; size?: number }) {
    return (
        <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
            <motion.span
                animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color }}
            />
            <span style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: color, display: 'block' }} />
        </span>
    );
}

function PassFailBadge({ pass }: { pass: boolean }) {
    const color = pass ? V.success : V.error;
    return (
        <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
            letterSpacing: '0.1em', fontFamily: 'monospace',
            color, background: alpha(color, 12), border: `1px solid ${alpha(color, 35)}`,
        }}>
            {pass ? 'Pass' : 'Fail'}
        </span>
    );
}

function Card({ children, style, onClick }: { children: ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            style={{
                background: V.bgSecondary,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${V.border}`,
                borderRadius: 16,
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// [CHANGE] SectionLabel: unified panel sub-header style — 11px medium, no
// uppercase, no heavy bold — replaces the old "uppercase font-bold tracking-wider"
// that was applied inconsistently across different panels.
function SectionLabel({ children }: { children: ReactNode }) {
    return (
        <p style={{
            fontSize: 11, fontWeight: 600,
            letterSpacing: '0.04em', color: V.textSecondary, margin: '0 0 10px',
        }}>
            {children}
        </p>
    );
}

function MonoValue({ value, unit, color }: { value: string | number; unit?: string; color?: string }) {
    return (
        <div style={{ lineHeight: 1 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 900, color: color ?? V.textPrimary }}>{value}</span>
            {unit && <span style={{ fontFamily: 'monospace', fontSize: 14, color: V.textSecondary, marginLeft: 3 }}>{unit}</span>}
        </div>
    );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
// [CHANGE] The large pill stepper in the page header was visually dominant but
// low in information value. Kept as a compact inline nav here; it's contextually
// anchored to the content rather than consuming header real estate.

function StepIndicator({ active, onStep }: { active: StepId; onStep: (s: StepId) => void }) {
    const idx = STEPS.findIndex(s => s.id === active);
    return (
        <nav style={{ display: 'flex', alignItems: 'center' }}>
            {STEPS.map((step, i) => {
                const done = i < idx;
                const current = i === idx;
                return (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                        <motion.button
                            onClick={() => onStep(step.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 14px', borderRadius: 9999, cursor: 'pointer', border: 'none',
                                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                                // [CHANGE] sentence case in nav labels
                                textTransform: 'none',
                                background: current
                                    ? alpha(V.accent, 15)
                                    : done ? alpha(V.info, 10) : alpha(V.textPrimary, 4),
                                color: current ? V.accent : done ? V.info : V.textSecondary,
                                boxShadow: current
                                    ? `0 0 14px ${alpha(V.accent, 28)}, inset 0 0 0 1px ${alpha(V.accent, 40)}`
                                    : done ? `inset 0 0 0 1px ${alpha(V.info, 30)}`
                                        : `inset 0 0 0 1px ${alpha(V.textPrimary, 7)}`,
                                transition: 'all 0.2s',
                            }}
                        >
                            {current && <PulseDot color={V.accent} size={6} />}
                            {done && (
                                <span className="material-icons-round" style={{ fontSize: 11 }}>check_circle</span>
                            )}
                            {step.label}
                        </motion.button>
                        {i < STEPS.length - 1 && (
                            <div style={{
                                width: 20, height: 1, margin: '0 2px', transition: 'background 0.4s',
                                background: done ? V.info : V.border,
                            }} />
                        )}
                    </div>
                );
            })}
        </nav>
    );
}

// ─── CameraFeed – pure media layer ───────────────────────────────────────────
// [CHANGE] Split out from the monolithic LiveViewport. CameraFeed renders
// only the media element (video / image / offline state). No overlays, no
// inspection state. Simpler to reason about and independently testable.

function CameraFeed({
    inputMode,
    cameraSource,
    isCameraStreaming,
    esp32Url,
    uploadedImage,
    attachStream,
    imgRef,
}: {
    inputMode: InputMode;
    cameraSource: 'webcam' | 'esp32' | 'upload';
    isCameraStreaming: boolean;
    esp32Url: string;
    uploadedImage: string | null;
    attachStream: (el: HTMLVideoElement | null) => void;
    imgRef: React.MutableRefObject<HTMLImageElement | null>;
}) {
    const hasFeed = inputMode === 'upload' ? !!uploadedImage : isCameraStreaming;

    return (
        <AnimatePresence mode="wait">
            {hasFeed ? (
                <motion.div
                    key="feed"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ position: 'absolute', inset: 0 }}
                >
                    {inputMode === 'webcam' && cameraSource === 'webcam' && (
                        <video
                            ref={attachStream}
                            autoPlay playsInline muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )}
                    {inputMode === 'esp32' && cameraSource === 'esp32' && (
                        <img
                            ref={(el) => { imgRef.current = el; }}
                            src={esp32Url}
                            alt="ESP32-CAM"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    )}
                    {inputMode === 'upload' && uploadedImage && (
                        <img
                            src={uploadedImage}
                            alt="Uploaded"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    )}
                </motion.div>
            ) : (
                <motion.div
                    key="empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                    <span className="material-icons-round" style={{ fontSize: 48, color: alpha(V.textSecondary, 40) }}>
                        {inputMode === 'upload' ? 'image' : inputMode === 'esp32' ? 'sensors_off' : 'videocam_off'}
                    </span>
                    <p style={{ fontSize: 12, color: V.textSecondary, margin: 0 }}>
                        {inputMode === 'upload'
                            ? 'Upload an image to begin'
                            : inputMode === 'esp32'
                                ? 'Connect ESP32-CAM to begin'
                                : 'Connect your webcam to begin'}
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── InspectionOverlay – bounding boxes, HUD chips, timer, errors ─────────────
// [CHANGE] Separated from CameraFeed. Owns only inspection-state concerns so
// each piece is independently testable and readable.

function InspectionOverlay({
    taggedDetections,
    measurementOutput,
    running,
    inferring,
    inferError,
    circleCount,
    lineCount,
    elapsed,
}: {
    taggedDetections: TaggedDetection[];
    measurementOutput: MeasurementOutput | null;
    running: boolean;
    inferring: boolean;
    inferError: string | null;
    circleCount: number;
    lineCount: number;
    elapsed: string;
}) {
    const totalPass = measurementOutput?.summary?.passCount ?? 0;
    const totalFail = measurementOutput?.summary?.failCount ?? 0;
    const hasResults = taggedDetections.length > 0 && measurementOutput !== null;

    return (
        <>
            {/* Bounding boxes */}
            {taggedDetections.length > 0 && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
                    {taggedDetections.map((det, idx) => {
                        const colors = MODEL_COLORS[det.model];
                        const meas = measurementOutput?.measurements[idx];
                        return (
                            <motion.div
                                key={det.id}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                style={{
                                    position: 'absolute',
                                    left: `${(det.x / 1280) * 100}%`,
                                    top: `${(det.y / 720) * 100}%`,
                                    width: `${(det.width / 1280) * 100}%`,
                                    height: `${(det.height / 720) * 100}%`,
                                    border: `2px solid ${colors.border}`,
                                    borderRadius: 4,
                                }}
                            >
                                {/* [CHANGE] Label clamped inside the frame (top: 2 / left: 2)
                                    to prevent overflow at the very top edge — was "-top-5". */}
                                <div style={{
                                    position: 'absolute', top: 2, left: 2,
                                    display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                                }}>
                                    <span style={{
                                        fontSize: 9, fontWeight: 800, fontFamily: 'monospace',
                                        padding: '1px 6px', borderRadius: 3,
                                        background: colors.bg, color: '#000',
                                    }}>
                                        {det.label}
                                    </span>
                                    <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: colors.bg }}>
                                        {(det.confidence * 100).toFixed(0)}%
                                    </span>
                                </div>

                                {/* Measurement annotation — also clamped inside the frame */}
                                {meas && (
                                    <div style={{
                                        position: 'absolute', top: '50%', left: '50%',
                                        transform: 'translate(-50%,-50%)',
                                        background: alpha(V.info, 90), backdropFilter: 'blur(4px)',
                                        padding: '2px 8px', borderRadius: 5,
                                        fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#fff',
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
                                    }}>
                                        {meas.diameter !== null
                                            ? `⌀ ${meas.diameter}mm`
                                            : meas.length !== null
                                                ? `L ${meas.length}mm`
                                                : `${meas.width_mm}×${meas.height_mm}mm`}
                                    </div>
                                )}

                                {/* Dimension lines */}
                                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                                    <line x1="5%" y1="50%" x2="95%" y2="50%" stroke={V.info} strokeWidth="0.8" strokeDasharray="3,2" />
                                    <line x1="5%" y1="35%" x2="5%" y2="65%" stroke={V.info} strokeWidth="1" />
                                    <line x1="95%" y1="35%" x2="95%" y2="65%" stroke={V.info} strokeWidth="1" />
                                </svg>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* [CHANGE] Live count chip: replaced raw "Circles / Lines" model counts
                with a pass/fail tally operators can act on. Model counts move to a
                secondary line for context. Shows raw counts when no results yet. */}
            {running && (
                <div style={{
                    position: 'absolute', top: 12, left: 12, zIndex: 4,
                    display: 'flex', flexDirection: 'column', gap: 4,
                    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                    padding: '8px 12px', borderRadius: 8,
                    border: `1px solid ${alpha(V.textPrimary, 10)}`,
                }}>
                    {hasResults ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: V.success }} />
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{totalPass} pass</span>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>·</span>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: V.error }} />
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{totalFail} fail</span>
                            </div>
                            <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)' }}>
                                {circleCount} circle · {lineCount} line detections
                            </span>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: MODEL_COLORS.circle.bg }} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>Circle</span>
                                <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>{circleCount}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: MODEL_COLORS.line.bg }} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>Line</span>
                                <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>{lineCount}</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Timer + AI status */}
            {running && (
                <div style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 4,
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                    padding: '6px 12px', borderRadius: 8,
                    border: `1px solid ${alpha(V.textPrimary, 10)}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 10, borderRight: `1px solid ${alpha(V.textPrimary, 15)}` }}>
                        {/* [CHANGE] Spinner uses white/60 so it doesn't compete with
                            the accent-coloured detection bounding boxes. */}
                        {inferring ? (
                            <span style={{
                                width: 9, height: 9, borderRadius: '50%', display: 'block',
                                border: '2px solid rgba(255,255,255,0.6)',
                                borderTopColor: 'transparent',
                                animation: 'spin 0.7s linear infinite',
                            }} />
                        ) : (
                            <motion.span
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'block' }}
                            />
                        )}
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>AI Active</span>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#fff' }}>{elapsed}</span>
                </div>
            )}

            {/* [CHANGE] Error message is user-friendly — no port numbers.
                Technical detail is console.error'd in runDualInference. */}
            {inferError && (
                <div style={{
                    position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 4,
                    background: 'rgba(127,29,29,0.85)', backdropFilter: 'blur(6px)',
                    padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 11, fontWeight: 600, color: '#fff',
                    border: `1px solid ${alpha(V.error, 30)}`,
                }}>
                    <span className="material-icons-round" style={{ fontSize: 16 }}>error_outline</span>
                    {inferError}
                </div>
            )}
        </>
    );
}

// ─── Live Viewport – container that composes CameraFeed + InspectionOverlay ───

function LiveViewport({
    inputMode, cameraSource, isCameraStreaming, esp32Url,
    uploadedImage, attachStream, imgRef,
    taggedDetections, measurementOutput,
    running, inferring, inferError,
    circleCount, lineCount, elapsed,
}: {
    inputMode: InputMode;
    cameraSource: 'webcam' | 'esp32' | 'upload';
    isCameraStreaming: boolean;
    esp32Url: string;
    uploadedImage: string | null;
    attachStream: (el: HTMLVideoElement | null) => void;
    imgRef: React.MutableRefObject<HTMLImageElement | null>;
    taggedDetections: TaggedDetection[];
    measurementOutput: MeasurementOutput | null;
    running: boolean;
    inferring: boolean;
    inferError: string | null;
    circleCount: number;
    lineCount: number;
    elapsed: string;
}) {
    return (
        <div style={{
            borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            background: V.bgSecondary, backdropFilter: 'blur(10px)',
            border: `1px solid ${V.border}`,
        }}>
            {/* Top bar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', background: V.bgTertiary,
                borderBottom: `1px solid ${V.border}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {running
                            ? <PulseDot color={V.error} size={7} />
                            : <span style={{ width: 7, height: 7, borderRadius: '50%', background: V.textSecondary, display: 'inline-block' }} />
                        }
                        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: V.textPrimary }}>
                            {running ? 'LIVE' : 'IDLE'} · {inputMode === 'webcam' ? cameraSource.toUpperCase() : 'UPLOAD'}
                        </span>
                    </div>
                    <div style={{ width: 1, height: 14, background: V.border }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: V.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Dual-model · YOLOv9
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {inferring && (
                        <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 5, letterSpacing: '0.06em',
                            background: alpha(V.warning, 15), color: V.warning, border: `1px solid ${alpha(V.warning, 25)}`,
                        }}>
                            Inferring…
                        </span>
                    )}
                    {taggedDetections.length > 0 && (
                        <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 5, letterSpacing: '0.06em',
                            background: alpha(V.success, 10), color: V.success, border: `1px solid ${alpha(V.success, 20)}`,
                        }}>
                            {taggedDetections.length} objects
                        </span>
                    )}
                </div>
            </div>

            {/* Feed area */}
            <div style={{ position: 'relative', background: V.bgPrimary, overflow: 'hidden', minHeight: 320, aspectRatio: '16/9' }}>
                {/* Dot grid */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.4, zIndex: 1, pointerEvents: 'none',
                    backgroundImage: `radial-gradient(circle, ${alpha(V.textSecondary, 20)} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                }} />
                {/* Scan line */}
                <motion.div
                    animate={running ? { y: ['0%', '100%', '0%'] } : {}}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    style={{
                        position: 'absolute', left: 0, right: 0, height: 2, zIndex: 2, pointerEvents: 'none',
                        background: `linear-gradient(90deg, transparent, ${alpha(V.accent, 50)}, transparent)`,
                        top: 0,
                    }}
                />
                {/* Corner crosshairs */}
                {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
                    <div key={c} style={{
                        position: 'absolute', zIndex: 2,
                        top: c.startsWith('t') ? 12 : 'auto',
                        bottom: c.startsWith('b') ? 12 : 'auto',
                        left: c.endsWith('l') ? 12 : 'auto',
                        right: c.endsWith('r') ? 12 : 'auto',
                        width: 18, height: 18,
                        borderTop: c.startsWith('t') ? `2px solid ${alpha(V.accent, 35)}` : 'none',
                        borderBottom: c.startsWith('b') ? `2px solid ${alpha(V.accent, 35)}` : 'none',
                        borderLeft: c.endsWith('l') ? `2px solid ${alpha(V.accent, 35)}` : 'none',
                        borderRight: c.endsWith('r') ? `2px solid ${alpha(V.accent, 35)}` : 'none',
                    }} />
                ))}

                {/* Pure media */}
                <CameraFeed
                    inputMode={inputMode}
                    cameraSource={cameraSource}
                    isCameraStreaming={isCameraStreaming}
                    esp32Url={esp32Url}
                    uploadedImage={uploadedImage}
                    attachStream={attachStream}
                    imgRef={imgRef}
                />

                {/* Inspection state overlays */}
                <InspectionOverlay
                    taggedDetections={taggedDetections}
                    measurementOutput={measurementOutput}
                    running={running}
                    inferring={inferring}
                    inferError={inferError}
                    circleCount={circleCount}
                    lineCount={lineCount}
                    elapsed={elapsed}
                />

                {/* HUD chips */}
                <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', gap: 6, zIndex: 4 }}>
                    {[running ? 'Live' : 'Idle', 'Dual-model'].map(chip => (
                        <div key={chip} style={{
                            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                            padding: '3px 8px', borderRadius: 4,
                            fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
                            color: 'rgba(255,255,255,0.75)', border: `1px solid ${alpha(V.textPrimary, 10)}`,
                        }}>
                            {chip}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Results Table ────────────────────────────────────────────────────────────

function ResultsTable({ measurements }: { measurements: DimensionalMeasurement[] }) {
    const exportCSV = () => {
        const header = 'Object ID,Class,Model,Diameter (mm),Length (mm),W×H (mm),Confidence,Pass\n';
        const rows = measurements.map(m =>
            `${m.object_id},${m.detection_class},${m.model},${m.diameter ?? ''},${m.length ?? ''},${m.width_mm}×${m.height_mm},${(m.confidence * 100).toFixed(1)},${m.pass ? 'Pass' : 'Fail'}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'spectra-demo-results.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
                padding: '14px 18px', borderBottom: `1px solid ${V.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                {/* [CHANGE] Header uses unified SectionLabel style */}
                <SectionLabel>Measurement log</SectionLabel>
                <button
                    onClick={exportCSV}
                    style={{
                        fontSize: 10, fontWeight: 600, color: V.accent,
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}
                >
                    <span className="material-icons-round" style={{ fontSize: 13 }}>download</span>
                    Export CSV
                </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: alpha(V.textPrimary, 4) }}>
                            {['#', 'Class', 'Model', 'Diameter', 'Length', 'W×H', 'Conf', 'Status'].map(h => (
                                <th key={h} style={{
                                    padding: '8px 14px', fontSize: 8, fontWeight: 700,
                                    textTransform: 'uppercase', color: V.textSecondary,
                                    letterSpacing: '0.08em', textAlign: 'left', whiteSpace: 'nowrap',
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence initial={false}>
                            {measurements.slice(0, 50).map(m => (
                                <motion.tr
                                    key={`${m.object_id}-${m.model}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3 }}
                                    style={{
                                        borderBottom: `1px solid ${alpha(V.textPrimary, 4)}`,
                                        background: !m.pass ? alpha(V.error, 4) : 'transparent',
                                    }}
                                >
                                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: V.textSecondary }}>{m.object_id}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: V.textPrimary, fontWeight: 700 }}>{m.detection_class}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                            background: alpha(MODEL_COLORS[m.model].bg, 15),
                                            color: MODEL_COLORS[m.model].bg,
                                            border: `1px solid ${alpha(MODEL_COLORS[m.model].bg, 30)}`,
                                            textTransform: 'capitalize',
                                        }}>
                                            {m.model}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: m.diameter !== null ? V.accent : V.textSecondary }}>
                                        {m.diameter !== null ? `⌀ ${m.diameter}` : '—'}
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: m.length !== null ? V.accent : V.textSecondary }}>
                                        {m.length !== null ? `${m.length}` : '—'}
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: V.textSecondary }}>
                                        {m.width_mm}×{m.height_mm}
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: V.success }}>
                                        {(m.confidence * 100).toFixed(1)}%
                                    </td>
                                    <td style={{ padding: '10px 14px' }}><PassFailBadge pass={m.pass} /></td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
            {measurements.length === 0 && (
                // [CHANGE] Empty state: constrained height to avoid the dashed box
                // expanding to fill the full panel (was h-full before).
                <div style={{
                    padding: '32px 0', textAlign: 'center',
                    minHeight: 200, maxHeight: 280,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    border: `2px dashed ${V.border}`, borderRadius: 12, margin: '12px',
                }}>
                    <span className="material-icons-round" style={{ fontSize: 40, color: alpha(V.textSecondary, 40), marginBottom: 8 }}>find_in_page</span>
                    <p style={{ fontSize: 12, color: V.textSecondary, margin: 0 }}>No measurements yet. Run inference to see results.</p>
                </div>
            )}
        </Card>
    );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────

function AnalyticsPanel({ measurements, output }: { measurements: DimensionalMeasurement[]; output: MeasurementOutput | null }) {
    const total = output?.summary.totalObjects ?? measurements.length;
    const pass = output?.summary.passCount ?? measurements.filter(m => m.pass).length;
    const fail = output?.summary.failCount ?? measurements.filter(m => !m.pass).length;
    const circles = output?.summary.circleFeatures ?? measurements.filter(m => m.model === 'circle').length;
    const lines = output?.summary.lineFeatures ?? measurements.filter(m => m.model === 'line').length;
    const avgConf = measurements.length
        ? (measurements.reduce((s, m) => s + m.confidence, 0) / measurements.length * 100).toFixed(1)
        : '0.0';
    const yld = total > 0 ? ((pass / total) * 100).toFixed(1) : '0.0';

    const bars = [
        { label: 'Pass', value: total > 0 ? (pass / total) * 100 : 0, color: V.success, count: pass },
        { label: 'Fail', value: total > 0 ? (fail / total) * 100 : 0, color: V.error, count: fail },
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
                // [CHANGE] KPI cards: muted label at top, large coloured number below —
                // proper metric card hierarchy. Label colour is textSecondary so the
                // number's accent colour stands out on its own.
                { label: 'Yield rate', value: yld, unit: '%', color: V.success },
                { label: 'Total objects', value: String(total), unit: undefined, color: undefined },
                { label: 'Avg confidence', value: avgConf, unit: '%', color: V.info },
                { label: 'Circle / line', value: `${circles} / ${lines}`, unit: undefined, color: V.accent },
            ].map(k => (
                <Card key={k.label} style={{ padding: 18 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: V.textSecondary, letterSpacing: '0.04em', margin: '0 0 8px' }}>
                        {k.label}
                    </p>
                    <MonoValue value={k.value} unit={k.unit} color={k.color} />
                </Card>
            ))}

            <Card style={{ padding: 18, gridColumn: '1 / -1' }}>
                <SectionLabel>Outcome distribution</SectionLabel>
                <div style={{ display: 'flex', gap: 4, height: 20, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                    {bars.map(b => (
                        <motion.div
                            key={b.label}
                            initial={{ width: 0 }}
                            animate={{ width: `${b.value}%` }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            style={{ background: b.color, height: '100%', minWidth: b.value > 0 ? 4 : 0 }}
                        />
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                    {bars.map(b => (
                        <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                            <span style={{ fontSize: 10, fontFamily: 'monospace', color: V.textSecondary }}>
                                {b.label}: <strong style={{ color: b.color }}>{b.count}</strong>
                            </span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DemoPage() {
    // ── Input & navigation ──
    const [step, setStep] = useState<StepId>('select');
    const [inputMode, setInputMode] = useState<InputMode>('webcam');
    const [pxPerMm, setPxPerMm] = useState(4.0);

    // ── Camera ──
    const camera = useCameraStream();

    // ── Upload ──
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Inference state ──
    const [running, setRunning] = useState(false);
    const [inferring, setInferring] = useState(false);
    const [inferError, setInferError] = useState<string | null>(null);
    const [inferenceMs, setInferenceMs] = useState(0);
    const [inspectionId, setInspectionId] = useState<string | null>(null);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [sessionName] = useState(() => `demo-${Math.floor(Date.now() / 10000).toString(16).slice(-6)}`);

    // ── Detection results ──
    const [taggedDetections, setTaggedDetections] = useState<TaggedDetection[]>([]);
    const [circleCount, setCircleCount] = useState(0);
    const [lineCount, setLineCount] = useState(0);
    const [measurementOutput, setMeasurementOutput] = useState<MeasurementOutput | null>(null);
    const [history, setHistory] = useState<DimensionalMeasurement[]>([]);

    // ── Refs ──
    const inferenceLoopRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const consecutiveErrors = useRef(0);
    const elapsed = useSessionTimer(running);
    const stepIdx = STEPS.findIndex(s => s.id === step);
    const totalDetected = history.length;

    const videoRef = useRef<HTMLVideoElement>(null);
    const attachStream = useCallback(
        (el: HTMLVideoElement | null) => {
            videoRef.current = el;
            camera.videoRef.current = el;
            if (el && camera.stream && camera.source === 'webcam') el.srcObject = camera.stream;
        },
        [camera.stream, camera.source, camera.videoRef],
    );

    useEffect(() => { return () => { clearInterval(inferenceLoopRef.current); }; }, []);

    const parseElapsedSeconds = useCallback((value: string) => {
        const [m, s] = value.split(':').map(Number);
        return (Number.isFinite(m) ? m : 0) * 60 + (Number.isFinite(s) ? s : 0);
    }, []);

    const mapMeasurementsForPersistence = useCallback(
        (measurements: DimensionalMeasurement[]) =>
            measurements.map((m) => ({
                object_id: m.object_id,
                detection_class: m.detection_class,
                model: m.model,
                confidence: m.confidence,
                bbox: {
                    x: m.bbox.x,
                    y: m.bbox.y,
                    w: m.bbox.width,
                    h: m.bbox.height,
                },
                diameter: m.diameter,
                length: m.length,
                unit: 'mm',
                pass: m.pass,
                status: m.pass ? 'pass' : 'fail',
                type: m.model === 'circle' ? 'pipe' : 'rod',
                batch: sessionName,
            })),
        [sessionName],
    );

    const ensureInspectionRecord = useCallback(async () => {
        if (inspectionId) return inspectionId;
        const created = await inspectionService.create({
            session_name: sessionName,
            batch_id: sessionName,
            camera_id: camera.source === 'esp32' ? 'esp32-cam' : 'webcam',
            total_objects: 0,
            pass_count: 0,
            fail_count: 0,
            duration: 0,
            completed_at: null,
        });
        setInspectionId(created.id);
        return created.id;
    }, [inspectionId, sessionName, camera.source]);

    const finalizeInspection = useCallback(async (measurements?: DimensionalMeasurement[]) => {
        if (!inspectionId || isFinalizing) return;
        const rows = measurements ?? history;
        const payload = mapMeasurementsForPersistence(rows);

        setIsFinalizing(true);
        try {
            await inspectionService.finalize(inspectionId, {
                results: payload,
                duration: parseElapsedSeconds(elapsed),
            });
        } catch (err) {
            console.error('Failed to finalize inspection:', err);
        } finally {
            setIsFinalizing(false);
            setInspectionId(null);
        }
    }, [inspectionId, isFinalizing, history, mapMeasurementsForPersistence, parseElapsedSeconds, elapsed]);

    // ── Dual-model inference ──
    const runDualInference = useCallback(async (frame: string): Promise<DimensionalMeasurement[]> => {
        setInferring(true);
        setInferError(null);
        const t0 = performance.now();
        try {
            const result: DualDetectionResult = await inferenceService.detectDual(frame, pxPerMm);
            consecutiveErrors.current = 0;
            setInferenceMs(Math.round(performance.now() - t0));
            setTaggedDetections(result.detections);
            setCircleCount(result.circleCount);
            setLineCount(result.lineCount);
            if (result.measurements) {
                setMeasurementOutput(result.measurements);
                setHistory(prev => [...prev, ...result.measurements.measurements]);
                return result.measurements.measurements;
            }
            return [];
        } catch (err) {
            consecutiveErrors.current += 1;
            // [CHANGE] Technical detail logged to console; operators never see
            // port numbers or raw error strings.
            console.error('Inference error:', err);
            const msg = err instanceof Error ? err.message : 'Inference failed';
            const isNetwork = msg.includes('fetch') || msg.includes('Network');
            const userMsg = isNetwork
                ? 'Detection service is unavailable. Check your connection.'
                : 'Detection failed. Please try again.';

            if (consecutiveErrors.current >= 3) {
                clearInterval(inferenceLoopRef.current);
                inferenceLoopRef.current = undefined;
                setRunning(false);
                setInferError('Inference stopped after repeated failures. Reconnect and try again.');
            } else {
                setInferError(userMsg);
            }
            return [];
        } finally {
            setInferring(false);
        }
    }, [pxPerMm]);

    // ── Start webcam inference loop ──
    const handleStartInspection = useCallback(async () => {
        await ensureInspectionRecord();
        setRunning(true);
        setHistory([]);
        inferenceLoopRef.current = setInterval(async () => {
            const frame = await camera.captureAsync();
            if (frame) await runDualInference(frame);
        }, 2000);
    }, [camera, runDualInference, ensureInspectionRecord]);

    // ── Stop inference ──
    const handleStopInspection = useCallback(async () => {
        clearInterval(inferenceLoopRef.current);
        inferenceLoopRef.current = undefined;
        setRunning(false);
        await finalizeInspection();
    }, [finalizeInspection]);

    // ── Run single inference on uploaded image ──
    const handleUploadInference = useCallback(async () => {
        if (!uploadedImage) return;
        const id = await ensureInspectionRecord();
        setRunning(true);
        setHistory([]);
        const measurements = await runDualInference(uploadedImage);
        setRunning(false);
        if (id) await finalizeInspection(measurements);
    }, [uploadedImage, runDualInference, ensureInspectionRecord, finalizeInspection]);

    // ── File upload handler ──
    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onloadend = () => setUploadedImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    // ── Reset ──
    const handleReset = useCallback(() => {
        void handleStopInspection();
        camera.stop();
        setTaggedDetections([]);
        setCircleCount(0);
        setLineCount(0);
        setMeasurementOutput(null);
        setHistory([]);
        setInferError(null);
        setUploadedImage(null);
        setInferenceMs(0);
        setStep('select');
    }, [handleStopInspection, camera]);

    // ── Step navigation ──
    const goNext = useCallback(() => {
        const next = STEPS[stepIdx + 1];
        if (!next) return;
        setStep(next.id);
        if (next.id === 'detect') {
            if (inputMode !== 'upload' && camera.isStreaming && !running) handleStartInspection();
            else if (inputMode === 'upload' && uploadedImage && !running) handleUploadInference();
        }
    }, [stepIdx, inputMode, camera.isStreaming, uploadedImage, running, handleStartInspection, handleUploadInference]);

    const goPrev = useCallback(() => {
        const prev = STEPS[stepIdx - 1];
        if (!prev) return;
        if (running) void handleStopInspection();
        setStep(prev.id);
    }, [stepIdx, running, handleStopInspection]);

    // ── Switch input mode ──
    const switchInputMode = (mode: InputMode) => {
        if (running) void handleStopInspection();
        if (camera.isStreaming) camera.stop();
        camera.switchSource(mode === 'upload' ? 'upload' : mode);
        setInputMode(mode);
        setUploadedImage(null);
        setTaggedDetections([]);
        setMeasurementOutput(null);
        setHistory([]);
        setInferError(null);
    };

    // ── Shared viewport props ──
    const viewportProps = {
        inputMode,
        cameraSource: camera.source,
        isCameraStreaming: camera.isStreaming,
        esp32Url: camera.esp32Url,
        uploadedImage,
        attachStream,
        imgRef: camera.imgRef,
        taggedDetections,
        measurementOutput,
        running,
        inferring,
        inferError,
        circleCount,
        lineCount,
        elapsed,
    };

    return (
        <div className="bg-sys-bg-primary text-sys-text-primary" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <CursorGlow />

            {/* Ambient glows */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '45%', height: '45%', borderRadius: '50%', background: `radial-gradient(circle, ${alpha(V.accent, 6)} 0%, transparent 70%)`, filter: 'blur(60px)' }} />
                <div style={{ position: 'absolute', top: '20%', right: '-5%', width: '35%', height: '35%', borderRadius: '50%', background: `radial-gradient(circle, ${alpha(V.info, 5)} 0%, transparent 70%)`, filter: 'blur(60px)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: '25%', width: '30%', height: '25%', borderRadius: '50%', background: `radial-gradient(circle, ${alpha(V.accent, 4)} 0%, transparent 70%)`, filter: 'blur(80px)' }} />
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.2,
                    backgroundImage: `radial-gradient(circle, ${alpha(V.textSecondary, 20)} 1px, transparent 1px)`,
                    backgroundSize: '22px 22px',
                }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '28px 24px 48px' }}>

                {/* ══ Header ══ */}
                <motion.header
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    style={{ marginBottom: 28 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div className="hp-hero__badge" style={{ marginBottom: 0 }}>
                            <PulseDot color={V.accent} size={7} />
                            Live demo
                        </div>
                        <div style={{ width: 1, height: 16, background: V.border }} />
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: V.textSecondary }}>
                            Session: {sessionName}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
                        <div>
                            <p style={{ margin: 0, color: V.textSecondary, fontWeight: 600, fontSize: 15 }}>
                                Sub-millimeter automated quality control — try it live with your webcam or an uploaded image.
                            </p>
                        </div>
                        {/* [CHANGE] Step indicator moved here from inside the header pill —
                            it's compact text, not a dominant pill stepper. */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            <p style={{ margin: 0, fontSize: 12, color: V.textSecondary, fontWeight: 500 }}>
                                Step {stepIdx + 1} of {STEPS.length} — {STEPS[stepIdx].label}
                            </p>
                            <StepIndicator active={step} onStep={setStep} />
                        </div>
                    </div>
                </motion.header>

                {/* ══ Main grid ══ */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,280px) 1fr', gap: 20, alignItems: 'start' }}>

                    {/* ── Sidebar ── */}
                    <motion.aside
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                    >
                        {/* Input mode toggle */}
                        <div style={{
                            display: 'flex', gap: 4, padding: 4,
                            background: V.bgSecondary, backdropFilter: 'blur(10px)',
                            border: `1px solid ${V.border}`, borderRadius: 12,
                        }}>
                            {(['webcam', 'esp32', 'upload'] as InputMode[]).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => switchInputMode(mode)}
                                    style={{
                                        flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none',
                                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                        transition: 'all 0.2s',
                                        background: inputMode === mode ? V.bgTertiary : 'transparent',
                                        color: inputMode === mode ? V.textPrimary : V.textSecondary,
                                        boxShadow: inputMode === mode ? '0 1px 6px rgba(0,0,0,0.15)' : 'none',
                                        // [CHANGE] focus-visible ring for keyboard operability
                                        outline: 'none',
                                    }}
                                // [CHANGE] Added focus-visible styles via onFocus / CSS (can also be global CSS)
                                >
                                    {mode === 'webcam' ? 'Webcam' : mode === 'esp32' ? 'ESP32-CAM' : 'Upload image'}
                                </button>
                            ))}
                        </div>

                        {/* Camera controls — unified panel with dividers */}
                        {/* [CHANGE] Camera / Calibration / Status are now one unified panel
                            with internal dividers instead of 3 disconnected cards. */}
                        <Card style={{ overflow: 'hidden', padding: 0 }}>
                            {/* Camera section */}
                            <div style={{ padding: 18, borderBottom: `1px solid ${V.border}` }}>
                                <SectionLabel>{inputMode === 'upload' ? 'Image upload' : 'Camera'}</SectionLabel>

                                {inputMode !== 'upload' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 11, color: V.textSecondary }}>Status</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: camera.isStreaming ? V.success : V.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {camera.isStreaming && <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.success, display: 'inline-block' }} />}
                                                {camera.isStreaming ? 'Connected' : 'Disconnected'}
                                            </span>
                                        </div>
                                        {camera.error && (
                                            <p style={{ fontSize: 10, color: V.error, margin: 0 }}>{camera.error}</p>
                                        )}
                                        {inputMode === 'esp32' && camera.probeMessage && (
                                            <p style={{ fontSize: 10, color: V.success, margin: 0 }}>{camera.probeMessage}</p>
                                        )}
                                        {/* [CHANGE] Connect button uses accent colour — it is the
                                            required next step, not a tertiary utility action. */}
                                        <button
                                            onClick={() => camera.isStreaming
                                                ? camera.stop()
                                                : inputMode === 'webcam'
                                                    ? camera.start({ video: { width: 1280, height: 720 } })
                                                    : camera.start()}
                                            style={{
                                                padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                                cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                                                background: camera.isStreaming ? alpha(V.error, 15) : V.accent,
                                                color: camera.isStreaming ? V.error : '#fff',
                                            }}
                                        >
                                            {camera.isStreaming
                                                ? 'Disconnect'
                                                : inputMode === 'esp32'
                                                    ? 'Connect ESP32-CAM'
                                                    : 'Connect webcam'}
                                        </button>
                                        {inputMode === 'esp32' && (
                                            <button
                                                onClick={() => void camera.probeEsp32()}
                                                disabled={camera.isProbing}
                                                style={{
                                                    padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                                    cursor: camera.isProbing ? 'not-allowed' : 'pointer',
                                                    border: `1px solid ${alpha(V.info, 45)}`,
                                                    transition: 'all 0.2s',
                                                    background: alpha(V.info, 10),
                                                    color: V.info,
                                                    opacity: camera.isProbing ? 0.65 : 1,
                                                }}
                                            >
                                                {camera.isProbing ? 'Testing ESP32-CAM...' : 'Test Camera'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {inputMode === 'upload' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                padding: '14px', borderRadius: 10,
                                                border: `2px dashed ${uploadedImage ? alpha(V.success, 40) : V.border}`,
                                                background: uploadedImage ? alpha(V.success, 5) : alpha(V.textPrimary, 3),
                                                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', gap: 6, transition: 'all 0.2s',
                                            }}
                                        >
                                            <span className="material-icons-round" style={{ fontSize: 24, color: uploadedImage ? V.success : V.textSecondary }}>
                                                {uploadedImage ? 'check_circle' : 'cloud_upload'}
                                            </span>
                                            <span style={{ fontSize: 10, fontWeight: 600, color: uploadedImage ? V.success : V.textSecondary }}>
                                                {uploadedImage ? 'Image loaded · click to change' : 'Click to upload image'}
                                            </span>
                                        </button>
                                        {uploadedImage && (
                                            <img src={uploadedImage} alt="Preview" style={{ width: '100%', borderRadius: 8, border: `1px solid ${V.border}`, maxHeight: 150, objectFit: 'contain' }} />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Calibration section */}
                            <div style={{ padding: 18, borderBottom: `1px solid ${V.border}` }}>
                                <SectionLabel>Calibration</SectionLabel>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: V.textSecondary }}>Pixels per mm</span>
                                        {/* [CHANGE] Value uses textPrimary monospace — accent colour
                                            was unnecessary for a display-only readout. */}
                                        <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: V.textPrimary }}>{pxPerMm} px/mm</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input
                                            type="range" min={0.5} max={20} step={0.1} value={pxPerMm}
                                            onChange={e => setPxPerMm(Number(e.target.value))}
                                            style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--sys-accent)' }}
                                        />
                                        <input
                                            type="number" min={0.1} step={0.1} value={pxPerMm}
                                            onChange={e => { const v = Number(e.target.value); if (v > 0) setPxPerMm(v); }}
                                            style={{
                                                width: 52, padding: '4px 6px', borderRadius: 6, textAlign: 'center',
                                                border: `1px solid ${V.border}`, background: V.bgTertiary,
                                                color: V.textPrimary, fontFamily: 'monospace', fontSize: 11, outline: 'none',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Detection info section */}
                            <div style={{ padding: 18 }}>
                                <SectionLabel>Detection info</SectionLabel>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[
                                        { label: 'Status', value: running ? 'Active' : 'Idle', color: running ? V.success : V.textSecondary, dot: running },
                                        { label: 'Circle', value: String(circleCount), color: MODEL_COLORS.circle.bg, dot: false },
                                        { label: 'Line', value: String(lineCount), color: MODEL_COLORS.line.bg, dot: false },
                                        { label: 'Inference', value: inferenceMs > 0 ? `${inferenceMs}ms` : '—', color: V.info, dot: false },
                                        { label: 'Total', value: `${totalDetected} objects`, color: V.textPrimary, dot: false },
                                    ].map(s => (
                                        <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, color: V.textSecondary }}>{s.label}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: s.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {s.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.success, display: 'inline-block' }} />}
                                                {s.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </motion.aside>

                    {/* ── Right panel ── */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                            >

                                {/* SELECT */}
                                {step === 'select' && (
                                    <>
                                        <Card style={{ padding: 24 }}>
                                            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <p className="hp-hero__badge" style={{ display: 'inline-flex', marginBottom: 8 }}>
                                                        Step 1 · Configure input
                                                    </p>
                                                    <h2 style={{ fontSize: 22, fontWeight: 900, color: V.textPrimary, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
                                                        Set up your inspection
                                                    </h2>
                                                    <p style={{ fontSize: 13, color: V.textSecondary, lineHeight: 1.65, maxWidth: 460, margin: 0 }}>
                                                        {inputMode === 'upload'
                                                            ? 'Upload an image to run AI inference. Spectra will detect objects and provide dimensional measurements using dual YOLO models.'
                                                            : inputMode === 'esp32'
                                                                ? 'Connect your ESP32-CAM stream for live inference. Spectra runs dual AI models (circle + line detection) with dimensional measurements in real time.'
                                                                : 'Connect your webcam to stream live video. Spectra runs dual AI models (circle + line detection) with dimensional measurements in real time.'}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                                                    <div style={{
                                                        width: 72, height: 72, borderRadius: 16,
                                                        background: `linear-gradient(135deg, ${alpha(V.accent, 20)}, ${alpha(V.info, 20)})`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        margin: '0 auto 8px', boxShadow: `0 0 24px ${alpha(V.accent, 15)}`,
                                                    }}>
                                                        <span className="material-icons-round" style={{ fontSize: 32, color: V.accent }}>
                                                            {inputMode === 'upload' ? 'image' : inputMode === 'esp32' ? 'sensors' : 'videocam'}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: 11, fontWeight: 700, color: V.textPrimary, margin: '0 0 2px' }}>
                                                        {inputMode === 'upload' ? 'Image upload' : inputMode === 'esp32' ? 'ESP32-CAM' : 'Webcam'}
                                                    </p>
                                                    <p style={{ fontSize: 9, color: V.textSecondary, fontFamily: 'monospace', margin: 0 }}>
                                                        {pxPerMm} px/mm
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                                            {[
                                                {
                                                    label: 'Input',
                                                    value: inputMode === 'upload' ? 'Upload' : inputMode === 'esp32' ? 'ESP32-CAM' : 'Webcam',
                                                    icon: inputMode === 'upload' ? 'cloud_upload' : inputMode === 'esp32' ? 'sensors' : 'videocam',
                                                },
                                                { label: 'Models', value: 'Circle + Line', icon: 'model_training' },
                                                { label: 'Calibration', value: `${pxPerMm} px/mm`, icon: 'straighten' },
                                                { label: 'Ready', value: inputMode === 'upload' ? (uploadedImage ? 'Yes' : 'No') : (camera.isStreaming ? 'Yes' : 'No'), icon: 'verified' },
                                            ].map(c => (
                                                <Card key={c.label} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span className="material-icons-round" style={{ color: V.accent, fontSize: '1.15rem' }}>{c.icon}</span>
                                                    <div>
                                                        <p style={{ fontSize: 9, color: V.textSecondary, margin: '0 0 2px' }}>{c.label}</p>
                                                        <p style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: V.textPrimary, margin: 0 }}>{c.value}</p>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* DETECT */}
                                {step === 'detect' && (
                                    <>
                                        <LiveViewport {...viewportProps} />
                                        {/* [CHANGE] Compact info bar so the operator retains
                                            session context (source · calibration · counts)
                                            during active inspection. */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 16px', borderRadius: 12,
                                            border: `1px solid ${V.border}`, background: V.bgSecondary,
                                            fontSize: 12, color: V.textSecondary,
                                        }}>
                                            <span style={{ fontWeight: 600, color: V.textPrimary }}>
                                                {inputMode === 'upload' ? 'Upload' : inputMode === 'esp32' ? 'ESP32-CAM' : 'Webcam'} · {pxPerMm.toFixed(1)} px/mm
                                            </span>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: V.textPrimary }}>{elapsed}</span>
                                            <span>Circles: {circleCount} · Lines: {lineCount}</span>
                                        </div>
                                    </>
                                )}

                                {/* MEASURE */}
                                {step === 'measure' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <LiveViewport {...viewportProps} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {/* [CHANGE] KPI cards: muted label top, large number below */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                {[
                                                    { label: 'Objects', val: String(measurementOutput?.summary.totalObjects ?? 0), unit: undefined, color: undefined },
                                                    { label: 'Pass', val: String(measurementOutput?.summary.passCount ?? 0), unit: undefined, color: V.success },
                                                    { label: 'Fail', val: String(measurementOutput?.summary.failCount ?? 0), unit: undefined, color: V.error },
                                                    { label: 'Inference', val: String(inferenceMs), unit: 'ms', color: V.info },
                                                ].map(k => (
                                                    <Card key={k.label} style={{ padding: 16 }}>
                                                        <p style={{ fontSize: 11, fontWeight: 600, color: V.textSecondary, margin: '0 0 6px' }}>{k.label}</p>
                                                        <MonoValue value={k.val} unit={k.unit} color={k.color} />
                                                    </Card>
                                                ))}
                                            </div>

                                            {/* Measurement cards */}
                                            <Card style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                                                    <SectionLabel>Measurements</SectionLabel>
                                                </div>
                                                <div style={{ overflowY: 'auto', maxHeight: 260, padding: '8px 12px' }}>
                                                    {measurementOutput?.measurements.length ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            {measurementOutput.measurements.map(m => {
                                                                const colors = MODEL_COLORS[m.model];
                                                                return (
                                                                    <div key={m.object_id} style={{
                                                                        borderRadius: 10, padding: '10px 12px',
                                                                        background: alpha(V.textPrimary, 3),
                                                                        border: `1px solid ${alpha(colors.border, 30)}`,
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors.bg }} />
                                                                                <span style={{ fontSize: 11, fontWeight: 700, color: V.textPrimary }}>
                                                                                    #{m.object_id} {m.detection_class}
                                                                                </span>
                                                                                <span style={{
                                                                                    fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                                                                    background: alpha(colors.bg, 15), color: colors.bg,
                                                                                    textTransform: 'capitalize',
                                                                                }}>
                                                                                    {m.model}
                                                                                </span>
                                                                            </div>
                                                                            <PassFailBadge pass={m.pass} />
                                                                        </div>
                                                                        {/* [CHANGE] Inner cell borders removed — card's left accent
                                                                            identifies the model; inner borders created clutter. */}
                                                                        <div style={{ display: 'flex', gap: 12, fontSize: 10, fontFamily: 'monospace', color: V.textSecondary }}>
                                                                            {m.diameter !== null && <span style={{ color: V.accent, fontWeight: 700 }}>⌀{m.diameter}mm</span>}
                                                                            {m.length !== null && <span style={{ color: V.accent, fontWeight: 700 }}>L{m.length}mm</span>}
                                                                            <span>{m.width_mm}×{m.height_mm}mm</span>
                                                                            <span>{(m.confidence * 100).toFixed(1)}%</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p style={{ fontSize: 11, color: V.textSecondary, textAlign: 'center', padding: 20 }}>
                                                            {inferring ? 'Processing…' : 'No measurements yet'}
                                                        </p>
                                                    )}
                                                </div>
                                            </Card>
                                        </div>
                                    </div>
                                )}

                                {/* RESULTS */}
                                {step === 'results' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <AnalyticsPanel measurements={history} output={measurementOutput} />
                                        <ResultsTable measurements={history} />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* ── Footer action bar ── */}
                        <Card style={{
                            padding: '16px 22px', display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
                        }}>
                            <div style={{ display: 'flex', gap: 24 }}>
                                {[
                                    { label: 'Mode', val: inputMode === 'upload' ? 'Upload' : inputMode === 'esp32' ? 'ESP32-CAM' : 'Webcam', color: V.textPrimary, dot: false },
                                    { label: 'Status', val: running ? 'Active' : 'Idle', color: running ? V.success : V.textSecondary, dot: running },
                                    { label: 'Detected', val: `${totalDetected} objects`, color: V.success, dot: false },
                                ].map(s => (
                                    <div key={s.label}>
                                        <p style={{ fontSize: 9, fontWeight: 700, color: V.textSecondary, margin: '0 0 3px' }}>{s.label}</p>
                                        <p style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: s.color, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {s.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.success, display: 'inline-block' }} />}
                                            {s.val}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                {stepIdx > 0 && (
                                    <button
                                        onClick={goPrev}
                                        className="hp-btn hp-btn--ghost"
                                        style={{ padding: '8px 18px', fontSize: 11, fontWeight: 600 }}
                                    >
                                        ← Back
                                    </button>
                                )}

                                {/* Pause / Resume — live camera modes */}
                                {inputMode !== 'upload' && step !== 'select' && step !== 'results' && (
                                    <button
                                        onClick={() => running ? handleStopInspection() : handleStartInspection()}
                                        disabled={!camera.isStreaming}
                                        style={{
                                            padding: '8px 18px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                                            cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                                            background: running ? alpha(V.error, 15) : alpha(V.textPrimary, 6),
                                            color: running ? V.error : V.textSecondary,
                                            opacity: camera.isStreaming ? 1 : 0.4,
                                        }}
                                    >
                                        {running ? '⏸ Pause' : '▶ Resume'}
                                    </button>
                                )}

                                {/* Run inference — upload only */}
                                {inputMode === 'upload' && step !== 'select' && step !== 'results' && !running && (
                                    <button
                                        onClick={handleUploadInference}
                                        disabled={!uploadedImage}
                                        style={{
                                            padding: '8px 18px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                                            cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                                            background: alpha(V.accent, 15), color: V.accent,
                                            opacity: uploadedImage ? 1 : 0.4,
                                        }}
                                    >
                                        ▶ Run inference
                                    </button>
                                )}

                                <button
                                    onClick={handleReset}
                                    className="hp-btn hp-btn--ghost"
                                    style={{ padding: '8px 18px', fontSize: 11, fontWeight: 600 }}
                                >
                                    Reset
                                </button>

                                {stepIdx < STEPS.length - 1 ? (
                                    <motion.button
                                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                        onClick={goNext}
                                        className="hp-btn hp-btn--primary hp-glow-pulse"
                                        style={{ padding: '8px 22px', fontSize: 11, fontWeight: 600 }}
                                    >
                                        {step === 'select' ? 'Start detection →' : step === 'detect' ? 'Measure →' : 'View results →'}
                                    </motion.button>
                                ) : (
                                    // [CHANGE] "New inspection" uses accent/success gradient to
                                    // signal it as the primary next-step CTA — not a reset action.
                                    <motion.button
                                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                        onClick={handleReset}
                                        style={{
                                            padding: '8px 22px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                                            cursor: 'pointer', border: 'none',
                                            background: `linear-gradient(135deg, ${V.success}, color-mix(in srgb, var(--sys-success) 70%, black))`,
                                            color: '#fff',
                                            boxShadow: `0 4px 20px ${alpha(V.success, 30)}`,
                                        }}
                                    >
                                        ↺ New inspection
                                    </motion.button>
                                )}
                            </div>
                        </Card>
                    </motion.section>
                </div>
            </div>

            {/* Bottom accent bar */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${V.accent}, ${V.info}, ${V.accent})`, opacity: 0.3,
            }} />

            {/* Keyframes for the spinner animation */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                button:focus-visible {
                    outline: 2px solid var(--sys-accent);
                    outline-offset: 3px;
                }
            `}</style>
        </div>
    );
}
