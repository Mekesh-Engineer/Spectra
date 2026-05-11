import { apiClient } from "./apiClient";

export const settingsService = {
  getAll: () =>
    apiClient.get<Record<string, unknown>>("/settings"),

  update: (key: string, value: unknown) =>
    apiClient.put<{ key: string; value: unknown }>(`/settings/${key}`, { value }),
};
