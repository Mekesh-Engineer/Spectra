import type { ReactNode } from "react";

interface CardProps {
    title?: string;
    children: ReactNode;
    className?: string;
}

export default function Card({ title, children, className }: CardProps) {
    return (
        <div className={`rounded-2xl border border-sys-border bg-sys-bg-secondary p-6 ${className ?? ""}`}>
            {title && <h3 className="text-sm font-semibold text-sys-text-secondary">{title}</h3>}
            <div className="mt-2">{children}</div>
        </div>
    );
}
