import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { UnauthorizedError } from "../lib/errors";

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const requestId = (req as any).requestId || "unknown";

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or invalid authorization header"));
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error(`[${requestId}] [AUTH_ERROR]: Error verifying auth token:`, error);
    next(new UnauthorizedError("Unauthorized: Invalid token"));
  }
};
