interface AnalyticsChartsProps {
    data: { label: string; value: number }[];
}

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
    const max = Math.max(...data.map((d) => d.value), 1);

    return (
        <div className="rounded-2xl border border-sys-border bg-sys-bg-secondary p-6">
            <h3 className="text-lg font-semibold text-sys-text-primary">Analytics</h3>
            <div className="mt-6 space-y-5">
                {data.map((item) => (
                    <div key={item.label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-sys-text-secondary">{item.label}</span>
                            <span className="font-medium text-sys-text-primary">{item.value}</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-sys-bg-tertiary">
                            <div
                                className="h-2.5 rounded-full bg-sys-accent transition-all"
                                style={{ width: `${(item.value / max) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
