import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/lib/firebase';
import { updatePassword } from 'firebase/auth';

// ─── Animation constants ──────────────────────────────────────────────────────
const EASE = [0.32, 0.72, 0, 1] as const;

const fadeUp = (delay = 0) => ({
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: EASE } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
});

// ─── Decorative SVGs ──────────────────────────────────────────────────────────
const BrandIcon = ({ size = 40 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none">
        <defs>
            <linearGradient id="lp-tile" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--sys-accent-light, #ff8a57)" />
                <stop offset="100%" stopColor="var(--sys-accent-dark, #e65100)" />
            </linearGradient>
        </defs>
        <rect x="56" y="56" width="400" height="400" rx="96" ry="96" fill="url(#lp-tile)" />
        <g transform="translate(160 160) scale(8)">
            <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" fill="white" />
            <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="white" />
        </g>
    </svg>
);

const GoogleLogo = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const ShieldIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ─── Left branding panel ──────────────────────────────────────────────────────
const BrandPanel = () => (
    <div
        className="hidden lg:flex flex-col justify-between relative overflow-hidden"
        style={{
            background: 'linear-gradient(145deg, #1a1014 0%, #0f0d0c 50%, #1a1108 100%)',
            minWidth: 0,
            flex: '0 0 45%',
            padding: '48px',
        }}
    >
        <svg viewBox="0 0 600 900" fill="none" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.055]" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 30 }).map((_, i) => (
                <path key={i} d={`M${-100 + i * 38} 0 Q${200 + i * 38} 450, ${-100 + i * 38 + 340} 900`} stroke="white" strokeWidth="1.2" fill="none" />
            ))}
        </svg>

        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72" style={{ background: 'radial-gradient(circle at 0% 100%, rgba(220, 38, 38, 0.25) 0%, transparent 65%)' }} />
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(220, 38, 38, 0.15) 0%, transparent 65%)' }} />

        <motion.div className="relative z-10 flex items-center gap-3" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <div style={{ boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)', borderRadius: 18 }}>
                <BrandIcon size={44} />
            </div>
            <div>
                <p className="text-[17px] font-black leading-none tracking-tight text-white" style={{ letterSpacing: '-0.025em' }}>
                    Spectra<span style={{ color: 'var(--sys-accent)' }}>Vision</span>
                </p>
                <p className="mt-0.5 text-[11px] font-medium tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                    Enterprise AI Platform
                </p>
            </div>
        </motion.div>

        <motion.div className="relative z-10 flex flex-col gap-4" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.72, delay: 0.18, ease: EASE }}>
            <div className="overflow-hidden rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', padding: '18px 20px' }}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--sys-accent-light)' }}>
                    System Metrics
                </p>
                <div className="grid grid-cols-3 gap-3">
                    {[{ label: 'Cameras', val: '04' }, { label: 'Inferences', val: '1.2m' }, { label: 'Defects', val: '12' }].map(({ label, val }) => (
                        <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="text-[18px] font-black leading-none text-white">{val}</p>
                            <p className="mt-1 text-[9px]" style={{ color: '#9ca3af' }}>{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {[
                { icon: 'precision_manufacturing', text: 'Sub-millimeter measurement accuracy' },
                { icon: 'analytics', text: 'Real-time SPC and analytics' },
                { icon: 'api', text: 'Enterprise ERP integration' },
            ].map(({ icon, text }, i) => (
                <motion.div key={text} className="flex items-center gap-3" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.1, duration: 0.45, ease: EASE }}>
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.25)' }}>
                        <span className="material-icons-round text-[15px]" style={{ color: 'var(--sys-accent-light)' }}>{icon}</span>
                    </div>
                    <p className="text-[13px] font-medium" style={{ color: '#d1d5db' }}>{text}</p>
                </motion.div>
            ))}
        </motion.div>

        <motion.p className="relative z-10 text-[12px] leading-relaxed" style={{ color: 'rgba(156,163,175,0.6)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            © {new Date().getFullYear()} Spectra — Secure Access Portal
        </motion.p>
    </div>
);

// ─── Shared input component ───────────────────────────────────────────────────
interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon: string;
    error?: string | null;
    rightSlot?: React.ReactNode;
}

const AuthInput = ({ label, icon, error, rightSlot, ...rest }: AuthInputProps) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[13px] font-semibold" style={{ color: 'var(--sys-text-primary)' }}>
            {label}
        </label>
        <div className="relative flex items-center w-full">
            <span className="material-icons-round pointer-events-none absolute left-4 text-[18px] select-none" style={{ color: 'var(--sys-text-secondary)' }}>
                {icon}
            </span>
            <input
                {...rest}
                style={{
                    width: '100%',
                    height: 48,
                    background: 'var(--sys-bg-tertiary)',
                    border: error ? '1.5px solid var(--sys-error)' : '1.5px solid var(--sys-border)',
                    borderRadius: 12,
                    padding: '0 44px 0 44px',
                    fontSize: 15,
                    color: 'var(--sys-text-primary)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                    e.currentTarget.style.borderColor = error ? 'var(--sys-error)' : 'var(--sys-accent)';
                    e.currentTarget.style.boxShadow = error ? '0 0 0 3px rgba(220, 38, 38, 0.16)' : '0 0 0 3px rgba(220, 38, 38, 0.18)';
                }}
                onBlur={e => {
                    e.currentTarget.style.borderColor = error ? 'var(--sys-error)' : 'var(--sys-border)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            />
            {rightSlot && <div className="absolute right-3">{rightSlot}</div>}
        </div>
    </div>
);

// ─── Modal Component ──────────────────────────────────────────────────────────
type ViewState = 'login' | 'register' | 'forgot' | 'update';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialView?: ViewState;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, initialView = 'login' }) => {
    const { login, register, resetPassword, loginWithGoogle } = useAuth();

    // View state
    const [view, setView] = useState<ViewState>(initialView);

    // Form states
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const [shakeKey, setShakeKey] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Reset when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setEmail('');
            setFullName('');
            setPassword('');
            setRegisterPassword('');
            setRegisterConfirmPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setErrorMsg(null);
            setSuccessMsg(null);
            setIsLoading(false);
            setGoogleLoading(false);
            setSubmitSuccess(false);
            setShowPassword(false);
            setView(initialView);
        } else {
            setView(initialView);
        }
    }, [isOpen, initialView]);

    useEffect(() => {
        setErrorMsg(null);
        setSuccessMsg(null);
        setSubmitSuccess(false);
    }, [view]);

    // ─── Handlers ───
    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!email || !password) {
            setErrorMsg("Email and password are required");
            setShakeKey(k => k + 1);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setErrorMsg('Please enter a valid email address.');
            setShakeKey(k => k + 1);
            return;
        }

        setIsLoading(true);
        try {
            await login(email, password);
            setSubmitSuccess(true);
            setTimeout(() => {
                onSuccess?.();
            }, 600);
        } catch (err) {
            setShakeKey(k => k + 1);
            setErrorMsg(err instanceof Error ? err.message : 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!email.trim()) {
            setErrorMsg('Please enter your account email.');
            setShakeKey(k => k + 1);
            return;
        }

        setIsLoading(true);
        try {
            await resetPassword(email.trim());
            setSuccessMsg('Check your email for password reset instructions.');
            setSubmitSuccess(true);
        } catch (err) {
            setShakeKey(k => k + 1);
            setErrorMsg(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!email.trim()) {
            setErrorMsg('Please enter your email address.');
            setShakeKey(k => k + 1);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setErrorMsg('Please enter a valid email address.');
            setShakeKey(k => k + 1);
            return;
        }

        if (!registerPassword || registerPassword.length < 8) {
            setErrorMsg('Password must be at least 8 characters long.');
            setShakeKey(k => k + 1);
            return;
        }

        if (registerPassword !== registerConfirmPassword) {
            setErrorMsg('Passwords do not match.');
            setShakeKey(k => k + 1);
            return;
        }

        setIsLoading(true);
        try {
            await register(email.trim(), registerPassword, fullName.trim() || undefined);
            setSubmitSuccess(true);
            setSuccessMsg('Account created. Check your email to confirm your account.');
            setTimeout(() => {
                setView('login');
                setFullName('');
                setPassword('');
                setRegisterPassword('');
                setRegisterConfirmPassword('');
                setSubmitSuccess(false);
            }, 1200);
        } catch (err) {
            setShakeKey(k => k + 1);
            setErrorMsg(err instanceof Error ? err.message : 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!newPassword || newPassword.length < 6) {
            setErrorMsg('Password must be at least 6 characters long.');
            setShakeKey(k => k + 1);
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match.');
            setShakeKey(k => k + 1);
            return;
        }

        setIsLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');
            await updatePassword(user, newPassword);

            setSubmitSuccess(true);
            setSuccessMsg('Password updated successfully!');
            setTimeout(() => {
                setView('login');
                setSubmitSuccess(false);
                setSuccessMsg(null);
                setPassword('');
            }, 1500);
        } catch (err) {
            setShakeKey(k => k + 1);
            setErrorMsg(err instanceof Error ? err.message : 'Failed to update password.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setErrorMsg(null);
        try {
            await loginWithGoogle();
            setSubmitSuccess(true);
            setSuccessMsg('Signed in with Google. Redirecting...');
            setTimeout(() => onSuccess?.(), 600);
        } catch (err) {
            setShakeKey(k => k + 1);
            setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const Spinner = ({ size = 18, color = 'white' }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ color }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
                    style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)' }}
                    onClick={onClose}
                >
                    <motion.div
                        key={shakeKey}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.96, y: 20 }}
                        animate={shakeKey > 0 ? { x: [0, -9, 9, -7, 7, -4, 4, 0] } : { opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 10 }}
                        transition={shakeKey > 0 ? { duration: 0.45 } : { duration: 0.45, ease: EASE }}
                        className="relative flex w-full overflow-hidden shadow-2xl"
                        style={{
                            maxWidth: 900,
                            minHeight: 560,
                            borderRadius: 24,
                            border: '1px solid var(--sys-border)',
                            background: 'var(--sys-bg-primary)',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
                        }}
                    >
                        <BrandPanel />

                        <div className="relative flex flex-1 flex-col justify-center px-8 py-12 sm:px-10" style={{ background: 'var(--sys-bg-secondary)', minWidth: 0 }}>
                            <button
                                onClick={onClose}
                                className="absolute right-5 top-5 rounded-full p-2 transition-colors focus:outline-none hover:bg-[var(--sys-bg-tertiary)]"
                                style={{ color: 'var(--sys-text-secondary)' }}
                                aria-label="Close modal"
                            >
                                <span className="material-icons-round text-[22px]">close</span>
                            </button>

                            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
                                <div style={{ boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)', borderRadius: 12 }}>
                                    <BrandIcon size={34} />
                                </div>
                                <p className="text-[15px] font-black tracking-tight" style={{ color: 'var(--sys-text-primary)', letterSpacing: '-0.025em' }}>
                                    Spectra<span style={{ color: 'var(--sys-accent)' }}>Vision</span>
                                </p>
                            </div>

                            {/* View Content Manager */}
                            <AnimatePresence mode="wait">
                                {/* LOGIN VIEW */}
                                {view === 'login' && (
                                    <motion.div key="login" variants={fadeUp(0.05)} initial="hidden" animate="visible" exit="exit" className="flex flex-col w-full">
                                        <div className="mb-6">
                                            <h2 className="font-black leading-tight tracking-tight" style={{ fontSize: 'clamp(24px, 3vw, 30px)', letterSpacing: '-0.025em', color: 'var(--sys-text-primary)' }}>
                                                Welcome back
                                            </h2>
                                            <p className="mt-1.5 text-[14px]" style={{ color: 'var(--sys-text-secondary)' }}>
                                                Sign in to your Spectra dashboard
                                            </p>
                                        </div>

                                        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5 w-full" noValidate>
                                            <AuthInput
                                                label="Email address" icon="mail_outline" type="email" value={email}
                                                onChange={(e) => setEmail(e.target.value)} placeholder="operator@spectra.dev"
                                                error={errorMsg && !email ? 'Email required' : null} disabled={isLoading} autoComplete="email"
                                            />
                                            <div>
                                                <AuthInput
                                                    label="Password" icon="lock_outline" type={showPassword ? 'text' : 'password'} value={password}
                                                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                                                    error={errorMsg && !password ? 'Password required' : null} disabled={isLoading} autoComplete="current-password"
                                                    rightSlot={
                                                        <button
                                                            type="button" onClick={() => setShowPassword(!showPassword)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                                                            style={{ color: 'var(--sys-text-secondary)' }}
                                                        >
                                                            <span className="material-icons-round text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                                        </button>
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setView('forgot')}
                                                    disabled={isLoading || googleLoading}
                                                    className="mt-2 inline-block text-[13px] font-semibold transition-all hover:opacity-80"
                                                    style={{ color: 'var(--sys-accent)', cursor: isLoading || googleLoading ? 'not-allowed' : 'pointer' }}
                                                >
                                                    Forgot password?
                                                </button>
                                            </div>

                                            <motion.button
                                                type="submit" disabled={isLoading || submitSuccess}
                                                whileHover={!isLoading ? { scale: 1.02, y: -1 } : {}}
                                                whileTap={!isLoading ? { scale: 0.98 } : {}}
                                                className="relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl text-[15px] font-bold text-white transition-all"
                                                style={{
                                                    background: submitSuccess ? 'var(--sys-success)' : 'linear-gradient(135deg, var(--sys-accent) 0%, var(--sys-accent-dark) 100%)',
                                                    boxShadow: submitSuccess ? '0 4px 20px rgba(5, 150, 105, 0.4)' : '0 4px 20px rgba(220, 38, 38, 0.35)',
                                                    opacity: isLoading ? 0.85 : 1,
                                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                {isLoading && <Spinner />}
                                                {submitSuccess && <span className="material-icons-round text-[19px]">check_circle</span>}
                                                <span>{isLoading ? 'Signing in…' : submitSuccess ? 'Success!' : 'Sign In'}</span>
                                                {!isLoading && !submitSuccess && <span className="material-icons-round text-[18px]">arrow_forward</span>}
                                            </motion.button>

                                            <p className="text-[13px] text-center" style={{ color: 'var(--sys-text-secondary)' }}>
                                                New to Spectra?{' '}
                                                <button
                                                    type="button"
                                                    onClick={() => setView('register')}
                                                    disabled={isLoading || googleLoading}
                                                    className="font-semibold hover:opacity-80"
                                                    style={{ color: 'var(--sys-accent)', cursor: isLoading || googleLoading ? 'not-allowed' : 'pointer' }}
                                                >
                                                    Create account
                                                </button>
                                            </p>
                                        </form>

                                        <div className="my-6 flex items-center gap-3 w-full">
                                            <div className="h-px flex-1" style={{ background: 'var(--sys-border)' }} />
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--sys-text-secondary)' }}>or continue with</span>
                                            <div className="h-px flex-1" style={{ background: 'var(--sys-border)' }} />
                                        </div>

                                        <motion.button
                                            type="button" onClick={handleGoogleLogin} disabled={googleLoading || isLoading}
                                            whileHover={{ scale: 1.02, borderColor: 'var(--sys-accent)' }} whileTap={{ scale: 0.98 }}
                                            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl text-[14px] font-semibold transition-all"
                                            style={{ background: 'var(--sys-bg-tertiary)', border: '1.5px solid var(--sys-border)', color: 'var(--sys-text-primary)', opacity: googleLoading ? 0.75 : 1 }}
                                        >
                                            {googleLoading ? <Spinner size={16} color="var(--sys-text-secondary)" /> : <GoogleLogo />}
                                            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                                        </motion.button>
                                    </motion.div>
                                )}

                                {/* REGISTER VIEW */}
                                {view === 'register' && (
                                    <motion.div key="register" variants={fadeUp(0.05)} initial="hidden" animate="visible" exit="exit" className="flex flex-col w-full">
                                        <div className="mb-6">
                                            <button
                                                type="button"
                                                onClick={() => setView('login')}
                                                className="mb-4 flex items-center gap-1 text-[13px] font-semibold hover:underline"
                                                style={{ color: 'var(--sys-text-secondary)' }}
                                            >
                                                <span className="material-icons-round text-[16px]">arrow_back</span> Back to login
                                            </button>
                                            <h2 className="font-black leading-tight tracking-tight" style={{ fontSize: 'clamp(24px, 3vw, 30px)', letterSpacing: '-0.025em', color: 'var(--sys-text-primary)' }}>
                                                Create account
                                            </h2>
                                            <p className="mt-1.5 text-[14px]" style={{ color: 'var(--sys-text-secondary)' }}>
                                                Set up your Spectra operator account.
                                            </p>
                                        </div>

                                        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5 w-full" noValidate>
                                            <AuthInput
                                                label="Full name"
                                                icon="person_outline"
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Jane Doe"
                                                disabled={isLoading || submitSuccess}
                                                autoComplete="name"
                                            />
                                            <AuthInput
                                                label="Email address"
                                                icon="mail_outline"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="operator@spectra.dev"
                                                error={errorMsg && !email ? 'Email required' : null}
                                                disabled={isLoading || submitSuccess}
                                                autoComplete="email"
                                            />
                                            <AuthInput
                                                label="Password"
                                                icon="lock_outline"
                                                type={showPassword ? 'text' : 'password'}
                                                value={registerPassword}
                                                onChange={(e) => setRegisterPassword(e.target.value)}
                                                placeholder="••••••••"
                                                error={errorMsg && !registerPassword ? 'Password required' : null}
                                                disabled={isLoading || submitSuccess}
                                                autoComplete="new-password"
                                                rightSlot={
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                                                        style={{ color: 'var(--sys-text-secondary)' }}
                                                    >
                                                        <span className="material-icons-round text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                                    </button>
                                                }
                                            />
                                            <AuthInput
                                                label="Confirm Password"
                                                icon="lock_outline"
                                                type={showPassword ? 'text' : 'password'}
                                                value={registerConfirmPassword}
                                                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                error={errorMsg && !registerConfirmPassword ? 'Confirmation required' : null}
                                                disabled={isLoading || submitSuccess}
                                                autoComplete="new-password"
                                            />

                                            <motion.button
                                                type="submit"
                                                disabled={isLoading || submitSuccess}
                                                whileHover={!isLoading && !submitSuccess ? { scale: 1.02, y: -1 } : {}}
                                                whileTap={!isLoading && !submitSuccess ? { scale: 0.98 } : {}}
                                                className="relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl text-[15px] font-bold text-white transition-all"
                                                style={{
                                                    background: submitSuccess ? 'var(--sys-success)' : 'linear-gradient(135deg, var(--sys-accent) 0%, var(--sys-accent-dark) 100%)',
                                                    boxShadow: submitSuccess ? '0 4px 20px rgba(5, 150, 105, 0.4)' : '0 4px 20px rgba(220, 38, 38, 0.35)',
                                                    opacity: isLoading || submitSuccess ? 0.85 : 1,
                                                    cursor: isLoading || submitSuccess ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                {isLoading && <Spinner />}
                                                {submitSuccess && <span className="material-icons-round text-[19px]">check_circle</span>}
                                                <span>{isLoading ? 'Creating account...' : submitSuccess ? 'Account Created!' : 'Register'}</span>
                                            </motion.button>
                                        </form>
                                    </motion.div>
                                )}

                                {/* FORGOT PASSWORD VIEW */}
                                {view === 'forgot' && (
                                    <motion.div key="forgot" variants={fadeUp(0.05)} initial="hidden" animate="visible" exit="exit" className="flex flex-col w-full">
                                        <div className="mb-6">
                                            <button
                                                onClick={() => { setView('login'); setErrorMsg(null); setSuccessMsg(null); setSubmitSuccess(false); }}
                                                className="mb-4 flex items-center gap-1 text-[13px] font-semibold hover:underline" style={{ color: 'var(--sys-text-secondary)' }}
                                            >
                                                <span className="material-icons-round text-[16px]">arrow_back</span> Back to login
                                            </button>
                                            <h2 className="font-black leading-tight tracking-tight" style={{ fontSize: 'clamp(24px, 3vw, 30px)', letterSpacing: '-0.025em', color: 'var(--sys-text-primary)' }}>
                                                Reset Password
                                            </h2>
                                            <p className="mt-1.5 text-[14px]" style={{ color: 'var(--sys-text-secondary)' }}>
                                                Enter your email and we'll send you a recovery link.
                                            </p>
                                        </div>

                                        <form onSubmit={handleForgotSubmit} className="flex flex-col gap-5 w-full" noValidate>
                                            <AuthInput
                                                label="Email address" icon="mail_outline" type="email" value={email}
                                                onChange={(e) => setEmail(e.target.value)} placeholder="operator@spectra.dev"
                                                error={errorMsg && !email ? 'Email required' : null} disabled={isLoading || submitSuccess} autoComplete="email"
                                            />

                                            <motion.button
                                                type="submit" disabled={isLoading || submitSuccess}
                                                whileHover={!isLoading && !submitSuccess ? { scale: 1.02, y: -1 } : {}}
                                                whileTap={!isLoading && !submitSuccess ? { scale: 0.98 } : {}}
                                                className="relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl text-[15px] font-bold text-white transition-all"
                                                style={{
                                                    background: submitSuccess ? 'var(--sys-success)' : 'linear-gradient(135deg, var(--sys-accent) 0%, var(--sys-accent-dark) 100%)',
                                                    boxShadow: submitSuccess ? '0 4px 20px rgba(5, 150, 105, 0.4)' : '0 4px 20px rgba(220, 38, 38, 0.35)',
                                                    opacity: isLoading || submitSuccess ? 0.85 : 1,
                                                    cursor: isLoading || submitSuccess ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                {isLoading && <Spinner />}
                                                {submitSuccess && <span className="material-icons-round text-[19px]">check_circle</span>}
                                                <span>{isLoading ? 'Sending...' : submitSuccess ? 'Link Sent!' : 'Send Reset Link'}</span>
                                            </motion.button>
                                        </form>
                                    </motion.div>
                                )}

                                {/* UPDATE PASSWORD VIEW */}
                                {view === 'update' && (
                                    <motion.div key="update" variants={fadeUp(0.05)} initial="hidden" animate="visible" exit="exit" className="flex flex-col w-full">
                                        <div className="mb-6">
                                            <h2 className="font-black leading-tight tracking-tight" style={{ fontSize: 'clamp(24px, 3vw, 30px)', letterSpacing: '-0.025em', color: 'var(--sys-text-primary)' }}>
                                                Set New Password
                                            </h2>
                                            <p className="mt-1.5 text-[14px]" style={{ color: 'var(--sys-text-secondary)' }}>
                                                Please choose a strong password for your account.
                                            </p>
                                        </div>

                                        <form onSubmit={handleUpdatePasswordSubmit} className="flex flex-col gap-5 w-full" noValidate>
                                            <AuthInput
                                                label="New Password" icon="lock_outline" type={showPassword ? 'text' : 'password'} value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
                                                error={errorMsg && !newPassword ? 'Password required' : null} disabled={isLoading || submitSuccess}
                                                rightSlot={
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors" style={{ color: 'var(--sys-text-secondary)' }}>
                                                        <span className="material-icons-round text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                                    </button>
                                                }
                                            />
                                            <AuthInput
                                                label="Confirm Password" icon="lock_outline" type={showPassword ? 'text' : 'password'} value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                                                error={errorMsg && !confirmPassword ? 'Confirmation required' : null} disabled={isLoading || submitSuccess}
                                            />

                                            <motion.button
                                                type="submit" disabled={isLoading || submitSuccess}
                                                whileHover={!isLoading && !submitSuccess ? { scale: 1.02, y: -1 } : {}}
                                                whileTap={!isLoading && !submitSuccess ? { scale: 0.98 } : {}}
                                                className="relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl text-[15px] font-bold text-white transition-all mt-2"
                                                style={{
                                                    background: submitSuccess ? 'var(--sys-success)' : 'linear-gradient(135deg, var(--sys-accent) 0%, var(--sys-accent-dark) 100%)',
                                                    boxShadow: submitSuccess ? '0 4px 20px rgba(5, 150, 105, 0.4)' : '0 4px 20px rgba(220, 38, 38, 0.35)',
                                                    opacity: isLoading || submitSuccess ? 0.85 : 1,
                                                    cursor: isLoading || submitSuccess ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                {isLoading && <Spinner />}
                                                {submitSuccess && <span className="material-icons-round text-[19px]">check_circle</span>}
                                                <span>{isLoading ? 'Updating...' : submitSuccess ? 'Updated!' : 'Update Password'}</span>
                                            </motion.button>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Alert Notifications mapped below forms */}
                            <div className="mt-5 w-full">
                                <AnimatePresence>
                                    {errorMsg && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-xl bg-[var(--sys-error)] bg-opacity-10 border border-[var(--sys-error)] border-opacity-30 px-4 py-3">
                                            <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--sys-error)' }}>
                                                <span className="material-icons-round text-[16px]">error_outline</span> {errorMsg}
                                            </p>
                                        </motion.div>
                                    )}
                                    {successMsg && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-xl bg-[var(--sys-success)] bg-opacity-10 border border-[var(--sys-success)] border-opacity-30 px-4 py-3">
                                            <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--sys-success)' }}>
                                                <span className="material-icons-round text-[16px]">check_circle</span> {successMsg}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <motion.div className="mt-auto pt-6 flex items-center justify-center gap-2" variants={fadeUp(0.36)} initial="hidden" animate="visible">
                                <span style={{ color: 'var(--sys-text-secondary)' }}><ShieldIcon /></span>
                                <p className="text-[12px] font-medium" style={{ color: 'var(--sys-text-secondary)' }}>
                                    Secure authentication · Authorized personnel only
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

interface AuthModalRouteProps {
    initialView?: ViewState;
}

export const AuthModalRoute: React.FC<AuthModalRouteProps> = ({ initialView = 'login' }) => {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useAuth();

    // Already authenticated → go straight to dashboard
    useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [loading, isAuthenticated, navigate]);

    const handleClose = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate('/');
    };

    if (loading || isAuthenticated) return null;

    return (
        <AuthModal
            isOpen
            onClose={handleClose}
            onSuccess={() => navigate('/dashboard')}
            initialView={initialView}
        />
    );
};
