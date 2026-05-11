import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger";
}

const variantClasses: Record<string, string> = {
    primary: "bg-sys-accent text-white hover:bg-sys-accent-dark",
    secondary: "border border-sys-border text-sys-text-primary hover:bg-sys-bg-tertiary",
    danger: "bg-sys-error text-white hover:bg-sys-error/80",
};

export default function Button({
    variant = "primary",
    className,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${variantClasses[variant]} ${className ?? ""}`}
            {...props}
        >
            {children}
        </button>
    );
}
