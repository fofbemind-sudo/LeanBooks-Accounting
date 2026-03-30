import { Router, Response, Request, NextFunction } from "express";
import { db, Timestamp } from "../lib/firestore";
import { AccountService } from "../services/accountService";
import { AuthenticatedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { businessSchema, initializeBusinessSchema } from "../lib/validation";
import { UnauthorizedError } from "../lib/errors";

const router = Router();

router.post("/", validate(businessSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { name, currency } = req.body;
  const ownerId = req.user?.uid;
  const requestId = (req as any).requestId || "unknown";

  if (!ownerId) {
    return next(new UnauthorizedError("Unauthorized"));
  }

  try {
    const ref = db.collection("businesses").doc();
    const business = {
      id: ref.id,
      ownerId,
      name,
      currency: currency || "USD",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await ref.set(business);
    
    // Initialize default chart of accounts
    await AccountService.initializeBusiness(ref.id);
    
    console.log(`[${requestId}] [BUSINESS_CREATED]: Business ${name} created for user ${ownerId}`);
    res.json(business);
  } catch (error: any) {
    next(error);
  }
});

router.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const ownerId = req.user?.uid;

  if (!ownerId) {
    return next(new UnauthorizedError("Unauthorized"));
  }

  try {
    const snapshot = await db.collection("businesses")
      .where("ownerId", "==", ownerId)
      .get();
    const businesses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(businesses);
  } catch (error: any) {
    next(error);
  }
});

router.post("/initialize", validate(initializeBusinessSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { businessId } = req.body;
  const requestId = (req as any).requestId || "unknown";
  
  try {
    const accounts = await AccountService.initializeBusiness(businessId);
    console.log(`[${requestId}] [BUSINESS_INITIALIZED]: Business ${businessId} accounts initialized`);
    res.json(accounts);
  } catch (error: any) {
    next(error);
  }
});

export default router;
