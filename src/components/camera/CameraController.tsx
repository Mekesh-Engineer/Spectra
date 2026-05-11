interface CameraControllerProps {
    isStreaming: boolean;
    onStart: () => void;
    onStop: () => void;
    onCapture: () => void;
}

export default function CameraController({
    isStreaming,
    onStart,
    onStop,
    onCapture,
}: CameraControllerProps) {
    return (
        <div className="flex gap-3">
            {isStreaming ? (
                <>
                    <button onClick={onCapture} className="rounded-lg bg-sys-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sys-accent-dark">
                        Capture
                    </button>
                    <button onClick={onStop} className="rounded-lg border border-sys-border px-4 py-2 text-sm text-sys-text-primary transition-colors hover:bg-sys-bg-tertiary">
                        Stop
                    </button>
                </>
            ) : (
                <button onClick={onStart} className="rounded-lg bg-sys-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sys-accent-dark">
                    Start Camera
                </button>
            )}
        </div>
    );
}
