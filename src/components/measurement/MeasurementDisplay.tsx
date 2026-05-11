import type { MeasurementResult } from "@shared/types/measurement.types";

interface MeasurementDisplayProps {
    results: MeasurementResult[];
}

export default function MeasurementDisplay({ results }: MeasurementDisplayProps) {
    if (results.length === 0) {
        return <p className="text-sm text-sys-text-secondary">No measurements available.</p>;
    }

    return (
        <div>
            <h3 className="text-lg font-semibold text-sys-text-primary">Measurements</h3>
            <div className="mt-4 overflow-x-auto rounded-xl border border-sys-border">
                <table className="w-full text-left text-sm">
                    <thead className="bg-sys-bg-tertiary">
                        <tr>
                            <th className="px-4 py-2 font-medium text-sys-text-secondary">Label</th>
                            <th className="px-4 py-2 font-medium text-sys-text-secondary">Value</th>
                            <th className="px-4 py-2 font-medium text-sys-text-secondary">Unit</th>
                            <th className="px-4 py-2 font-medium text-sys-text-secondary">Confidence</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-sys-border">
                        {results.map((r, i) => (
                            <tr key={i}>
                                <td className="px-4 py-2 text-sys-text-primary">{r.label}</td>
                                <td className="px-4 py-2 text-sys-text-primary">{r.value.toFixed(2)}</td>
                                <td className="px-4 py-2 text-sys-text-secondary">{r.unit}</td>
                                <td className="px-4 py-2 text-sys-success">{(r.confidence * 100).toFixed(0)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
