function normalizeApiBase(rawBase?: string): string {
  if (!rawBase) return "/api/v1";

  const trimmed = rawBase.trim().replace(/\/+$/, "");

  if (trimmed.endsWith("/api/v1")) return trimmed;
  if (trimmed.endsWith("/api")) return `${trimmed}/v1`;

  // Support host-only values like http://localhost:3001
  if (/^https?:\/\/[^/]+$/i.test(trimmed)) {
    return `${trimmed}/api/v1`;
  }

  return trimmed;
}

export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);
