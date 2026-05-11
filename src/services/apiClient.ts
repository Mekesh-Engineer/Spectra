import { auth } from "@/lib/firebase";
import { API_BASE } from "./apiBase";

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const authRequired = import.meta.env.VITE_AUTH_REQUIRED !== "false";
  // Get Firebase ID token for the current user
  const userToken = await auth.currentUser?.getIdToken();
  const token = authRequired
    ? userToken ?? (import.meta.env.DEV ? "mock-token" : undefined)
    : userToken;
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      if (payload?.error) detail = ` - ${payload.error}`;
      else if (payload?.detail) detail = ` - ${payload.detail}`;
    } catch {
      // Ignore non-JSON error responses.
    }
    throw new Error(`API Error: ${response.status} ${response.statusText}${detail}`);
  }

  return response.json();
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, data: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    }),

  put: <T>(endpoint: string, data: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
