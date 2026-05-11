import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

/**
 * Handles OAuth redirects and password-recovery redirects from Firebase.
 * - On password reset (oobCode) → shows an inline set-new-password form.
 * - On sign-in → redirects to the dashboard.
 */
export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");
    const isRecovery = mode === "resetPassword" && !!oobCode;

    const [recoveryMode, setRecoveryMode] = useState(isRecovery);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState("");

    useEffect(() => {
        // Verify the oobCode on mount for password recovery
        if (isRecovery && oobCode) {
            verifyPasswordResetCode(auth, oobCode)
                .then((email) => {
                    setRecoveryEmail(email);
                    setRecoveryMode(true);
                })
                .catch(() => {
                    setError("Invalid or expired password reset link.");
                });
            return;
        }

        // For OAuth redirects, listen for auth state
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && !recoveryMode) {
                navigate("/dashboard", { replace: true });
            }
        });

        return () => unsubscribe();
    }, [navigate, recoveryMode, isRecovery, oobCode]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newPassword || newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode!, newPassword);
            setSuccess(true);
            setTimeout(() => navigate("/login", { replace: true }), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    if (recoveryMode) {
        return (
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-16">
                <form
                    onSubmit={handleUpdatePassword}
                    className="w-full max-w-md rounded-2xl border border-sys-border bg-sys-bg-secondary p-8"
                >
                    <h1 className="text-2xl font-bold text-sys-text-primary">Set New Password</h1>
                    <p className="mt-1 text-sm text-sys-text-secondary">
                        {recoveryEmail
                            ? `Resetting password for ${recoveryEmail}`
                            : "Please choose a strong password for your account."}
                    </p>

                    {error && (
                        <p className="mt-4 rounded-lg border border-sys-error/30 bg-sys-error/10 p-3 text-sm text-sys-error">
                            {error}
                        </p>
                    )}
                    {success && (
                        <p className="mt-4 rounded-lg border border-sys-success/30 bg-sys-success/10 p-3 text-sm text-sys-success">
                            Password updated successfully! Redirecting to login…
                        </p>
                    )}

                    <label className="mt-6 block text-sm font-medium text-sys-text-primary">
                        New Password
                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={loading || success}
                            className="mt-1 block w-full rounded-lg border border-sys-border bg-sys-bg-primary px-4 py-2.5 text-sm text-sys-text-primary outline-none focus:border-sys-accent"
                        />
                    </label>

                    <label className="mt-4 block text-sm font-medium text-sys-text-primary">
                        Confirm Password
                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading || success}
                            className="mt-1 block w-full rounded-lg border border-sys-border bg-sys-bg-primary px-4 py-2.5 text-sm text-sys-text-primary outline-none focus:border-sys-accent"
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={loading || success}
                        className="mt-6 w-full rounded-lg bg-sys-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sys-accent-dark disabled:opacity-60"
                    >
                        {loading ? "Updating…" : success ? "Updated!" : "Update Password"}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div
                    className="h-10 w-10 rounded-full border-[3px] border-sys-border animate-spin"
                    style={{ borderTopColor: "var(--sys-accent)" }}
                />
                <p className="text-sm font-medium" style={{ color: "var(--sys-text-secondary)" }}>
                    Completing sign-in…
                </p>
            </div>
        </div>
    );
}
