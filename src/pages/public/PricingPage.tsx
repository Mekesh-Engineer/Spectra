import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// ─── Data ────────────────────────────────────────────────────────────────────
const plans = [
    {
        name: "Starter",
        monthly: 0, annual: 0, isCustom: false,
        period: "Free forever",
        description: "For evaluation and small-scale testing.",
        features: ["5 inspections / day", "Basic measurements", "Single camera", "Community support", "7-day data retention"],
        cta: "Get Started",
        to: "/register",
        featured: false,
    },
    {
        name: "Pro",
        monthly: 49, annual: 39, isCustom: false,
        period: "/mo",
        description: "For production inspection lines.",
        features: ["Unlimited inspections", "Advanced analytics & reports", "Up to 5 cameras", "Priority support", "90-day data retention", "CSV / JSON export", "Custom alert rules"],
        cta: "Start Free Trial",
        to: "/register",
        featured: true,
    },
    {
        name: "Enterprise",
        monthly: 0, annual: 0, isCustom: true,
        period: "",
        description: "For large-scale industrial deployments.",
        features: ["Everything in Pro", "Unlimited cameras", "On-premise deployment", "Custom integrations (PLC, ERP, MES)", "Dedicated support & SLA", "Unlimited data retention", "Custom AI model training"],
        cta: "Contact Sales",
        to: "/docs",
        featured: false,
    },
];

const comparisonFeatures = [
    { name: "Inspections / Day", starter: "5", pro: "Unlimited", enterprise: "Unlimited" },
    { name: "Cameras", starter: "1", pro: "5", enterprise: "Unlimited" },
    { name: "Analytics", starter: "Basic", pro: "Advanced", enterprise: "Advanced + Custom" },
    { name: "Data Retention", starter: "7 days", pro: "90 days", enterprise: "Unlimited" },
    { name: "Export", starter: "—", pro: "CSV / JSON", enterprise: "CSV / JSON / API" },
    { name: "Support", starter: "Community", pro: "Priority", enterprise: "Dedicated + SLA" },
    { name: "Custom Models", starter: "—", pro: "—", enterprise: "✓" },
    { name: "On-Premise", starter: "—", pro: "—", enterprise: "✓" },
];

// ─── Animations ──────────────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

// ─── Component ───────────────────────────────────────────────────────────────
export default function PricingPage() {
    const [annual, setAnnual] = useState(false);

    return (
        <motion.div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8" variants={container} initial="hidden" animate="visible">
            {/* Header */}
            <motion.div variants={fadeUp} className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-sys-accent/30 bg-sys-accent/8 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-sys-accent">
                    <span className="material-icons-round text-[14px]">sell</span>
                    Pricing
                </span>
                <h1 className="mt-5 text-3xl font-bold tracking-tight text-sys-text-primary sm:text-4xl">
                    Choose the Plan That Fits
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-sys-text-secondary">
                    Start free and scale as your inspection needs grow.
                </p>

                {/* Billing Toggle */}
                <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-sys-border bg-sys-bg-secondary p-1.5">
                    <button
                        onClick={() => setAnnual(false)}
                        className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${!annual ? "bg-sys-accent text-white shadow-sm" : "text-sys-text-secondary"}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setAnnual(true)}
                        className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${annual ? "bg-sys-accent text-white shadow-sm" : "text-sys-text-secondary"}`}
                    >
                        Annual
                        <span className="ml-1.5 rounded-full bg-sys-success/15 px-2 py-0.5 text-[10px] font-bold text-sys-success">
                            Save 20%
                        </span>
                    </button>
                </div>
            </motion.div>

            {/* Pricing Cards */}
            <motion.div variants={container} className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {plans.map((plan) => {
                    const price = plan.isCustom ? "Custom" : annual ? `$${plan.annual}` : plan.monthly === 0 ? "Free" : `$${plan.monthly}`;
                    return (
                        <motion.div
                            key={plan.name}
                            variants={fadeUp}
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                            className={`relative flex flex-col rounded-2xl border p-8 transition-all ${plan.featured
                                ? "border-sys-accent shadow-lg"
                                : "border-sys-border bg-sys-bg-secondary"
                                }`}
                            style={plan.featured ? {
                                background: "var(--sys-bg-secondary)",
                                boxShadow: "0 8px 40px color-mix(in srgb, var(--sys-accent) 15%, transparent)",
                            } : {}}
                        >
                            {plan.featured && (
                                <span
                                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[11px] font-bold text-white"
                                    style={{ background: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))" }}
                                >
                                    Most Popular
                                </span>
                            )}
                            <h2 className="text-xl font-bold text-sys-text-primary">{plan.name}</h2>
                            <p className="mt-1 text-sm text-sys-text-secondary">{plan.description}</p>
                            <div className="mt-6">
                                <motion.span
                                    key={price}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-4xl font-extrabold tracking-tight text-sys-text-primary"
                                >
                                    {price}
                                </motion.span>
                                {!plan.isCustom && plan.monthly > 0 && (
                                    <span className="text-sm text-sys-text-secondary">/mo</span>
                                )}
                                {plan.monthly === 0 && !plan.isCustom && (
                                    <span className="ml-2 text-sm text-sys-text-secondary">{plan.period}</span>
                                )}
                            </div>
                            <ul className="mt-8 flex-1 space-y-3">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2.5 text-sm text-sys-text-secondary">
                                        <span className="material-icons-round mt-0.5 text-[16px] text-sys-success">check_circle</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                to={plan.to}
                                className={`mt-8 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all ${plan.featured
                                    ? "text-white"
                                    : "border border-sys-border text-sys-text-primary hover:bg-sys-bg-tertiary"
                                    }`}
                                style={plan.featured ? {
                                    background: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))",
                                    boxShadow: "0 4px 16px color-mix(in srgb, var(--sys-accent) 30%, transparent)",
                                } : {}}
                            >
                                {plan.cta}
                                <span className="material-icons-round text-[16px]">arrow_forward</span>
                            </Link>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Feature Comparison */}
            <motion.div variants={fadeUp} className="mt-20">
                <h2 className="text-center text-2xl font-bold tracking-tight text-sys-text-primary">Feature Comparison</h2>
                <div className="mt-8 overflow-x-auto rounded-2xl border border-sys-border">
                    <table className="w-full text-sm">
                        <thead className="bg-sys-bg-secondary">
                            <tr>
                                <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary">Feature</th>
                                <th className="px-6 py-4 text-center text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary">Starter</th>
                                <th className="px-6 py-4 text-center text-[12px] font-semibold uppercase tracking-wider text-sys-accent">Pro</th>
                                <th className="px-6 py-4 text-center text-[12px] font-semibold uppercase tracking-wider text-sys-text-secondary">Enterprise</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sys-border/60">
                            {comparisonFeatures.map((f) => (
                                <tr key={f.name} className="bg-sys-bg-primary">
                                    <td className="px-6 py-3.5 font-medium text-sys-text-primary">{f.name}</td>
                                    <td className="px-6 py-3.5 text-center text-sys-text-secondary">{f.starter}</td>
                                    <td className="px-6 py-3.5 text-center font-semibold text-sys-text-primary">{f.pro}</td>
                                    <td className="px-6 py-3.5 text-center text-sys-text-secondary">{f.enterprise}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}
