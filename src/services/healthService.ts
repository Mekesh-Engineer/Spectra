import { apiClient } from "./apiClient";

interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  environment: string;
  services: Array<{
    name: string;
    status: string;
    latency: number | null;
    detail: string;
  }>;
}

export const healthService = {
  check: () => apiClient.get<HealthResponse>("/health"),
};
