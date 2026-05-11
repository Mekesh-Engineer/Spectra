import { auth } from "@/lib/firebase";
import { API_BASE } from "./apiBase";

export type ExportFormat = "csv" | "json" | "pdf";

export const exportService = {
  exportInspections: async (
    format: ExportFormat,
    filters?: { from?: string; to?: string }
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);

    const token = await auth.currentUser?.getIdToken();

    const response = await fetch(
      `${API_BASE}/inspections/export?${params}`,
      {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (!response.ok) {
      throw new Error("Export failed");
    }

    return response.blob();
  },

  downloadBlob: (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
