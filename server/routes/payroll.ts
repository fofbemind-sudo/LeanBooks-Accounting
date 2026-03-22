import { Router } from "express";
import { PayrollController } from "../controllers/payrollController";

const router = Router();

router.post("/run", PayrollController.run);
router.get("/runs", PayrollController.listRuns);

export default router;
