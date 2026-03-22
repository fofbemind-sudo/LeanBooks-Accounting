import { Router } from "express";
import { IntegrationController } from "../controllers/integrationController";

const router = Router();

router.post("/stripe/mock-sync", IntegrationController.stripeMockSync);
router.post("/bank/mock-sync", IntegrationController.bankMockSync);
router.get("/bank-transactions", IntegrationController.listBankTransactions);
router.post("/reconciliation/auto-match", IntegrationController.autoMatch);

export default router;
