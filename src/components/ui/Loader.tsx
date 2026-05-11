interface LoaderProps {
    size?: number;
    className?: string;
}

export default function Loader({ size = 32, className }: LoaderProps) {
    return (
        <div className={`flex items-center justify-center ${className ?? ""}`}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="animate-spin text-sys-accent"
            >
                <circle cx="12" cy="12" r="10" opacity={0.25} />
                <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
        </div>
    );
}
