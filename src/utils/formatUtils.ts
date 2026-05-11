/**
 * Format a date for display.
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Format a number to a fixed number of decimal places.
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format a percentage (0-1 range to display string).
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
