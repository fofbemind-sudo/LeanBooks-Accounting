import { Response, NextFunction } from "express";
import { StripeService } from "../services/stripeService";
import { PlaidMockService } from "../services/plaidMockService";
import { ReconciliationService } from "../services/reconciliationService";
import { db } from "../lib/firestore";
import { AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../lib/errors";

export class IntegrationController {
  static async stripeMockSync(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId, cashAccountId, feeAccountId, revenueAccountId } = req.body;
    const requestId = (req as any).requestId || "unknown";

    try {
      const results = await StripeService.syncMockTransactions(
        businessId,
        cashAccountId,
        feeAccountId,
        revenueAccountId
      );
      
      console.log(`[${requestId}] [STRIPE_SYNC]: Stripe mock sync completed for business ${businessId}`);
      res.json(results);
    } catch (error: any) {
      next(error);
    }
  }

  static async bankMockSync(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId } = req.body;
    const requestId = (req as any).requestId || "unknown";

    try {
      const results = await PlaidMockService.importMockBankTransactions(businessId);
      console.log(`[${requestId}] [BANK_SYNC]: Bank mock sync completed for business ${businessId}`);
      res.json(results);
    } catch (error: any) {
      next(error);
    }
  }

  static async listBankTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId } = req.query;
    if (!businessId) return next(new BadRequestError("businessId is required"));

    try {
      const snapshot = await db.collection("bank_transactions")
        .where("businessId", "==", businessId)
        .orderBy("date", "desc")
        .get();
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(transactions);
    } catch (error: any) {
      next(error);
    }
  }

  static async autoMatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId } = req.body;
    const requestId = (req as any).requestId || "unknown";

    try {
      const results = await ReconciliationService.autoMatch(businessId);
      console.log(`[${requestId}] [AUTO_MATCH]: Auto-match completed for business ${businessId}`);
      res.json(results);
    } catch (error: any) {
      next(error);
    }
  }
}
