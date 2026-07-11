import type { NextFunction, Request, Response } from "express";
import type { ApiErrorBody } from "@bluwheelz/shared";
import { ApiError } from "../utils/errors.js";
import { logger } from "../config/logger.js";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path }, err.message);
    }
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");
  const body: ApiErrorBody = {
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  };
  res.status(500).json(body);
}

export function notFoundHandler(req: Request, res: Response) {
  const body: ApiErrorBody = {
    error: { code: "NOT_FOUND", message: `No route matches ${req.method} ${req.path}` },
  };
  res.status(404).json(body);
}
