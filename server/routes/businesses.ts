import { Router, Request, Response } from "express";
import { db, Timestamp } from "../lib/firestore";
import { AccountService } from "../services/accountService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { ownerId, name, currency } = req.body;
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

router.get("/", async (req: Request, res: Response) => {
  const { ownerId } = req.query;
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

router.post("/initialize", async (req: Request, res: Response) => {
  const { businessId } = req.body;
  try {
    const accounts = await AccountService.initializeBusiness(businessId);
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
