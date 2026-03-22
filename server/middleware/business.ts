import { Response, NextFunction } from "express";
import { db } from "../lib/firestore";
import { AuthenticatedRequest } from "./auth";

export const businessOwnershipMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const businessId = (req.query.businessId as string) || req.body.businessId || req.params.businessId;
  const userId = req.user?.uid;

  if (!businessId) {
    return res.status(400).json({ error: "Missing businessId" });
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }

  try {
    const businessDoc = await db.collection("businesses").doc(businessId).get();
    if (!businessDoc.exists) {
      return res.status(404).json({ error: "Business not found" });
    }

    const businessData = businessDoc.data();
    if (businessData?.ownerId !== userId) {
      return res.status(403).json({ error: "Forbidden: You do not own this business" });
    }

    // Attach business data to request for convenience
    (req as any).business = { id: businessDoc.id, ...businessData };
    next();
  } catch (error) {
    console.error("Error checking business ownership:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
