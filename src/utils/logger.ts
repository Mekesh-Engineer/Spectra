type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog("debug")) console.debug("[Spectra]", ...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog("info")) console.info("[Spectra]", ...args);
  },
  warn: (...args: unknown[]) => {
    if (shouldLog("warn")) console.warn("[Spectra]", ...args);
  },
  error: (...args: unknown[]) => {
    if (shouldLog("error")) console.error("[Spectra]", ...args);
  },
};
