import { Router } from "express";
import { InvoiceController } from "../controllers/invoiceController";

const router = Router();

router.post("/", InvoiceController.create);
router.get("/", InvoiceController.list);
router.get("/aging", InvoiceController.agingReport);
router.get("/:id", InvoiceController.getById);
router.post("/send", InvoiceController.send);
router.post("/payment", InvoiceController.recordPayment);

export default router;
