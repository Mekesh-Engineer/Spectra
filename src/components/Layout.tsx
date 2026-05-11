import { Outlet } from "react-router-dom";
import { Component, type ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

class ErrorBoundary extends Component<
    { children: ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
                    <span className="material-icons-round text-[48px] text-sys-error">error_outline</span>
                    <h2 className="text-xl font-bold text-sys-text-primary">Something went wrong</h2>
                    <p className="text-sm text-sys-text-secondary max-w-md">
                        {this.state.error?.message ?? "An unexpected error occurred."}
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                        className="mt-2 px-4 py-2 rounded-lg bg-sys-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function Layout() {
    return (
        <div className="flex min-h-screen flex-col bg-sys-bg-primary text-sys-text-primary font-sans">
            <Header />
            <main className="flex-1">
                <ErrorBoundary>
                    <Outlet />
                </ErrorBoundary>
            </main>
            <Footer />
        </div>
    );
}
