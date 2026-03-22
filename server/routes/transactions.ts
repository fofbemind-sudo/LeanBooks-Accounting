import { Router } from "express";
import { TransactionController } from "../controllers/transactionController";

const router = Router();

router.post("/", TransactionController.create);
router.get("/", TransactionController.list);

export default router;
