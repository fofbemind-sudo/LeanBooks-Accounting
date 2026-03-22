import { Router } from "express";
import { PayrollController } from "../controllers/payrollController";

const router = Router();

router.post("/preview", PayrollController.preview);
router.post("/run", PayrollController.run);
router.get("/runs", PayrollController.listRuns);

export default router;
