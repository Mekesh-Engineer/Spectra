import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
            <span className="material-icons-round text-[72px] text-sys-text-secondary">
                search_off
            </span>
            <h1 className="text-4xl font-bold text-sys-text-primary">404</h1>
            <p className="text-lg text-sys-text-secondary max-w-md">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link
                to="/"
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-sys-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
                <span className="material-icons-round text-[18px]">home</span>
                Back to Home
            </Link>
        </div>
    );
}
