import { Response, NextFunction } from "express";
import { db } from "../lib/firestore";
import { AuthenticatedRequest } from "./auth";
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } from "../lib/errors";

export const businessOwnershipMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const businessId = (req.query.businessId as string) || req.body.businessId || req.params.businessId;
  const userId = req.user?.uid;
  const requestId = (req as any).requestId || "unknown";

  if (!businessId) {
    return next(new BadRequestError("Missing businessId"));
  }

  if (!userId) {
    return next(new UnauthorizedError("Unauthorized: User not authenticated"));
  }

  try {
    const businessDoc = await db.collection("businesses").doc(businessId).get();
    if (!businessDoc.exists) {
      return next(new NotFoundError("Business not found"));
    }

    const businessData = businessDoc.data();
    if (businessData?.ownerId !== userId) {
      return next(new ForbiddenError("Forbidden: You do not own this business"));
    }

    // Attach business data to request for convenience
    (req as any).business = { id: businessDoc.id, ...businessData };
    next();
  } catch (error) {
    console.error(`[${requestId}] [BUSINESS_OWNERSHIP_ERROR]: Error checking business ownership:`, error);
    next(error);
  }
};
