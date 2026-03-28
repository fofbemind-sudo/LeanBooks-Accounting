import { Router } from "express";
import { RecurringInvoiceController } from "../controllers/recurringInvoiceController";

const router = Router();

router.post("/", RecurringInvoiceController.create);
router.get("/", RecurringInvoiceController.list);
router.post("/toggle", RecurringInvoiceController.toggle);
router.post("/process", RecurringInvoiceController.processDue);

export default router;
