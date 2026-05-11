import { useState, useEffect } from "react";
import type { InspectionSession } from "@shared/types/session.types";
import { apiClient } from "@/services/apiClient";

export function useInspectionData(sessionId?: string) {
  const [session, setSession] = useState<InspectionSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();

    async function fetchSession() {
      setLoading(true);
      try {
        const data = await apiClient.get<InspectionSession>(
          `/inspections/${sessionId}`,
          { signal: controller.signal }
        );
        setSession(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
    return () => controller.abort();
  }, [sessionId]);

  return { session, loading, error };
}
