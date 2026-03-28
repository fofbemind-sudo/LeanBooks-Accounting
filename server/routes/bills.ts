import { Router } from "express";
import { BillController } from "../controllers/billController";

const router = Router();

router.post("/", BillController.create);
router.get("/", BillController.list);
router.get("/aging", BillController.agingReport);
router.get("/:id", BillController.getById);
router.post("/approve", BillController.approve);
router.post("/payment", BillController.recordPayment);

export default router;
