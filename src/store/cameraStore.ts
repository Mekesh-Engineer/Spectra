import { create } from "zustand";

interface CameraState {
  isStreaming: boolean;
  activeDeviceId: string | null;
  resolution: { width: number; height: number };
  setStreaming: (streaming: boolean) => void;
  setActiveDevice: (deviceId: string) => void;
  setResolution: (width: number, height: number) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  isStreaming: false,
  activeDeviceId: null,
  resolution: { width: 1920, height: 1080 },
  setStreaming: (isStreaming) => set({ isStreaming }),
  setActiveDevice: (activeDeviceId) => set({ activeDeviceId }),
  setResolution: (width, height) => set({ resolution: { width, height } }),
}));
