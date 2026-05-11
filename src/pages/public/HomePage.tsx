// src/pages/HomePage.tsx
import { useRef, useState, useEffect, useCallback } from 'react';
import {
    motion,
    useScroll,
    useTransform,
    useInView,
    AnimatePresence,
    useMotionValue,
    useSpring,
} from 'framer-motion';
import inspectorInterfaceImage from '../../assets/images/image.png';

// ─── Framer Motion Variants ───────────────────────────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
    }),
};

const fadeIn = {
    hidden: { opacity: 0 },
    visible: (delay = 0) => ({
        opacity: 1,
        transition: { duration: 0.5, ease: 'easeOut', delay },
    }),
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.88 },
    visible: (delay = 0) => ({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
    }),
};

// ─── [6] Character + Word Reveal Variants ────────────────────────────────────
// Granular stagger: each char/word animates with blur cinematic reveal
const titleStagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.026, delayChildren: 0.05 } },
};

const charReveal = {
    hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
    visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
};

const wordReveal = {
    hidden: { opacity: 0, y: 14, filter: 'blur(5px)' },
    visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
};

// ─── Animated Section Wrapper ─────────────────────────────────────────────────

function AnimatedSection({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-80px' });
    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ─── Magnetic Button ──────────────────────────────────────────────────────────

function MagneticBtn({
    children,
    className = '',
    onClick,
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}) {
    const ref = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 200, damping: 18 });
    const sy = useSpring(y, { stiffness: 200, damping: 18 });

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = ref.current!.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        x.set((e.clientX - cx) * 0.3);
        y.set((e.clientY - cy) * 0.3);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.button
            ref={ref}
            style={{ x: sx, y: sy }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={className}
        >
            {children}
        </motion.button>
    );
}

// ─── [1] Parallax-Aware Floating Orb ─────────────────────────────────────────
// Outer div carries the scroll-linked parallaxY MotionValue.
// Inner div runs the independent floating keyframe animation.
// By separating them the two transforms compose cleanly without conflict.

function FloatingOrb({
    style,
    delay = 0,
    parallaxY,
}: {
    style: React.CSSProperties;
    delay?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parallaxY?: any; // MotionValue<number> – typed loosely to avoid import overhead
}) {
    const {
        top, left, right, bottom, width, height,
        background, filter,
    } = style as Record<string, string>;

    return (
        <motion.div
            style={{
                position: 'absolute',
                top, left, right, bottom,
                width, height,
                y: parallaxY,          // scroll-linked parallax depth
                pointerEvents: 'none',
                zIndex: 0,
            }}
        >
            <motion.div
                style={{ width: '100%', height: '100%', borderRadius: '9999px', background, filter }}
                // float animation runs independently of scroll
                animate={{ y: [0, -24, 0], scale: [1, 1.07, 1] }}
                transition={{
                    duration: 7 + delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay,
                }}
            />
        </motion.div>
    );
}

// ─── [4] Granular Text Reveal – Split into Characters ────────────────────────
// Each character slides up from y:20 while blurring in (blur-sm → blur-none).
// Receives the parent's `titleStagger` propagated variant state automatically.

function SplitChars({ text }: { text: string }) {
    return (
        <>
            {text.split('').map((char, i) => (
                <motion.span
                    key={i}
                    variants={charReveal}
                    style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
                >
                    {char === ' ' ? '\u00A0' : char}
                </motion.span>
            ))}
        </>
    );
}

// Word-level variant for the gradient line (preserves background-clip: text)
function SplitWords({
    text,
    className = '',
}: {
    text: string;
    className?: string;
}) {
    return (
        <span className={className} style={{ display: 'inline' }}>
            {text.split(' ').map((word, i) => (
                <motion.span
                    key={i}
                    variants={wordReveal}
                    style={{ display: 'inline-block', marginRight: '0.28em' }}
                >
                    {word}
                </motion.span>
            ))}
        </span>
    );
}

// ─── [3] 3D Tilt Card (per-card hook state) ──────────────────────────────────
// A self-contained capability card that tracks mouse position relative to its
// own bounding box and applies rotateX / rotateY via spring MotionValues.
// Wrapping the hp-cap-card in a motion.div lets us keep variant propagation.

function CapCard({
    cap,
    index,
}: {
    cap: {
        icon: string;
        title: string;
        desc: string;
        tags: string[];
    };
    index: number;
}) {
    const ref = useRef<HTMLDivElement>(null);

    const rxBase = useMotionValue(0);
    const ryBase = useMotionValue(0);
    const rotateX = useSpring(rxBase, { stiffness: 300, damping: 28 });
    const rotateY = useSpring(ryBase, { stiffness: 300, damping: 28 });

    const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        ryBase.set(dx * 5);   // ±5° horizontal tilt
        rxBase.set(-dy * 5);  // ±5° vertical tilt
    }, [rxBase, ryBase]);

    const handleLeave = useCallback(() => {
        rxBase.set(0);
        ryBase.set(0);
    }, [rxBase, ryBase]);

    return (
        <motion.div
            ref={ref}
            variants={fadeUp}
            custom={index * 0.07}
            className="hp-cap-card"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
                perspective: 800,
                willChange: 'transform',
            }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.25 }}
        >
            <div className="hp-cap-card__icon-wrap">
                <span className="material-icons-round hp-cap-card__icon">{cap.icon}</span>
            </div>
            <h3 className="hp-cap-card__title">{cap.title}</h3>
            <p className="hp-cap-card__desc">{cap.desc}</p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {cap.tags.map((tag) => (
                    <span
                        key={tag}
                        style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            background: 'color-mix(in srgb, var(--sys-accent) 10%, transparent)',
                            color: 'var(--sys-accent)',
                            border: '1px solid color-mix(in srgb, var(--sys-accent) 20%, transparent)',
                            letterSpacing: '0.06em',
                        }}
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </motion.div>
    );
}

// ─── [7] Number Scrambler / Ticker ───────────────────────────────────────────
// Phase 1 (0–300 ms): displays random digit noise at the target digit-count.
// Phase 2 (300 ms–1700 ms): cubic-ease count from 0 → final value.
// tabular-nums keeps width stable during the scramble phase.

const SCRAMBLE_CHARS = '0123456789';
const SCRAMBLE_MS = 300;
const COUNT_MS = 1400;

function AnimatedCounter({ to, suffix = '' }: { to: number; suffix?: string }) {
    const [display, setDisplay] = useState('0');
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });
    const rafRef = useRef<number>(0);

    useEffect(() => {
        if (!inView) return;

        const targetStr = String(Math.floor(to));
        const digitCount = targetStr.length;
        const startTime = performance.now();

        const tick = (now: number) => {
            const elapsed = now - startTime;

            if (elapsed < SCRAMBLE_MS) {
                // ── scramble phase: random characters ──
                const noise = Array.from({ length: digitCount }, () =>
                    SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
                ).join('');
                setDisplay(noise);
                rafRef.current = requestAnimationFrame(tick);
            } else {
                // ── count phase: cubic-ease to final value ──
                const countElapsed = elapsed - SCRAMBLE_MS;
                const progress = Math.min(countElapsed / COUNT_MS, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(eased * to);
                setDisplay(String(current));
                if (progress < 1) {
                    rafRef.current = requestAnimationFrame(tick);
                } else {
                    // Snap to exact final value in case of float rounding
                    setDisplay(String(to));
                }
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(rafRef.current);
            setDisplay('0');
        };
    }, [inView, to]);

    return (
        <span
            ref={ref}
            style={{
                fontVariantNumeric: 'tabular-nums',
                display: 'inline-block',
                minWidth: `${String(Math.floor(to)).length}ch`,
                textAlign: 'right',
            }}
        >
            {display}{suffix}
        </span>
    );
}

// ─── Live Detection Badge ─────────────────────────────────────────────────────

function LiveBadge() {
    return (
        <div className="hp-viewport__hud-chip">
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--sys-error)',
                    display: 'inline-block',
                    animation: 'hp-ping 1.5s infinite',
                }}
            />
            LIVE · 60 FPS
        </div>
    );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="hp-faq"
            style={{ ...(open ? { borderColor: 'color-mix(in srgb, var(--sys-accent) 30%, transparent)' } : {}) }}
        >
            <button
                className="hp-faq__summary"
                onClick={() => setOpen((v) => !v)}
                style={{ width: '100%' }}
            >
                <span className="hp-faq__question">{q}</span>
                <motion.span
                    className="hp-faq__chevron material-icons-round"
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.28 }}
                    style={{ fontSize: '1.1rem', flexShrink: 0 }}
                >
                    expand_more
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <p className="hp-faq__answer">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Cursor Glow ──────────────────────────────────────────────────────────────

function CursorGlow() {
    const x = useMotionValue(-200);
    const y = useMotionValue(-200);
    const sx = useSpring(x, { stiffness: 80, damping: 18 });
    const sy = useSpring(y, { stiffness: 80, damping: 18 });

    useEffect(() => {
        const move = (e: MouseEvent) => {
            x.set(e.clientX);
            y.set(e.clientY);
        };
        window.addEventListener('mousemove', move);
        return () => window.removeEventListener('mousemove', move);
    }, [x, y]);

    return (
        <motion.div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                x: sx,
                y: sy,
                width: 320,
                height: 320,
                borderRadius: '50%',
                background: 'radial-gradient(circle, color-mix(in srgb, var(--sys-accent) 8%, transparent) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 9999,
                translateX: '-50%',
                translateY: '-50%',
                mixBlendMode: 'normal',
            }}
        />
    );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

const MARQUEE_ITEMS = [
    { icon: 'videocam', label: 'ESP32-CAM + Webcam Input' },
    { icon: 'ads_click', label: 'Dual Detection: Circle + Line' },
    { icon: 'straighten', label: 'Measurement Overlay (px/mm)' },
    { icon: 'speed', label: 'Real-time Inspection HUD' },
    { icon: 'cloud', label: 'Firebase Auth + Firestore' },
    { icon: 'api', label: 'Express API + WebSocket' },
    { icon: 'smart_toy', label: 'YOLOv8 Local Inference' },
    { icon: 'analytics', label: 'Dashboard Analytics & History' },
];

function Marquee() {
    const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
    return (
        <div style={{ overflow: 'hidden', position: 'relative' }}>
            <motion.div
                style={{ display: 'flex', gap: '2.5rem', whiteSpace: 'nowrap' }}
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            >
                {items.map((item, i) => (
                    <span
                        key={i}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--sys-text-secondary)',
                            flexShrink: 0,
                        }}
                    >
                        <span
                            className="material-icons-round"
                            style={{ fontSize: '0.9rem', color: 'var(--sys-accent)' }}
                        >
                            {item.icon}
                        </span>
                        {item.label}
                        <span
                            style={{
                                width: 3,
                                height: 3,
                                borderRadius: '50%',
                                background: 'var(--sys-border)',
                                display: 'inline-block',
                                marginLeft: '1rem',
                            }}
                        />
                    </span>
                ))}
            </motion.div>
        </div>
    );
}

// ─── Detection Box animation ──────────────────────────────────────────────────

const BOXES = [
    {
        label: 'OK',
        variant: 'ok' as const,
        style: { top: '18%', left: '14%', width: '22%', height: '30%' },
        delay: 0.2,
    },
    {
        label: 'DEFECT',
        variant: 'defect' as const,
        style: { top: '44%', left: '58%', width: '18%', height: '22%' },
        delay: 0.5,
    },
    {
        label: 'OK',
        variant: 'ok' as const,
        style: { top: '55%', left: '28%', width: '15%', height: '20%' },
        delay: 0.8,
    },
    {
        label: 'OK',
        variant: 'ok' as const,
        style: { top: '12%', left: '62%', width: '20%', height: '26%' },
        delay: 1.0,
    },
];

// ─── Data ─────────────────────────────────────────────────────────────────────

const STEPS = [
    {
        num: '01',
        icon: 'memory',
        title: 'Assemble Hardware Node',
        desc: 'Set up the ESP32-CAM with dual SG90 servo motors, battery pack, and optional 16x2 LCD status display.',
        detail: 'The camera head supports pan/tilt movement for wider inspection coverage.',
    },
    {
        num: '02',
        icon: 'wifi',
        title: 'Stream to Live Inspection',
        desc: 'Open the Spectra dashboard and connect either webcam or ESP32-CAM feed for real-time visual monitoring.',
        detail: 'Camera switching and live session controls are available inside one inspection workspace.',
    },
    {
        num: '03',
        icon: 'ads_click',
        title: 'Run Dual AI Detection',
        desc: 'Spectra processes each frame with circle and line models, then overlays class labels and confidence values.',
        detail: 'Detected objects are grouped as pass/fail candidates with visual bounding guidance.',
    },
    {
        num: '04',
        icon: 'analytics',
        title: 'Measure, Store, and Review',
        desc: 'Measurement data, detection summaries, and inspection sessions are synced to Firebase for analytics and history.',
        detail: 'Operators can calibrate px/mm, capture frames, and review trend metrics in the dashboard.',
    },
];

const CAPABILITIES = [
    {
        icon: 'camera_alt',
        title: 'Live Multi-Source Capture',
        desc: 'Supports both development webcam input and embedded ESP32-CAM streams in the same inspection flow.',
        tags: ['Webcam', 'ESP32-CAM', 'Live Feed'],
    },
    {
        icon: 'ads_click',
        title: 'Dual Defect Detection',
        desc: 'Runs circle and line detection pipelines together so different defect signatures are identified within one frame.',
        tags: ['Circle Model', 'Line Model', 'Confidence'],
    },
    {
        icon: 'straighten',
        title: 'Integrated Measurement Overlay',
        desc: 'Displays live dimensional context and calibration-aware px/mm values directly on top of detected objects.',
        tags: ['px/mm', 'Calibration', 'Overlay'],
    },
    {
        icon: 'sync',
        title: 'Operator Control Loop',
        desc: 'Capture, reset, inspect, and calibrate actions are exposed in the live page for fast operator decision cycles.',
        tags: ['Capture', 'Reset', 'Control'],
    },
    {
        icon: 'security',
        title: 'Secure Session Access',
        desc: 'Firebase authentication and route protection keep inspection and settings views accessible only to signed-in users.',
        tags: ['Firebase Auth', 'Protected Routes', 'RBAC Ready'],
    },
    {
        icon: 'insights',
        title: 'Traceable Analytics',
        desc: 'Inspection counts, defect rates, and session outcomes are persisted for dashboard summaries and historical review.',
        tags: ['Firestore', 'History', 'KPIs'],
    },
];

const STATS = [
    { value: 2, suffix: '', label: 'Detection Pipelines', icon: 'ads_click' },
    { value: 2, suffix: '', label: 'Camera Input Modes', icon: 'videocam' },
    { value: 3, suffix: '', label: 'Core Quality KPIs', icon: 'query_stats' },
    { value: 1, suffix: '', label: 'Unified Operator Dashboard', icon: 'dashboard' },
];

const TESTIMONIALS = [
    {
        quote:
            'The dashboard fuses live feed, dual detections, and measurement panels in one operator view, reducing context switching during inspection.',
        name: 'Live Inspection Workflow',
        role: 'Real-time operator screen validation',
        avatar: inspectorInterfaceImage,
        stars: 5,
    },
    {
        quote:
            'Hardware prototyping with ESP32-CAM, servo pan/tilt, and battery-backed setup confirms the system can be run as a portable inspection node.',
        name: 'Hardware Prototype',
        role: 'ESP32-CAM + servo assembly implementation',
        avatar: inspectorInterfaceImage,
        stars: 5,
    },
    {
        quote:
            'Firebase-backed session storage and analytics views make inspection records traceable, searchable, and ready for reporting workflows.',
        name: 'Data & Traceability',
        role: 'Firestore integration and session history',
        avatar: inspectorInterfaceImage,
        stars: 5,
    },
];

const PRICING = [
    {
        title: 'Core Inspection Module',
        value: 'Live',
        unit: '',
        desc: 'Runs real-time camera feed, dual detections, and object overlays for pass/fail support.',
        features: [
            'Webcam and ESP32-CAM source selection',
            'Circle + line AI detections',
            'Confidence and object cards',
            'Capture, inspect, reset controls',
            'Measurement panel integration',
        ],
        cta: 'Open Live Inspection',
        featured: false,
    },
    {
        title: 'Data & Analytics Module',
        value: 'Track',
        unit: '',
        desc: 'Stores sessions, counts, and defect metrics so teams can review quality trends over time.',
        features: [
            'Firebase Authentication and protected routes',
            'Firestore inspection session persistence',
            'Dashboard KPI summary widgets',
            'History and inventory-ready backend routes',
            'Alert and settings route structure',
            'Operator-centric system health visibility',
        ],
        cta: 'View Dashboard Analytics',
        featured: true,
        badge: 'Project Backbone',
    },
    {
        title: 'Deployment & Ops Module',
        value: 'Deploy',
        unit: '',
        desc: 'Provides reproducible setup for local AI service, server runtime, and Firebase rules/indexes.',
        features: [
            'Vite + React frontend build pipeline',
            'Express server with typed shared contracts',
            'FastAPI AI engine service integration',
            'Firestore rules and index deployment files',
            'Environment-based configuration handling',
            'Operational docs for setup and troubleshooting',
        ],
        cta: 'Read Deployment Guide',
        featured: false,
    },
];

const FAQS = [
    {
        q: 'What does dual detection mean in Spectra?',
        a: 'Dual detection means the live pipeline runs both circle and line model outputs in the same inspection session, then overlays class results and confidence values on the frame.',
    },
    {
        q: 'Can I inspect using ESP32-CAM and webcam?',
        a: 'Yes. The Live Inspection page supports switching input modes so you can test quickly on webcam and run hardware-backed inspection with ESP32-CAM.',
    },
    {
        q: 'Where are inspection sessions and results stored?',
        a: 'Authentication and operational data are handled with Firebase. Firestore stores inspection-related records that drive dashboard history and analytics views.',
    },
    {
        q: 'How does measurement work in the live screen?',
        a: 'The measurement panel applies calibration values (px/mm) and shows dimensional context beside detections so operators can validate both defect type and size behavior.',
    },
    {
        q: 'Which backend services power this app?',
        a: 'The web app uses a React + Vite frontend, an Express API backend, and a local FastAPI AI engine for inference and measurement processing.',
    },
    {
        q: 'Is the project ready for deployment and maintenance?',
        a: 'Yes. The repository includes deployment-oriented docs, environment configuration structure, Firebase rules/indexes, and health-check endpoints for runtime monitoring.',
    },
];

const TECH_STACK = [
    { icon: 'code', name: 'React 19 + TypeScript', desc: 'Frontend UI and typed interactions' },
    { icon: 'bolt', name: 'Vite', desc: 'Fast dev/build pipeline' },
    { icon: 'dns', name: 'Express + Node.js', desc: 'API routing and server orchestration' },
    { icon: 'cloud', name: 'Firebase', desc: 'Authentication and Firestore data layer' },
    { icon: 'smart_toy', name: 'FastAPI + YOLOv8', desc: 'Local AI inference service' },
    { icon: 'swap_horiz', name: 'WebSocket', desc: 'Low-latency real-time updates' },
    { icon: 'memory', name: 'ESP32-CAM', desc: 'Embedded camera hardware node' },
    { icon: 'settings', name: 'Arduino Firmware', desc: 'Hardware control and acquisition' },
];

const LOGOS = ['Live Inspection', 'Dual AI Detection', 'Measurement Engine', 'Firebase Auth', 'Analytics', 'System Health'];

// ─── [1] Hero Section – Parallax Orbs + [4] Granular Text Reveal ─────────────
//
// Three orbs are given independent y-ranges derived from a single scrollYProgress:
//   orb1Y: [0, -150]  → deep layer, moves fastest (background)
//   orb2Y: [0,  -50]  → mid layer, subtle drift
//   orb3Y: [0, -100]  → intermediate depth
//
// Title line 1 "Detect Every Defect." is split into individual characters
// each animated with charReveal (y + blur). Line 2 gradient text is split
// into words via SplitWords to preserve background-clip: text correctly.

function HeroSection() {
    const heroRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ['start start', 'end start'],
    });

    // Shared scroll for hero content parallax (existing)
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

    // ── [1] Per-orb parallax depths ──────────────────────────────────────────
    const orb1Y = useTransform(scrollYProgress, [0, 1], [0, -150]); // deepest / fastest
    const orb2Y = useTransform(scrollYProgress, [0, 1], [0, -50]); // shallowest / slowest
    const orb3Y = useTransform(scrollYProgress, [0, 1], [0, -100]); // mid-depth

    return (
        <section ref={heroRef} className="hp-hero" style={{ textAlign: 'center' }}>

            {/* ── Parallax orbs (technique 1) ─────────────────────────────── */}
            <FloatingOrb
                parallaxY={orb1Y}
                style={{
                    top: '-8%',
                    left: '-6%',
                    width: '38%',
                    height: '38%',
                    background: 'color-mix(in srgb, var(--sys-accent) 14%, transparent)',
                    filter: 'blur(110px)',
                }}
                delay={0}
            />
            <FloatingOrb
                parallaxY={orb2Y}
                style={{
                    top: '15%',
                    right: '-8%',
                    width: '30%',
                    height: '30%',
                    background: 'color-mix(in srgb, var(--sys-info) 10%, transparent)',
                    filter: 'blur(100px)',
                }}
                delay={2}
            />
            <FloatingOrb
                parallaxY={orb3Y}
                style={{
                    bottom: '-5%',
                    left: '30%',
                    width: '25%',
                    height: '25%',
                    background: 'color-mix(in srgb, var(--sys-accent) 8%, transparent)',
                    filter: 'blur(80px)',
                }}
                delay={1}
            />

            {/* Floating geometric decorations (unchanged) */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: '12%',
                    right: '8%',
                    width: 64,
                    height: 64,
                    border: '1.5px solid color-mix(in srgb, var(--sys-accent) 25%, transparent)',
                    borderRadius: 12,
                    rotate: 18,
                }}
                animate={{ rotate: [18, 26, 18], y: [0, -10, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                style={{
                    position: 'absolute',
                    top: '28%',
                    left: '7%',
                    width: 40,
                    height: 40,
                    border: '1.5px solid color-mix(in srgb, var(--sys-info) 30%, transparent)',
                    borderRadius: '50%',
                }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: '18%',
                    right: '12%',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'color-mix(in srgb, var(--sys-accent) 40%, transparent)',
                }}
                animate={{ y: [0, -16, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div className="hp-container" style={{ y: heroY, opacity: heroOpacity }}>
                {/* Badge */}
                <motion.div variants={fadeUp} custom={0} style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="hp-hero__badge">
                        <span className="hp-hero__badge-dot" />
                        ESP32-CAM + Dual AI Detection + Measurement
                    </div>
                </motion.div>

                {/* ── [4] Granular text reveal – character split ──────────────
                    titleStagger drives staggerChildren across all chars + words.
                    Line 1: each character animates individually (charReveal).
                    Line 2: each word animates individually (wordReveal), matching 
                    the standard color schema of Line 1.                        */}
                <motion.h1
                    className="hp-hero__title"
                    variants={titleStagger}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Line 1 – character-by-character with blur-sm → blur-none */}
                    <SplitChars text="Inspect Smarter, In Real Time." />
                    <br />
                    {/* Line 2 – word-by-word; standard color wrapping */}
                    <span style={{ display: 'inline-block' }}>
                        <SplitWords text="Built for the Spectra Workflow." />
                    </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p className="hp-hero__subtitle" variants={fadeUp} custom={0.2}>
                    Spectra combines live camera streaming, dual AI defect detection (circle + line), and
                    measurement-aware overlays in a single inspection dashboard with Firebase-backed history
                    and analytics.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    variants={fadeUp}
                    custom={0.3}
                    style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
                >
                    <a href="/dashboard" className="hp-btn hp-btn--primary hp-glow-pulse">
                        <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>
                            dashboard
                        </span>
                        Open Dashboard
                    </a>
                    <a href="#demo" className="hp-btn hp-btn--ghost">
                        <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>
                            live_tv
                        </span>
                        View Live Inspection
                    </a>
                </motion.div>

                {/* Marquee strip */}
                <motion.div variants={fadeIn} custom={0.5} style={{ marginTop: '3rem' }}>
                    <Marquee />
                </motion.div>

                {/* Trust logos / Pillars */}
                <motion.div
                    variants={fadeIn}
                    custom={0.6}
                    style={{
                        marginTop: '4rem',
                        paddingTop: '2rem',
                        borderTop: '1px solid var(--sys-border)', // Theme-aware border
                        opacity: 0.7, // Increased base opacity for better visibility
                    }}
                    whileHover={{ opacity: 1 }} // Replaces CSS :hover
                >
                    <p style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        color: 'var(--sys-text-secondary)', // Theme-aware secondary text
                        textAlign: 'center',
                        marginBottom: '1.5rem'
                    }}>
                        Core platform pillars
                    </p>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '2.5rem'
                    }}>
                        {LOGOS.map((l) => (
                            <span
                                key={l}
                                style={{
                                    fontSize: '1.2rem',
                                    fontWeight: 800,
                                    fontStyle: 'italic',
                                    letterSpacing: '-0.04em',
                                    color: 'var(--sys-text-primary)' // Changed to primary for crisp readability in both modes
                                }}
                            >
                                {l}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
}

// ─── [5] Live Inspector Viewport – Theme-Aligned Glassmorphism ───────────────

function ViewportSection() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });

    // ── [5] Glassmorphism spring values ──────────────────────────────────────
    const blurBase = useMotionValue(0);
    const blurSpring = useSpring(blurBase, { stiffness: 60, damping: 20 });
    const hudBackdropFilter = useTransform(blurSpring, (v) => `blur(${v}px)`);
    const insightsBackdropFilter = useTransform(blurSpring, (v) => `blur(${v * 0.7}px)`);
    const insightsBg = useTransform(blurSpring, [0, 20], [
        'rgba(9, 14, 24, 0)',
        'rgba(9, 14, 24, 0.78)',
    ]);

    useEffect(() => {
        if (inView) blurBase.set(20);
    }, [inView, blurBase]);

    return (
        <section id="demo" className="hp-section hp-section--tight">
            <div className="hp-container">
                <AnimatedSection>
                    <motion.p
                        variants={fadeUp}
                        style={{
                            textAlign: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.14em',
                            color: 'var(--sys-accent)',
                            marginBottom: '0.6rem',
                        }}
                    >
                        Live Preview
                    </motion.p>
                    <motion.h2
                        variants={fadeUp}
                        custom={0.05}
                        className="hp-heading hp-heading--center"
                    >
                        Spectra Inspector - Live Defect Detection in Action
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        custom={0.1}
                        className="hp-subheading hp-subheading--center"
                        style={{ marginBottom: '2.5rem' }}
                    >
                        The interface below mirrors the production inspection workspace with live overlays,
                        throughput analytics, and defect intelligence in one screen.
                    </motion.p>
                </AnimatedSection>

                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 40 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="hp-viewport hp-glow-pulse"
                >
                    <div className="hp-viewport__bar">
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {['var(--sys-info)', 'var(--sys-warning)', 'var(--sys-success)'].map((c) => (
                                <div key={c} className="hp-viewport__dot" style={{ background: c }} />
                            ))}
                        </div>
                        <span className="hp-viewport__label">
                            Spectra · Inspector v2.4 · Cam 01
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div
                                className="hp-viewport__dot hp-viewport__dot--live"
                                style={{ width: '0.5rem', height: '0.5rem' }}
                            />
                            <span className="hp-viewport__label">RECORDING</span>
                        </div>
                    </div>

                    <div className="hp-viewport__feed">
                        <img
                            src={inspectorInterfaceImage}
                            alt="Spectra inspector interface with live defect overlays"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
                            className="hp-viewport__insights"
                            style={{
                                backdropFilter: insightsBackdropFilter,
                                WebkitBackdropFilter: insightsBackdropFilter as never,
                                background: insightsBg,
                            }}
                        >
                            <p className="hp-viewport__insights-title">
                                Core Functionality
                            </p>
                            <ul className="hp-viewport__insights-list">
                                <li>✅ Green boxes = detected normal rods</li>
                                <li>❌ Red boxes = detected defective rods</li>
                                <li>Every rod is automatically classified in real time</li>
                            </ul>
                        </motion.div>

                        <div className="hp-scanline" />

                        {BOXES.map((box, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={inView ? { opacity: 1, scale: 1 } : {}}
                                transition={{ delay: box.delay, duration: 0.4, ease: 'backOut' }}
                                className={`hp-viewport__overlay-box hp-viewport__overlay-box--${box.variant}`}
                                style={box.style}
                            >
                                <span className={`hp-viewport__overlay-tag hp-viewport__overlay-tag--${box.variant}`}>
                                    {box.label}
                                </span>
                            </motion.div>
                        ))}

                        <motion.div
                            className="hp-viewport__hud"
                            style={{
                                backdropFilter: hudBackdropFilter,
                                WebkitBackdropFilter: hudBackdropFilter as never,
                            }}
                        >
                            <LiveBadge />
                            <div className="hp-viewport__hud-chip">
                                <span className="material-icons-round" style={{ fontSize: '0.7rem' }}>
                                    bolt
                                </span>
                                8.3 ms
                            </div>
                            <div className="hp-viewport__hud-chip">MODEL: YOLOv9-S</div>
                        </motion.div>

                        {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                            <div
                                key={pos}
                                style={{
                                    position: 'absolute',
                                    [pos.includes('top') ? 'top' : 'bottom']: 16,
                                    [pos.includes('left') ? 'left' : 'right']: 16,
                                    borderTop: pos.includes('top') ? '2px solid rgba(255,255,255,0.3)' : 'none',
                                    borderBottom: pos.includes('bottom') ? '2px solid rgba(255,255,255,0.3)' : 'none',
                                    borderLeft: pos.includes('left') ? '2px solid rgba(255,255,255,0.3)' : 'none',
                                    borderRight: pos.includes('right') ? '2px solid rgba(255,255,255,0.3)' : 'none',
                                    width: 16,
                                    height: 16,
                                }}
                            />
                        ))}
                    </div>

                    <div className="hp-viewport__metrics">
                        {[
                            { label: 'Parts / min', value: '247', success: false },
                            { label: 'Defect Rate', value: '0.3%', success: false },
                            { label: 'Yield', value: '99.7%', success: true },
                        ].map((m) => (
                            <div key={m.label}>
                                <p className="hp-viewport__metric-label">{m.label}</p>
                                <p className={`hp-viewport__metric-value${m.success ? ' hp-viewport__metric-value--success' : ''}`}>
                                    {m.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="hp-viewport__details">
                        <div className="hp-viewport__details-card">
                            <p className="hp-viewport__details-title">System Details</p>
                            <div className="hp-viewport__details-row">
                                <span>LIVE · 60 FPS</span>
                                <span>8.3 ms inference latency</span>
                                <span>MODEL: YOLOv9-S</span>
                            </div>
                        </div>
                        <div className="hp-viewport__details-card hp-viewport__details-card--narrative">
                            <p className="hp-viewport__details-title">Why This Section Matters</p>
                            <p className="hp-viewport__details-copy">
                                Instead of manual visual checks, operators now get instant defect alerts,
                                confidence scoring, and production-rate insights from one live screen —
                                improving accuracy, reducing misses, and accelerating quality control
                                decisions in real time.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// ─── Stats Banner (uses enhanced AnimatedCounter – technique 7) ───────────────

function StatsSection() {
    return (
        <section
            className="hp-section hp-section--tight"
            style={{
                background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--sys-accent) 6%, var(--sys-bg-secondary)), var(--sys-bg-secondary))',
                borderTop: '1px solid var(--sys-border)',
                borderBottom: '1px solid var(--sys-border)',
            }}
        >
            <div className="hp-container">
                <AnimatedSection>
                    <motion.div
                        variants={staggerContainer}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: '2rem',
                            textAlign: 'center',
                        }}
                    >
                        {STATS.map((s) => (
                            <motion.div key={s.label} variants={scaleIn}>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    <span
                                        className="material-icons-round"
                                        style={{ color: 'var(--sys-accent)', fontSize: '1.5rem' }}
                                    >
                                        {s.icon}
                                    </span>
                                </div>
                                {/* [7] Scrambler counter: noise phase → ease-in count */}
                                <p className="hp-stat__value">
                                    <AnimatedCounter to={parseFloat(String(s.value))} suffix={s.suffix} />
                                </p>
                                <p className="hp-stat__label">{s.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatedSection>
            </div>
        </section>
    );
}

// ─── [2] How It Works – Scroll-Linked SVG Path Drawing ───────────────────────
//
// A <motion.path> with animated `pathLength` (0 → 1) replaces the static
// dashed div. The pathLength is driven by the section's own scrollYProgress
// so the line "draws itself" as the user scrolls through the section.
// Gradient defs give the stroke a accent-to-transparent fade.

function HowItWorksSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start 85%', 'center 40%'],
    });
    const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
    const pathOpacity = useTransform(scrollYProgress, [0, 0.12], [0, 1]);

    return (
        <section className="hp-section" ref={sectionRef}>
            <div className="hp-container">
                <AnimatedSection>
                    <motion.p
                        variants={fadeUp}
                        style={{
                            textAlign: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.14em',
                            color: 'var(--sys-accent)',
                            marginBottom: '0.6rem',
                        }}
                    >
                        Getting Started
                    </motion.p>
                    <motion.h2 variants={fadeUp} custom={0.05} className="hp-heading hp-heading--center">
                        From Unboxing to Inspecting in 4 Steps
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        custom={0.1}
                        className="hp-subheading hp-subheading--center"
                        style={{ marginBottom: '3.5rem' }}
                    >
                        This flow mirrors the actual Spectra implementation path from hardware setup to stored
                        quality analytics.
                    </motion.p>

                    <motion.div
                        variants={staggerContainer}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '1.5rem',
                            position: 'relative',
                        }}
                    >
                        {/* ── [2] Scroll-linked SVG path (replaces static dashed div) ──────────
                            viewBox is 1000×20; the wavy cubic bezier passes through the
                            approximate centre of each step-card number bubble.
                            pathLength springs from 0→1 as the section scrolls into view.    */}
                        <svg
                            viewBox="0 0 1000 20"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                top: '2.6rem',
                                left: '8%',
                                width: '84%',
                                height: 20,
                                zIndex: 0,
                                overflow: 'visible',
                                display: 'none', // hidden on mobile; Tailwind md:block below
                            }}
                            className="md:block"
                        >
                            <defs>
                                <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="var(--sys-accent)" stopOpacity="0.2" />
                                    <stop offset="30%" stopColor="var(--sys-accent)" stopOpacity="0.9" />
                                    <stop offset="70%" stopColor="var(--sys-accent)" stopOpacity="0.9" />
                                    <stop offset="100%" stopColor="var(--sys-accent)" stopOpacity="0.2" />
                                </linearGradient>
                            </defs>
                            {/* Wavy cubic bezier connecting 4 step-card centres */}
                            <motion.path
                                d="M 0,10 C 100,1 200,19 330,10 C 460,1 540,19 670,10 C 800,1 900,19 1000,10"
                                fill="none"
                                stroke="url(#pathGrad)"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                style={{ pathLength, opacity: pathOpacity }}
                            />
                            {/* Travelling glow dot that rides the path head */}
                            <motion.circle
                                r="4"
                                fill="var(--sys-accent)"
                                style={{
                                    offsetPath: 'path("M 0,10 C 100,1 200,19 330,10 C 460,1 540,19 670,10 C 800,1 900,19 1000,10")',
                                    offsetDistance: useTransform(pathLength, (v) => `${v * 100}%`) as never,
                                    opacity: pathOpacity,
                                    filter: 'drop-shadow(0 0 4px var(--sys-accent))',
                                }}
                            />
                        </svg>

                        {STEPS.map((step, i) => (
                            <motion.div key={step.num} variants={fadeUp} custom={i * 0.1} className="hp-step">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        marginBottom: '1rem',
                                    }}
                                >
                                    <div className="hp-step__number">{step.num}</div>
                                    <span
                                        className="material-icons-round hp-step__icon"
                                        style={{ marginBottom: 0, fontSize: '1.5rem' }}
                                    >
                                        {step.icon}
                                    </span>
                                </div>
                                <h3 className="hp-step__title">{step.title}</h3>
                                <p className="hp-step__desc">{step.desc}</p>
                                <p
                                    style={{
                                        marginTop: '0.75rem',
                                        fontSize: '0.75rem',
                                        color: 'var(--sys-accent)',
                                        fontWeight: 600,
                                    }}
                                >
                                    ↳ {step.detail}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatedSection>
            </div>
        </section>
    );
}

// ─── Image Showcase ───────────────────────────────────────────────────────────

function ShowcaseSection() {
    const images = [
        {
            src: inspectorInterfaceImage,
            label: 'Live Inspection Interface',
        },
        {
            src: inspectorInterfaceImage,
            label: 'Detection + Measurement Overlay',
        },
        {
            src: inspectorInterfaceImage,
            label: 'Operator Control Workspace',
        },
        {
            src: inspectorInterfaceImage,
            label: 'Session Analytics Source',
        },
    ];

    return (
        <section
            className="hp-section hp-section--tight"
            style={{ background: 'var(--sys-bg-secondary)' }}
        >
            <div className="hp-container">
                <AnimatedSection>
                    <motion.h2
                        variants={fadeUp}
                        className="hp-heading hp-heading--center"
                        style={{ marginBottom: '0.5rem' }}
                    >
                        Built Around the Real Spectra Interface
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        custom={0.05}
                        className="hp-subheading hp-subheading--center"
                        style={{ marginBottom: '2.5rem' }}
                    >
                        This section previews the exact inspection UI behavior: live feed, detection boxes,
                        control actions, and analytics-ready output.
                    </motion.p>

                    <motion.div
                        variants={staggerContainer}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '1rem',
                        }}
                    >
                        {images.map((img, i) => (
                            <motion.div
                                key={img.label}
                                variants={scaleIn}
                                custom={i * 0.1}
                                whileHover={{ scale: 1.03, y: -4 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    borderRadius: '1rem',
                                    overflow: 'hidden',
                                    border: '1px solid var(--sys-border)',
                                    position: 'relative',
                                    cursor: 'pointer',
                                }}
                            >
                                <img
                                    src={img.src}
                                    alt={img.label}
                                    style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                                />
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    whileHover={{ opacity: 1 }}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background:
                                            'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)',
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        padding: '1rem',
                                    }}
                                >
                                    <span
                                        style={{
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            letterSpacing: '-0.01em',
                                        }}
                                    >
                                        {img.label}
                                    </span>
                                </motion.div>
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background:
                                            'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 45%)',
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        padding: '1rem',
                                    }}
                                >
                                    <span
                                        style={{
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            letterSpacing: '-0.01em',
                                        }}
                                    >
                                        {img.label}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatedSection>
            </div>
        </section>
    );
}

// ─── [3] Capabilities – 3D Card Tilt ─────────────────────────────────────────
//
// Each CapCard manages its own rotateX / rotateY spring MotionValues via the
// CapCard component defined at the top. Mouse move over a card maps pointer
// position relative to the card centre → ±5° tilt on both axes via springs
// (stiffness 300, damping 28) for a snappy-but-smooth 3D parallax feel.

function CapabilitiesSection() {
    return (
        <section className="hp-section">
            <div className="hp-container">
                <AnimatedSection>
                    <motion.p
                        variants={fadeUp}
                        style={{
                            textAlign: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.14em',
                            color: 'var(--sys-accent)',
                            marginBottom: '0.6rem',
                        }}
                    >
                        Capabilities
                    </motion.p>
                    <motion.h2 variants={fadeUp} custom={0.05} className="hp-heading hp-heading--center">
                        What Spectra Delivers Today
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        custom={0.1}
                        className="hp-subheading hp-subheading--center"
                        style={{ marginBottom: '3rem' }}
                    >
                        The current build focuses on practical inspection operations, measurable outputs, and
                        maintainable integration across hardware, AI, and web layers.
                    </motion.p>

                    <motion.div
                        variants={staggerContainer}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '1.25rem',
                        }}
                    >
                        {/* CapCard owns tilt hooks internally → works cleanly inside .map() */}
                        {CAPABILITIES.map((cap, i) => (
                            <CapCard key={cap.title} cap={cap} index={i} />
                        ))}
                    </motion.div>
                </AnimatedSection>
            </div>
        </section>
    );
}

// ─── Tech Stack ───────────────────────────────────────────────────────────────

function TechStackSection() {
    return (
        <section
            className="hp-section hp-section--tight"
            style={{
                background: 'var(--sys-bg-secondary)',
                borderTop: '1px solid var(--sys-border)',
                borderBottom: '1px solid var(--sys-border)',
            }}
        >
            <div className="hp-container">
                <AnimatedSection>
                    <motion.h2
                        variants={fadeUp}
                        className="hp-heading hp-heading--center"
                        style={{ marginBottom: '0.5rem' }}
                    >
                        Actual Stack Used in This Project
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        custom={0.05}
                        className="hp-subheading hp-subheading--center"
                        style={{ marginBottom: '2.5rem' }}
                    >
                        These are the technologies currently wired in the codebase and deployment flow.
                    </motion.p>

                    <motion.div
                        variants={staggerContainer}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '0.875rem',
                        }}
                    >
                        {TECH_STACK.map((t, i) => (
                            <motion.div
                                key={t.name}
                                variants={fadeUp}
                                custom={i * 0.06}
                                className="hp-tech-chip"
                                whileHover={{ y: -3 }}
                                transition={{ duration: 0.22 }}
                            >
                                <span className="material-icons-round hp-tech-chip__icon">{t.icon}</span>
                                <div>
                                    <p className="hp-tech-chip__name">{t.name}</p>
                                    <p className="hp-tech-chip__desc">{t.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatedSection>
            </div>
        </section>
    );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function TestimonialsSection() {
    const [active, setActive] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setActive((v) => (v + 1) % TESTIMONIALS.length), 5000);
        return () => clearInterval(t);
    }, []);

    return (
        <section className="hp-section">
            <div className="hp-container">
                <AnimatedSection>
                    <motion.h2
                        variants={fadeUp}
                        className="hp-heading hp-heading--center"
                        style={{ marginBottom: '0.5rem' }}
                    >
                        Verified Project Outcomes
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        custom={0.05}
                        className="hp-subheading hp-subheading--center"
                        style={{ marginBottom: '3rem' }}
                    >
                        Key implementation outcomes observed in the current Spectra build.
                    </motion.p>

                    <motion.div
                        variants={staggerContainer}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '1.25rem',
                        }}
                    >
                        {TESTIMONIALS.map((t, i) => (
                            <motion.div
                                key={t.name}
                                variants={fadeUp}
                                custom={i * 0.1}
                                className="hp-testimonial"
                                whileHover={{ y: -4 }}
                                transition={{ duration: 0.25 }}
                            >
                                <div className="hp-testimonial__stars">
                                    {[...Array(t.stars)].map((_, j) => (
                                        <span key={j} className="material-icons-round" style={{ fontSize: '0.9rem' }}>
                                            star
                                        </span>
                                    ))}
                                </div>
                                <p className="hp-testimonial__quote">"{t.quote}"</p>
                                <div className="hp-testimonial__author">
                                    <img
                                        src={t.avatar}
                                        alt={t.name}
                                        className="hp-testimonial__avatar"
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <div>
                                        <p className="hp-testimonial__name">{t.name}</p>
                                        <p className="hp-testimonial__role">{t.role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '2rem' }}>
                        {TESTIMONIALS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActive(i)}
                                style={{
                                    width: i === active ? 20 : 6,
                                    height: 6,
                                    borderRadius: 9999,
                                    background:
                                        i === active ? 'var(--sys-accent)' : 'var(--sys-border)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    padding: 0,
                                }}
                            />
                        ))}
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingSection() {
    return (
        <section
            id="pricing"
            className="hp-section"
            style={{ background: 'var(--sys-bg-secondary)' }}
        >
            <div className="hp-container">
                <AnimatedSection>
                    <motion.p
                        variants={fadeUp}
                        style={{
                            textAlign: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.14em',
                            color: 'var(--sys-accent)',
                            marginBottom: '0.6rem',
                        }}
                    >
                        Platform Modules
                    </motion.p>
                    <motion.h2 variants={fadeUp} custom={0.05} className="hp-heading hp-heading--center">
                        Feature Areas in the Current Release
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        custom={0.1}
                        className="hp-subheading hp-subheading--center"
                        style={{ marginBottom: '3.5rem' }}
                    >
                        Structured by functional modules rather than subscription plans.
                    </motion.p>

                    <motion.div
                        variants={staggerContainer}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: '1.5rem',
                            alignItems: 'stretch',
                        }}
                    >
                        {PRICING.map((plan, i) => (
                            <motion.div
                                key={plan.title}
                                variants={scaleIn}
                                custom={i * 0.1}
                                className={`hp-price-card${plan.featured ? ' hp-price-card--featured' : ''}`}
                            >
                                {plan.badge && <div className="hp-price-card__badge">{plan.badge}</div>}
                                <h3
                                    className="hp-price-card__title"
                                    style={{ color: plan.featured ? '#fff' : 'var(--sys-text-primary)' }}
                                >
                                    {plan.title}
                                </h3>
                                <p
                                    style={{
                                        fontSize: '0.8rem',
                                        marginBottom: '1rem',
                                        color: plan.featured ? 'rgba(255,255,255,0.75)' : 'var(--sys-text-secondary)',
                                    }}
                                >
                                    {plan.desc}
                                </p>
                                <div className="hp-price-card__value" style={{ color: plan.featured ? '#fff' : 'var(--sys-text-primary)' }}>
                                    {plan.value}
                                    {plan.unit && (
                                        <span
                                            className="hp-price-card__unit"
                                            style={{ color: plan.featured ? 'rgba(255,255,255,0.7)' : 'var(--sys-text-secondary)' }}
                                        >
                                            {plan.unit}
                                        </span>
                                    )}
                                </div>
                                <ul className="hp-price-card__features" style={{ color: plan.featured ? 'rgba(255,255,255,0.9)' : 'var(--sys-text-secondary)' }}>
                                    {plan.features.map((f) => (
                                        <li key={f}>
                                            <span
                                                className="material-icons-round"
                                                style={{
                                                    fontSize: '0.9rem',
                                                    color: plan.featured ? '#fff' : 'var(--sys-success)',
                                                }}
                                            >
                                                check_circle
                                            </span>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href="/dashboard"
                                    className="hp-price-card__cta"
                                    style={
                                        plan.featured
                                            ? { background: '#fff', color: 'var(--sys-accent)' }
                                            : {
                                                background: 'color-mix(in srgb, var(--sys-text-primary) 8%, transparent)',
                                                color: 'var(--sys-text-primary)',
                                                border: '1px solid var(--sys-border)',
                                            }
                                    }
                                >
                                    {plan.cta}
                                </a>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatedSection>
            </div>
        </section>
    );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FaqSection() {
    return (
        <section className="hp-section">
            <div className="hp-container">
                <AnimatedSection>
                    <motion.h2
                        variants={fadeUp}
                        className="hp-heading hp-heading--center"
                        style={{ marginBottom: '0.5rem' }}
                    >
                        Frequently Asked Questions
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        custom={0.05}
                        className="hp-subheading hp-subheading--center"
                        style={{ marginBottom: '2.5rem' }}
                    >
                        Need deeper implementation details? Refer to the project docs and API routes for
                        environment setup, deployment, and operations.
                        {' '}
                        <a href="/dashboard" style={{ color: 'var(--sys-accent)' }}>
                            Open Dashboard
                        </a>
                    </motion.p>

                    <motion.div
                        variants={staggerContainer}
                        style={{
                            maxWidth: '48rem',
                            margin: '0 auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}
                    >
                        {FAQS.map((faq, i) => (
                            <motion.div key={faq.q} variants={fadeUp} custom={i * 0.07}>
                                <FaqItem q={faq.q} a={faq.a} />
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatedSection>
            </div>
        </section>
    );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CtaBanner() {
    return (
        <section className="hp-section hp-section--tight">
            <div className="hp-container">
                <AnimatedSection>
                    <motion.div variants={scaleIn} className="hp-cta-banner">
                        <div className="hp-cta-banner__dots" />

                        <motion.div
                            style={{
                                position: 'absolute',
                                top: '10%',
                                right: '5%',
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                border: '1.5px solid rgba(255,255,255,0.2)',
                                pointerEvents: 'none',
                            }}
                            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 5, repeat: Infinity }}
                        />
                        <motion.div
                            style={{
                                position: 'absolute',
                                bottom: '12%',
                                left: '6%',
                                width: 48,
                                height: 48,
                                border: '1.5px solid rgba(255,255,255,0.15)',
                                borderRadius: 10,
                                rotate: 30,
                                pointerEvents: 'none',
                            }}
                            animate={{ rotate: [30, 42, 30], y: [0, -8, 0] }}
                            transition={{ duration: 7, repeat: Infinity }}
                        />

                        <h2 className="hp-cta-banner__title">
                            Ready to Run the Spectra Inspection Flow?
                        </h2>
                        <p className="hp-cta-banner__desc">
                            Launch the live dashboard, connect your camera source, and validate detections,
                            measurements, and session metrics end-to-end.
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                gap: '1rem',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            <a href="/dashboard" className="hp-btn hp-btn--white">
                                <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>
                                    dashboard
                                </span>
                                Open Dashboard
                            </a>
                            <a
                                href="#demo"
                                className="hp-btn"
                                style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    backdropFilter: 'blur(8px)',
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>
                                    play_circle
                                </span>
                                Jump to Live Preview
                            </a>
                        </div>
                    </motion.div>
                </AnimatedSection>
            </div>
        </section>
    );
}

// ─── Scroll-to-top button ─────────────────────────────────────────────────────

function ScrollToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handle = () => setVisible(window.scrollY > 600);
        window.addEventListener('scroll', handle, { passive: true });
        return () => window.removeEventListener('scroll', handle);
    }, []);

    return (
        <AnimatePresence>
            {visible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={{
                        position: 'fixed',
                        bottom: '2rem',
                        right: '2rem',
                        zIndex: 50,
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'var(--sys-accent)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 20px color-mix(in srgb, var(--sys-accent) 35%, transparent)',
                    }}
                >
                    <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>
                        keyboard_arrow_up
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
}

// ─── Page Root ────────────────────────────────────────────────────────────────

export default function HomePage() {
    return (
        <motion.div
            className="hp-page--light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ position: 'relative', overflowX: 'hidden', background: 'var(--sys-bg-primary)' }}
        >
            <CursorGlow />
            <HeroSection />
            <ViewportSection />
            <StatsSection />
            <HowItWorksSection />
            <ShowcaseSection />
            <CapabilitiesSection />
            <TechStackSection />
            <TestimonialsSection />
            <PricingSection />
            <FaqSection />
            <CtaBanner />
            <ScrollToTop />
        </motion.div>
    );
}