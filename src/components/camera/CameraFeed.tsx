import { useEffect, useRef } from "react";
import type { CameraSource } from "@/hooks/useCameraStream";

interface CameraFeedProps {
    stream: MediaStream | null;
    source: CameraSource;
    esp32Url?: string;
    videoRef?: React.RefObject<HTMLVideoElement | null>;
    imgRef?: React.RefObject<HTMLImageElement | null>;
    className?: string;
}

export default function CameraFeed({ stream, source, esp32Url, videoRef: externalVideoRef, imgRef: externalImgRef, className }: CameraFeedProps) {
    const internalVideoRef = useRef<HTMLVideoElement>(null);
    const videoEl = externalVideoRef ?? internalVideoRef;

    useEffect(() => {
        if (videoEl.current && stream && source === "webcam") {
            videoEl.current.srcObject = stream;
        }
    }, [stream, source, videoEl]);

    const isActive = source === "webcam" ? !!stream : !!esp32Url;

    return (
        <div className={`relative overflow-hidden rounded-2xl border border-sys-border bg-sys-bg-secondary ${className ?? ""}`}>
            {source === "webcam" ? (
                <video ref={videoEl} autoPlay playsInline muted className="h-full w-full object-cover" />
            ) : (
                <img
                    ref={externalImgRef}
                    src={esp32Url}
                    alt="ESP32-CAM feed"
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover"
                    onError={() => {
                        // Will show fallback if img fails
                    }}
                />
            )}
            {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-sys-text-secondary">No camera feed</p>
                </div>
            )}
        </div>
    );
}
