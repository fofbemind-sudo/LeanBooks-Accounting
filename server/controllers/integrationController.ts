import { Response } from "express";
import { StripeService } from "../services/stripeService";
import { PlaidMockService } from "../services/plaidMockService";
import { ReconciliationService } from "../services/reconciliationService";
import { db } from "../lib/firestore";
import { AuthenticatedRequest } from "../middleware/auth";

export class IntegrationController {
  static async stripeMockSync(req: AuthenticatedRequest, res: Response) {
    const { businessId, cashAccountId, feeAccountId, revenueAccountId } = req.body;
    
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!cashAccountId || !feeAccountId || !revenueAccountId) {
      return res.status(400).json({ error: "Cash, Fee, and Revenue account IDs are required" });
    }

    try {
      const results = await StripeService.syncMockTransactions(
        businessId,
        cashAccountId,
        feeAccountId,
        revenueAccountId
      );
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async bankMockSync(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const results = await PlaidMockService.importMockBankTransactions(businessId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listBankTransactions(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const snapshot = await db.collection("bank_transactions")
        .where("businessId", "==", businessId)
        .orderBy("date", "desc")
        .get();
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async autoMatch(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const results = await ReconciliationService.autoMatch(businessId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
