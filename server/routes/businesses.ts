import { Router, Response, Request } from "express";
import { db, Timestamp } from "../lib/firestore";
import { AccountService } from "../services/accountService";
import { AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const { name, currency } = req.body;
  const ownerId = req.user?.uid;

  if (!ownerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!name) {
    return res.status(400).json({ error: "Business name is required" });
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
    
    res.json(business);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const ownerId = req.user?.uid;

  if (!ownerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const snapshot = await db.collection("businesses")
      .where("ownerId", "==", ownerId)
      .get();
    const businesses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(businesses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/initialize", async (req: AuthenticatedRequest, res: Response) => {
  const { businessId } = req.body;
  if (!businessId) return res.status(400).json({ error: "businessId is required" });
  
  try {
    const accounts = await AccountService.initializeBusiness(businessId);
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
