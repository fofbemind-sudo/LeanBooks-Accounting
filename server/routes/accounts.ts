import { Router, Request, Response, NextFunction } from "express";
import { db } from "../lib/firestore";
import { validate } from "../middleware/validate";
import { reportQuerySchema } from "../lib/validation";

const router = Router();

router.get("/", validate(reportQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  const { businessId } = req.query;
  try {
    const snapshot = await db.collection("accounts")
      .where("businessId", "==", businessId)
      .orderBy("code", "asc")
      .get();
    const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(accounts);
  } catch (error: any) {
    next(error);
  }
});

export default router;
