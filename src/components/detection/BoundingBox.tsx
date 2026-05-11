import type { Detection } from "@shared/types/detection.types";

interface BoundingBoxProps {
    detection: Detection;
    color?: string;
}

export default function BoundingBox({
    detection,
    color = "#6366f1",
}: BoundingBoxProps) {
    const { x, y, width, height, label, confidence } = detection;

    return (
        <div
            className="bounding-box"
            style={{
                position: "absolute",
                left: x,
                top: y,
                width,
                height,
                border: `2px solid ${color}`,
                pointerEvents: "none",
            }}
        >
            <span
                className="bounding-box-label"
                style={{ backgroundColor: color, color: "#fff", fontSize: 11, padding: "1px 4px" }}
            >
                {label} {(confidence * 100).toFixed(0)}%
            </span>
        </div>
    );
}
