import { Router } from "express";
import { IntegrationController } from "../controllers/integrationController";
import { validate } from "../middleware/validate";
import { stripeSyncSchema, bankSyncSchema, autoMatchSchema, reportQuerySchema } from "../lib/validation";

const router = Router();

router.post("/stripe/mock-sync", validate(stripeSyncSchema), IntegrationController.stripeMockSync);
router.post("/bank/mock-sync", validate(bankSyncSchema), IntegrationController.bankMockSync);
router.get("/bank-transactions", validate(reportQuerySchema), IntegrationController.listBankTransactions);
router.post("/reconciliation/auto-match", validate(autoMatchSchema), IntegrationController.autoMatch);

export default router;
