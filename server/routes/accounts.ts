import { Router, Request, Response } from "express";
import { db } from "../lib/firestore";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const { businessId } = req.query;
  if (!businessId) {
    return res.status(400).json({ error: "businessId is required" });
  }
  try {
    const snapshot = await db.collection("accounts")
      .where("businessId", "==", businessId)
      .orderBy("code", "asc")
      .get();
    const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
