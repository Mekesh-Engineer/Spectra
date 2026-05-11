import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
    id: string;
    full_name?: string | undefined;
    email?: string | undefined;
    avatar_url?: string | undefined;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
    { label: 'Home', to: '/', icon: 'home' },
    { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
    { label: 'Analytics', to: '/dashboard/analytics', icon: 'analytics' },
    { label: 'Documentation', to: '/docs', icon: 'description' },
    { label: 'Pricing', to: '/pricing', icon: 'payments' },
];

const SOCIAL_LINKS = [
    {
        label: 'Facebook',
        href: '#',
        color: '#1877F2',
        icon: (
            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V7.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
        )
    },
    {
        label: 'YouTube',
        href: '#',
        color: '#FF0000',
        icon: (
            <svg viewBox="0 0 24 24" className="w-[24px] h-[24px]" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
        )
    },
    {
        label: 'WhatsApp',
        href: '#',
        color: '#25D366',
        icon: (
            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
        )
    },
    {
        label: 'LinkedIn',
        href: '#',
        color: '#0A66C2',
        icon: (
            <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
        )
    },
    {
        label: 'X / Twitter',
        href: '#',
        color: '#e4e4e4',
        icon: (
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
            </svg>
        )
    },
];

const LANGUAGES = [
    { code: 'en', label: 'English (US)', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

const STATS = [
    { value: '< 0.1mm', label: 'Measurement Precision' },
    { value: '100%', label: 'Non-Destructive' },
    { value: '24/7', label: 'Continuous Operation' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name?: string) => {
    if (!name) return 'SP';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

/** Animated entrance wrapper — fades+slides up when scrolled into view */
const RevealOnScroll: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
    children, delay = 0, className = '',
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.1 });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

/** Language Switcher */
const LanguageSwitcher: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(() => localStorage.getItem('app-language') || 'en');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.documentElement.lang = selected;
        localStorage.setItem('app-language', selected);
        window.dispatchEvent(new Event('languagechange'));
    }, [selected]);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', onClickOutside);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            document.removeEventListener('keydown', onEsc);
        };
    }, []);

    const active = LANGUAGES.find(l => l.code === selected) ?? LANGUAGES[0]!;

    return (
        <div className="relative w-full sm:w-auto flex justify-center" ref={ref}>
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsOpen(p => !p)}
                className="flex items-center justify-center gap-2 rounded-xl border border-sys-border/60 bg-sys-bg-secondary px-4 py-2 text-[12px] font-medium text-sys-text-secondary transition-colors hover:border-sys-border hover:text-sys-text-primary w-full sm:w-auto"
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                <span className="material-icons-round text-[14px]">language</span>
                <span>{active.flag}</span>
                <span>{active.label}</span>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="material-icons-round text-[14px]"
                >
                    expand_more
                </motion.span>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 sm:left-0 sm:-translate-x-0 mb-2 w-44 overflow-hidden rounded-xl border border-sys-border z-50"
                        style={{
                            background: 'var(--sys-bg-primary)',
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
                        }}
                        role="menu"
                    >
                        {LANGUAGES.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => { setSelected(lang.code); setIsOpen(false); }}
                                role="menuitem"
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-[12px] transition-colors hover:bg-sys-bg-secondary ${lang.code === selected
                                    ? 'font-semibold text-sys-accent'
                                    : 'text-sys-text-secondary'
                                    }`}
                            >
                                <span>{lang.flag}</span>
                                <span>{lang.label}</span>
                                {lang.code === selected && (
                                    <span className="material-icons-round ml-auto text-[14px] text-sys-accent">
                                        check
                                    </span>
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Newsletter Input ─────────────────────────────────────────────────────────
const NewsletterInput: React.FC<{ prefillEmail?: string | undefined }> = ({ prefillEmail }) => {
    const [email, setEmail] = useState(prefillEmail ?? '');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (prefillEmail) setEmail(prefillEmail);
    }, [prefillEmail]);

    const handleSubmit = async () => {
        if (!email || !email.includes('@')) { setStatus('error'); return; }
        setStatus('loading');
        try {
            const subRef = doc(db, 'newsletter_subscribers', email);
            await setDoc(subRef, { email, subscribed_at: serverTimestamp() }, { merge: true });
            setStatus('success');
        } catch {
            setStatus('error');
        }
        setTimeout(() => setStatus('idle'), 3500);
    };

    return (
        <div className="space-y-2.5 w-full">
            <motion.div
                animate={focused ? { boxShadow: '0 0 0 2px color-mix(in srgb, var(--sys-accent) 30%, transparent)' } : { boxShadow: '0 0 0 0px transparent' }}
                className="flex h-11 w-full overflow-hidden rounded-xl border border-sys-border bg-sys-bg-secondary transition-colors"
                style={{ borderColor: focused ? 'var(--sys-accent)' : undefined }}
            >
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="your@email.com"
                    className="flex-1 min-w-0 bg-transparent px-4 text-[13px] text-sys-text-primary outline-none placeholder:text-sys-text-secondary/50"
                    aria-label="Email Address"
                />
                <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={handleSubmit}
                    disabled={status === 'loading' || status === 'success'}
                    className="flex w-11 shrink-0 items-center justify-center transition-opacity disabled:opacity-70"
                    style={{ background: 'linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))' }}
                    aria-label="Subscribe"
                >
                    <AnimatePresence mode="wait">
                        {status === 'loading' && (
                            <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="material-icons-round animate-spin text-[16px] text-white">
                                refresh
                            </motion.span>
                        )}
                        {status === 'success' && (
                            <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }} className="material-icons-round text-[16px] text-white">
                                check
                            </motion.span>
                        )}
                        {(status === 'idle' || status === 'error') && (
                            <motion.span key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="material-icons-round text-[16px] text-white">
                                send
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </motion.div>

            <AnimatePresence>
                {status === 'success' && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-[11px] font-medium text-sys-success flex items-center gap-1"
                    >
                        <span className="material-icons-round text-[13px]">check_circle</span>
                        You're subscribed!
                    </motion.p>
                )}
                {status === 'error' && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-[11px] font-medium text-sys-error flex items-center gap-1"
                    >
                        <span className="material-icons-round text-[13px]">error</span>
                        Enter a valid email address.
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Main Footer ──────────────────────────────────────────────────────────────
export const Footer: React.FC = () => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const footerRef = useRef<HTMLElement>(null);
    const inView = useInView(footerRef, { once: true, amount: 0.1 });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return;
            try {
                const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    setUserProfile({
                        id: user.uid,
                        full_name: data.full_name ?? undefined,
                        email: data.email ?? user.email ?? undefined,
                        avatar_url: data.avatar_url ?? undefined,
                    });
                } else {
                    setUserProfile({
                        id: user.uid,
                        email: user.email ?? undefined,
                        full_name: user.displayName ?? undefined,
                        avatar_url: user.photoURL ?? undefined,
                    });
                }
            } catch {
                // silent fallback
            }
        });
        return () => unsubscribe();
    }, []);

    const stagger = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
    };
    const fadeUp = {
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
    };

    return (
        <footer
            ref={footerRef}
            className="relative mt-auto overflow-hidden border-t border-sys-border bg-sys-bg-primary pb-8 pt-0 text-sys-text-primary"
        >
            {/* ── Ambient background glow ── */}
            <div
                className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2"
                style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--sys-accent) 50%, transparent), transparent)' }}
            />
            <div
                className="pointer-events-none absolute left-0 top-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
                style={{ background: 'radial-gradient(circle, var(--sys-accent) 0%, transparent 70%)' }}
            />
            <div
                className="pointer-events-none absolute right-0 top-0 h-96 w-96 translate-x-1/2 -translate-y-1/4 rounded-full opacity-[0.05]"
                style={{ background: 'radial-gradient(circle, var(--sys-info) 0%, transparent 70%)' }}
            />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                {/* ── CTA Banner ── */}
                <RevealOnScroll>
                    <div
                        className="relative my-8 sm:my-12 overflow-hidden rounded-2xl border border-sys-border/60 p-6 sm:p-8 md:p-10"
                        style={{
                            background: 'linear-gradient(135deg, color-mix(in srgb, var(--sys-accent) 8%, transparent) 0%, color-mix(in srgb, var(--sys-info) 4%, transparent) 100%)',
                        }}
                    >
                        <div
                            className="pointer-events-none absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full opacity-20"
                            style={{ background: 'radial-gradient(circle, var(--sys-accent), transparent)' }}
                        />
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between text-center sm:text-left">
                            <div>
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sys-accent">
                                    Ready to deploy?
                                </p>
                                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-sys-text-primary md:text-4xl">
                                    Automate Your Quality Control
                                </h2>
                                <p className="mt-2 text-[13px] sm:text-[14px] text-sys-text-secondary">
                                    Deploy high-precision, AI-powered computer vision measurement systems directly to your production line.
                                </p>

                                {/* Stats row */}
                                <div className="mt-5 flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6">
                                    {STATS.map((s, i) => (
                                        <motion.div
                                            key={s.label}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={inView ? { opacity: 1, y: 0 } : {}}
                                            transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                                            className="text-center sm:text-left"
                                        >
                                            <p
                                                className="text-xl sm:text-2xl font-bold"
                                                style={{ color: 'var(--sys-accent)' }}
                                            >
                                                {s.value}
                                            </p>
                                            <p className="text-[11px] text-sys-text-secondary">{s.label}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                                <Link
                                    to="/demo"
                                    className="inline-flex w-full justify-center items-center gap-2 rounded-2xl px-7 py-3.5 text-[14px] font-semibold text-white transition-all"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--sys-accent) 0%, var(--sys-accent-dark) 100%)',
                                        boxShadow: '0 4px 20px color-mix(in srgb, var(--sys-accent) 40%, transparent)',
                                    }}
                                >
                                    Book a Demo
                                    <span className="material-icons-round text-[18px]">arrow_outward</span>
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </RevealOnScroll>

                {/* ── Main Grid ── */}
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-y-10 gap-x-8 pb-12"
                    variants={stagger}
                    initial="hidden"
                    animate={inView ? 'visible' : 'hidden'}
                >
                    {/* Brand column */}
                    <motion.div variants={fadeUp} className="sm:col-span-2 lg:col-span-4 lg:pr-8">
                        {/* Logo */}
                        <div className="mb-5 flex items-center justify-center sm:justify-start gap-3">
                            <div className="relative">
                                <div
                                    className="absolute inset-0 rounded-xl opacity-40 blur-md"
                                    style={{ background: 'var(--sys-accent)' }}
                                />
                                <div
                                    className="relative flex h-10 w-10 items-center justify-center rounded-xl"
                                    style={{ background: 'linear-gradient(135deg, var(--sys-accent) 0%, var(--sys-accent-dark) 100%)' }}
                                >
                                    <span className="material-icons-round text-white text-[20px]">
                                        precision_manufacturing
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col leading-none text-left">
                                <span className="text-[16px] font-bold tracking-tight text-sys-text-primary">
                                    Spectra
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sys-accent">
                                    Vision
                                </span>
                            </div>
                        </div>

                        {/* Signed-in user greeting */}
                        {userProfile && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-4 flex items-center gap-3 rounded-xl border border-sys-border/60 bg-sys-bg-secondary px-3 py-2.5"
                            >
                                {userProfile.avatar_url ? (
                                    <img
                                        src={userProfile.avatar_url}
                                        alt={userProfile.full_name}
                                        className="h-7 w-7 rounded-lg object-cover"
                                    />
                                ) : (
                                    <div
                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white shrink-0"
                                        style={{ background: 'linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))' }}
                                    >
                                        {getInitials(userProfile.full_name)}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-semibold text-sys-text-primary truncate">
                                        {userProfile.full_name ?? 'Welcome back!'}
                                    </p>
                                    <p className="text-[10px] text-sys-text-secondary truncate">
                                        {userProfile.email}
                                    </p>
                                </div>
                                <span
                                    className="h-1.5 w-1.5 rounded-full shrink-0"
                                    style={{ background: 'var(--sys-success)' }}
                                />
                            </motion.div>
                        )}

                        <p className="mb-6 text-[13px] leading-relaxed text-sys-text-secondary text-center sm:text-left">
                            Spectra provides an enterprise-grade AI vision system for automated dimension verification and quality control of industrial rods and pipes.
                        </p>

                        {/* Social icons */}
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                            {SOCIAL_LINKS.map(social => (
                                <motion.a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.92 }}
                                    className="group flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-sys-border/60 bg-sys-bg-secondary text-sys-text-secondary transition-all hover:border-transparent"
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.background = `${social.color}22`;
                                        (e.currentTarget as HTMLElement).style.color = social.color;
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.background = '';
                                        (e.currentTarget as HTMLElement).style.color = '';
                                    }}
                                >
                                    <span className="material-icons-round text-[18px]">{social.icon}</span>
                                </motion.a>
                            ))}
                        </div>
                    </motion.div>

                    {/* Navigation */}
                    <motion.div variants={fadeUp} className="col-span-1 lg:col-span-2">
                        <h4 className="mb-5 flex items-center justify-center sm:justify-start gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sys-accent">
                            <span className="material-icons-round text-[14px]">explore</span>
                            Platform
                        </h4>
                        <ul className="space-y-1 text-center sm:text-left flex flex-col items-center sm:items-start">
                            {NAV_LINKS.map(link => (
                                <li key={link.label} className="w-full max-w-[200px] sm:max-w-none">
                                    <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                                        <Link
                                            to={link.to}
                                            className="group flex items-center justify-center sm:justify-start gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-sys-text-secondary transition-colors hover:bg-sys-bg-secondary hover:text-sys-text-primary"
                                        >
                                            <span className="material-icons-round text-[15px] opacity-50 transition-opacity group-hover:opacity-100"
                                                style={{ color: 'var(--sys-accent)' }}>
                                                {link.icon}
                                            </span>
                                            {link.label}
                                        </Link>
                                    </motion.div>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Contact */}
                    <motion.div variants={fadeUp} className="col-span-1 lg:col-span-3">
                        <h4 className="mb-5 flex items-center justify-center sm:justify-start gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sys-accent">
                            <span className="material-icons-round text-[14px]">contact_support</span>
                            Contact
                        </h4>
                        <ul className="space-y-4 sm:space-y-3">
                            <li className="flex items-start justify-center sm:justify-start gap-2.5 text-[13px] text-sys-text-secondary text-center sm:text-left">
                                <span className="material-icons-round mt-0.5 text-[15px] opacity-60 hidden sm:block shrink-0">info</span>
                                <span>Built for industrial quality assurance and precision measurement.</span>
                            </li>
                            <li>
                                <motion.a
                                    href="mailto:support@spectra-vision.com"
                                    whileHover={{ x: 3 }}
                                    className="flex items-center justify-center sm:justify-start gap-2.5 text-[13px] text-sys-text-secondary transition-colors hover:text-sys-accent overflow-hidden"
                                >
                                    <span className="material-icons-round text-[15px] opacity-60 shrink-0">email</span>
                                    <span className="truncate">support@spectra-vision.com</span>
                                </motion.a>
                            </li>
                            <li>
                                <motion.a
                                    href="#"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ x: 3 }}
                                    className="flex items-center justify-center sm:justify-start gap-2.5 text-[13px] text-sys-text-secondary transition-colors hover:text-sys-accent overflow-hidden"
                                >
                                    <span className="material-icons-round text-[15px] opacity-60 shrink-0">public</span>
                                    <span className="truncate">spectra-vision.com</span>
                                    <span className="material-icons-round text-[12px] opacity-50 shrink-0 hidden sm:block">open_in_new</span>
                                </motion.a>
                            </li>
                        </ul>

                        {/* Availability badge */}
                        <div className="mt-5 flex sm:inline-flex justify-center items-center gap-2 rounded-xl border border-sys-success/20 bg-sys-success/10 px-3 py-2">
                            <motion.span
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ background: 'var(--sys-success)' }}
                            />
                            <span className="text-[11px] font-medium" style={{ color: 'var(--sys-success)' }}>
                                System Online & Ready
                            </span>
                        </div>
                    </motion.div>

                    {/* Newsletter */}
                    <motion.div variants={fadeUp} className="sm:col-span-2 lg:col-span-3">
                        <h4 className="mb-5 flex items-center justify-center sm:justify-start gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sys-accent">
                            <span className="material-icons-round text-[14px]">notifications_active</span>
                            Platform Updates
                        </h4>
                        <p className="mb-4 text-[13px] text-sys-text-secondary text-center sm:text-left">
                            Get notified about new detection models, analytics features, and system improvements.
                        </p>
                        <div className="flex justify-center sm:justify-start w-full">
                            <NewsletterInput prefillEmail={userProfile?.email} />
                        </div>

                        {/* Trust note */}
                        <p className="mt-4 flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-sys-text-secondary/60">
                            <span className="material-icons-round text-[13px] shrink-0">lock</span>
                            No spam. Unsubscribe anytime.
                        </p>
                    </motion.div>
                </motion.div>

                {/* ── Divider ── */}
                <div className="relative mb-6 h-px w-full mt-4">
                    <div className="absolute inset-0 bg-sys-border" />
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sys-border bg-sys-bg-primary px-3 py-1"
                    >
                        <span className="material-icons-round text-[14px] text-sys-accent">precision_manufacturing</span>
                    </div>
                </div>

                {/* ── Bottom Bar ── */}
                <RevealOnScroll delay={0.1}>
                    <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-4 pb-4">
                        {/* Copyright */}
                        <p className="text-[12px] text-sys-text-secondary text-center md:text-left">
                            © {new Date().getFullYear()}{' '}
                            <span className="font-semibold text-sys-text-primary">Spectra</span>
                            . All rights reserved.
                        </p>

                        {/* Language switcher */}
                        <LanguageSwitcher />

                        {/* Access links */}
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                                <Link
                                    to="/admin"
                                    className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-sys-border/60 bg-sys-bg-secondary px-4 py-2 sm:px-3 sm:py-1.5 text-[12px] font-medium text-sys-text-secondary transition-colors hover:border-sys-border hover:text-sys-text-primary"
                                >
                                    <span className="material-icons-round text-[13px]">admin_panel_settings</span>
                                    Admin Access
                                </Link>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                                <Link
                                    to="/login"
                                    className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-sys-border/60 bg-sys-bg-secondary px-4 py-2 sm:px-3 sm:py-1.5 text-[12px] font-medium text-sys-text-secondary transition-colors hover:border-sys-border hover:text-sys-text-primary"
                                >
                                    <span className="material-icons-round text-[13px]">login</span>
                                    Sign In
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </RevealOnScroll>
            </div>
        </footer>
    );
};

export default Footer;
