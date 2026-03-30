import { Router } from "express";
import { TransactionController } from "../controllers/transactionController";
import { validate } from "../middleware/validate";
import { transactionSchema } from "../lib/validation";

const router = Router();

router.post("/", validate(transactionSchema), TransactionController.create);
router.get("/", TransactionController.list);
router.delete("/:id", TransactionController.delete);

export default router;
