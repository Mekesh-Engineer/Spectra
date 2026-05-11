import { useState, useEffect } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useFetch<T>(url: string) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setState({ data, loading: false, error: null });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    fetchData();
    return () => controller.abort();
  }, [url]);

  return state;
}
