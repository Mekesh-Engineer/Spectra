export type UserRole = "operator" | "supervisor" | "administrator";
export type UserStatus = "pending" | "active" | "disabled";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface Measurement {
  id: string;
  userId: string;
  imageUrl: string;
  results: MeasurementResult[];
  createdAt: string;
}

export interface MeasurementResult {
  label: string;
  value: number;
  unit: string;
  confidence: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// ─── Database Row Types ─────────────────────────────────────────────────────

export interface CameraRow {
  id: string;
  user_id: string;
  name: string;
  stream_url: string;
  resolution_width: number;
  resolution_height: number;
  fps: number;
  status: "online" | "offline" | "error";
  created_at: string;
  updated_at: string;
}

export interface InspectionRow {
  id: string;
  user_id: string;
  session_name: string;
  batch_id: string;
  camera_id: string | null;
  status: "active" | "completed" | "error";
  total_objects: number;
  pass_count: number;
  fail_count: number;
  duration: number;
  created_at: string;
  completed_at: string | null;
}

export interface InspectionResultRow {
  id: string;
  inspection_id: string;
  detection_class: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  diameter: number | null;
  length: number | null;
  wall_thickness: number | null;
  unit: string;
  pass: boolean;
  created_at: string;
}

export interface InventoryRow {
  id: string;
  user_id: string;
  name: string;
  type: "rod" | "pipe";
  material: string;
  diameter: number;
  length: number;
  wall_thickness: number | null;
  unit: string;
  status: "pass" | "fail";
  batch: string;
  location: string;
  inspection_id: string | null;
  created_at: string;
}

export interface AlertRow {
  id: string;
  user_id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  is_read: boolean;
  dismissed: boolean;
  created_at: string;
}

export interface SettingRow {
  id: string;
  user_id: string;
  key: string;
  value: unknown;
  updated_at: string;
}
