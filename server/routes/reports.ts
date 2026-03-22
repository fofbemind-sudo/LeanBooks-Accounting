import { Router } from "express";
import { ReportController } from "../controllers/reportController";

const router = Router();

router.get("/pnl", ReportController.getPnL);
router.get("/balance-sheet", ReportController.getBalanceSheet);
router.get("/cash-flow", ReportController.getCashFlow);

export default router;
