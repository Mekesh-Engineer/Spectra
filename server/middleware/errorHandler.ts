import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const message = err instanceof Error ? err.message : String(err);
  // Log full error details in development
  console.error(`[Spectra Error] ${req.method} ${req.originalUrl}`);
  console.error(err);

  const status = (err as { status?: number; statusCode?: number }).status
    ?? (err as { status?: number; statusCode?: number }).statusCode
    ?? 500;

  res.status(status).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development" ? message : undefined,
  });
}
