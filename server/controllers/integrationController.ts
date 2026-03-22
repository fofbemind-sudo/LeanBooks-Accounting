import { Request, Response } from "express";
import { StripeService } from "../services/stripeService";
import { PlaidMockService } from "../services/plaidMockService";
import { ReconciliationService } from "../services/reconciliationService";
import { db } from "../lib/firestore";

export class IntegrationController {
  static async stripeMockSync(req: Request, res: Response) {
    const { businessId, cashAccountId, feeAccountId, revenueAccountId } = req.body;
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

  static async bankMockSync(req: Request, res: Response) {
    const { businessId } = req.body;
    try {
      const results = await PlaidMockService.importMockBankTransactions(businessId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listBankTransactions(req: Request, res: Response) {
    const { businessId } = req.query;
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

  static async autoMatch(req: Request, res: Response) {
    const { businessId } = req.body;
    try {
      const results = await ReconciliationService.autoMatch(businessId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
