import type { Detection } from "@shared/types/detection.types";

interface DetectionOverlayProps {
    detections: Detection[];
    width: number;
    height: number;
}

export default function DetectionOverlay({
    detections,
    width,
    height,
}: DetectionOverlayProps) {
    return (
        <svg
            className="detection-overlay"
            viewBox={`0 0 ${width} ${height}`}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
            {detections.map((det) => (
                <BoundingBoxRect key={det.id} detection={det} />
            ))}
        </svg>
    );
}

function BoundingBoxRect({ detection }: { detection: Detection }) {
    const { x, y, width, height, label, confidence } = detection;
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2}
            />
            <text x={x} y={y - 4} fill="#6366f1" fontSize={12}>
                {label} ({(confidence * 100).toFixed(0)}%)
            </text>
        </g>
    );
}
