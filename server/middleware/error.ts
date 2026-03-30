import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId || "unknown";
  const timestamp = new Date().toISOString();

  // Log error with context
  console.error(`[${timestamp}] [${requestId}] [ERROR]:`, {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      requestId,
    });
  }

  // Handle generic errors
  return res.status(500).json({
    status: "error",
    message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
    requestId,
  });
};
