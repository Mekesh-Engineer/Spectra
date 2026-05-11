import { useEffect, type ReactNode } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div
                className="relative mx-4 w-full max-w-lg rounded-2xl border border-sys-border bg-sys-bg-secondary p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {title && <h2 className="text-lg font-bold text-sys-text-primary">{title}</h2>}
                <div className="mt-4">{children}</div>
                <button
                    className="absolute right-4 top-4 text-xl text-sys-text-secondary hover:text-sys-text-primary"
                    onClick={onClose}
                >
                    &times;
                </button>
            </div>
        </div>
    );
}
