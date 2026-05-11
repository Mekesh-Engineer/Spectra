import { Router } from "express";
import { authMiddleware, requireRole, type AuthRequest } from "../middleware/authMiddleware";
import { createStorage } from "../services/storageService";
import type { Response } from "express";

function getUserId(req: AuthRequest): string {
  return req.user!.id;
}

function getStorage() {
  return createStorage();
}

export const inspectionRoutes = Router();
inspectionRoutes.use(authMiddleware);

// GET /api/inspections?page=1&limit=20&status=completed&search=batch
inspectionRoutes.get("/", async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const result = await getStorage().getInspections(getUserId(req), page, limit, { status, search });
  res.json(result);
});

// GET /api/inspections/stats
inspectionRoutes.get("/stats", async (req: AuthRequest, res: Response) => {
  const stats = await getStorage().getDashboardStats(getUserId(req));
  res.json(stats);
});

// GET /api/inspections/recent?days=7
inspectionRoutes.get("/recent", async (req: AuthRequest, res: Response) => {
  const days = Number(req.query.days) || 7;
  const data = await getStorage().getRecentInspections(getUserId(req), days);
  res.json(data);
});

// GET /api/inspections/:id
inspectionRoutes.get("/:id", async (req: AuthRequest, res: Response) => {
  const data = await getStorage().getInspectionById(req.params.id as string, getUserId(req));
  res.json(data);
});

// POST /api/inspections
inspectionRoutes.post("/", async (req: AuthRequest, res: Response) => {
  const inspection = await getStorage().saveInspection({ ...req.body, user_id: getUserId(req) });
  res.status(201).json(inspection);
});

// PUT /api/inspections/:id
inspectionRoutes.put("/:id", async (req: AuthRequest, res: Response) => {
  const inspection = await getStorage().updateInspection(req.params.id as string, getUserId(req), req.body);
  res.json(inspection);
});

// POST /api/inspections/:id/results
inspectionRoutes.post("/:id/results", async (req: AuthRequest, res: Response) => {
  const { results } = req.body;
  const mapped = (results as Record<string, unknown>[]).map((r) => ({
    ...r,
    inspection_id: req.params.id as string,
  }));
  const data = await getStorage().saveInspectionResults(mapped);
  res.status(201).json(data);
});

// POST /api/inspections/:id/finalize — atomic completion: update + results + alerts + inventory
inspectionRoutes.post("/:id/finalize", async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const storage = getStorage();
  const inspectionId = req.params.id as string;
  const { results, duration } = req.body as {
    results: Array<{
      detection_class: string;
      confidence: number;
      bbox: { x: number; y: number; w: number; h: number };
      diameter: number | null;
      length: number | null;
      unit: string;
      pass: boolean;
    }>;
    duration: number;
  };

  const totalObjects = results.length;
  const passCount = results.filter((r) => r.pass).length;
  const failCount = totalObjects - passCount;

  // 1. Update inspection record
  const inspection = await storage.updateInspection(inspectionId, userId, {
    status: "completed",
    total_objects: totalObjects,
    pass_count: passCount,
    fail_count: failCount,
    duration,
    completed_at: new Date().toISOString(),
  });

  // 2. Save inspection results
  let savedResults: unknown[] = [];
  if (results.length > 0) {
    savedResults = await storage.saveInspectionResults(
      results.map((r) => ({ ...r, inspection_id: inspectionId }))
    );
  }

  // 3. Auto-generate alerts based on findings
  let alertsCreated = 0;
  if (failCount > 0) {
    const severity = failCount >= 5 ? "critical" : failCount >= 2 ? "warning" : "info";
    await storage.createAlert({
      user_id: userId,
      type: "inspection_defect",
      severity,
      title: `${failCount} defect${failCount > 1 ? "s" : ""} detected`,
      message: `Inspection "${inspection.session_name}" found ${failCount} of ${totalObjects} objects below threshold (${totalObjects > 0 ? ((passCount / totalObjects) * 100).toFixed(1) : 0}% pass rate).`,
      is_read: false,
      dismissed: false,
    });
    alertsCreated = 1;
  } else if (totalObjects > 0) {
    await storage.createAlert({
      user_id: userId,
      type: "inspection_success",
      severity: "info",
      title: "All objects passed inspection",
      message: `Inspection "${inspection.session_name}" completed — ${totalObjects} objects, 100% pass rate.`,
      is_read: false,
      dismissed: false,
    });
    alertsCreated = 1;
  }

  // 4. Auto-create inventory items from detections
  let inventoryCreated = 0;
  if (results.length > 0) {
    const inventoryItems = results.map((r, i) => ({
      user_id: userId,
      name: `${r.detection_class} #${i + 1}`,
      type: r.diameter != null && r.diameter > 0 ? "pipe" : "rod",
      material: "unknown",
      diameter: r.diameter ?? 0,
      length: r.length ?? 0,
      wall_thickness: null,
      unit: r.unit || "px",
      status: r.pass ? "pass" : "fail",
      batch: inspection.session_name || `batch-${inspectionId.slice(0, 8)}`,
      location: "",
      inspection_id: inspectionId,
    }));
    await storage.createInventoryItems(inventoryItems);
    inventoryCreated = inventoryItems.length;
  }

  res.json({ inspection, resultsSaved: savedResults.length, alertsCreated, inventoryCreated });
});

// GET /api/inspections/export?format=csv|json&from=...&to=...
inspectionRoutes.get("/export", async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const storage = getStorage();
  const format = (req.query.format as string) || "json";
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  // Fetch all inspections with optional date filter
  const { items } = await storage.getInspections(userId, 1, 10000, {});
  let filtered = items;
  if (from) filtered = filtered.filter((i: Record<string, unknown>) => (i.created_at as string) >= from);
  if (to) filtered = filtered.filter((i: Record<string, unknown>) => (i.created_at as string) <= to);

  if (format === "csv") {
    if (filtered.length === 0) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=inspections.csv");
      res.send("No data");
      return;
    }
    const headers = Object.keys(filtered[0] as Record<string, unknown>);
    const csvRows = [
      headers.join(","),
      ...filtered.map((row: Record<string, unknown>) =>
        headers.map((h) => {
          const val = (row as Record<string, unknown>)[h];
          const str = val === null || val === undefined ? "" : String(val);
          return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(",")
      ),
    ];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=inspections.csv");
    res.send(csvRows.join("\n"));
  } else {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=inspections.json");
    res.json(filtered);
  }
});

// GET /api/inspections/profiles/count (admin)
inspectionRoutes.get("/admin/profile-count", requireRole(["administrator"]), async (req: AuthRequest, res: Response) => {
  const count = await getStorage().getProfileCount();
  res.json({ count });
});
