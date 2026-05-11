import { apiClient } from "./apiClient";
import type { CameraRow } from "@shared/types";

export const cameraService = {
  list: () => apiClient.get<CameraRow[]>("/cameras"),

  getById: (id: string) => apiClient.get<CameraRow>(`/cameras/${id}`),

  create: (data: Partial<CameraRow>) =>
    apiClient.post<CameraRow>("/cameras", data),

  update: (id: string, config: Partial<CameraRow>) =>
    apiClient.put<CameraRow>(`/cameras/${id}`, config),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/cameras/${id}`),
};
