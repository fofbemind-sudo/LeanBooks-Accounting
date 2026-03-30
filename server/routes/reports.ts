import { Router } from "express";
import { ReportController } from "../controllers/reportController";
import { validate } from "../middleware/validate";
import { reportQuerySchema } from "../lib/validation";

const router = Router();

router.get("/pnl", validate(reportQuerySchema), ReportController.getPnL);
router.get("/balance-sheet", validate(reportQuerySchema), ReportController.getBalanceSheet);
router.get("/cash-flow", validate(reportQuerySchema), ReportController.getCashFlow);
router.get("/cash-balance", validate(reportQuerySchema), ReportController.getCashBalance);

export default router;
