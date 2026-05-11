interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-sys-surface-hover rounded-md ${className}`}
            aria-hidden="true"
        />
    );
}