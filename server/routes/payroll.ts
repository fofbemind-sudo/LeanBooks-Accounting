import { Router } from "express";
import { PayrollController } from "../controllers/payrollController";
import { validate } from "../middleware/validate";
import { payrollRunSchema, payrollPreviewSchema } from "../lib/validation";

const router = Router();

router.post("/preview", validate(payrollPreviewSchema), PayrollController.preview);
router.post("/run", validate(payrollRunSchema), PayrollController.run);
router.get("/runs", PayrollController.listRuns);

export default router;
