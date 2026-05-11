import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ResetPasswordPage() {
    const { resetPassword } = useAuth();

    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            await resetPassword(email);
            setSuccess("If an account with this email exists, a reset link has been sent.");
        } catch {
            // Use generic message to prevent account enumeration
            setSuccess("If an account with this email exists, a reset link has been sent.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-16">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md rounded-2xl border border-sys-border bg-sys-bg-secondary p-8"
            >
                <h1 className="text-2xl font-bold text-sys-text-primary">Reset Password</h1>
                <p className="mt-1 text-sm text-sys-text-secondary">We will send a reset link to your email.</p>

                {error && (
                    <p className="mt-4 rounded-lg border border-sys-error/30 bg-sys-error/10 p-3 text-sm text-sys-error">
                        {error}
                    </p>
                )}
                {success && (
                    <p className="mt-4 rounded-lg border border-sys-success/30 bg-sys-success/10 p-3 text-sm text-sys-success">
                        {success}
                    </p>
                )}

                <label className="mt-6 block text-sm font-medium text-sys-text-primary">
                    Email
                    <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-sys-border bg-sys-bg-primary px-4 py-2.5 text-sm text-sys-text-primary outline-none focus:border-sys-accent"
                    />
                </label>

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 w-full rounded-lg bg-sys-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sys-accent-dark disabled:opacity-60"
                >
                    {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <p className="mt-6 text-center text-sm text-sys-text-secondary">
                    <Link to="/login" className="text-sys-accent hover:underline">
                        Back to Sign In
                    </Link>
                </p>
            </form>
        </div>
    );
}
