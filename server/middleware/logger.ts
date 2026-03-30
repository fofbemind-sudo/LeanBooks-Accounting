import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();
  (req as any).requestId = requestId;

  // Log request
  console.log(`[${timestamp}] [${requestId}] [REQUEST]: ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  // Log response when finished
  res.on("finish", () => {
    const responseTimestamp = new Date().toISOString();
    console.log(`[${responseTimestamp}] [${requestId}] [RESPONSE]: ${req.method} ${req.path} ${res.statusCode}`);
  });

  next();
};
