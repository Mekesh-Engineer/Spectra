import type { MeasurementResult } from "@shared/types/measurement.types";

interface DimensionOverlayProps {
    measurements: MeasurementResult[];
    width: number;
    height: number;
}

export default function DimensionOverlay({
    measurements,
    width,
    height,
}: DimensionOverlayProps) {
    return (
        <svg
            className="dimension-overlay"
            viewBox={`0 0 ${width} ${height}`}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
            {measurements.map((m, i) => (
                <text key={i} x={10} y={20 + i * 18} fill="#10b981" fontSize={14}>
                    {m.label}: {m.value.toFixed(2)} {m.unit}
                </text>
            ))}
        </svg>
    );
}
