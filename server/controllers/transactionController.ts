import { Response, NextFunction } from "express";
import { LedgerService } from "../services/ledgerService";
import { AuditService } from "../services/auditService";
import { db } from "../lib/firestore";
import { AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../lib/errors";

export class TransactionController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId, date, description, amount, source, type, entries } = req.body;
    const requestId = (req as any).requestId || "unknown";
    const userId = req.user?.uid || "system";

    try {
      const transaction = await LedgerService.createTransactionWithEntries(
        businessId,
        { date, description, amount, source, type },
        entries
      );
      
      await AuditService.log({
        userId,
        businessId,
        action: "CREATE",
        resource: "transaction",
        resourceId: transaction.id,
        newData: transaction
      });

      console.log(`[${requestId}] [TRANSACTION_CREATED]: Transaction created for business ${businessId}`);
      res.json(transaction);
    } catch (error: any) {
      next(error);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId } = req.query;
    if (!businessId) return next(new BadRequestError("businessId is required"));

    try {
      const snapshot = await db.collection("transactions")
        .where("businessId", "==", businessId)
        .orderBy("date", "desc")
        .get();
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(transactions);
    } catch (error: any) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    const userId = req.user?.uid || "system";

    try {
      const ref = db.collection("transactions").doc(id);
      const snapshot = await ref.get();
      if (!snapshot.exists) {
        return next(new BadRequestError("Transaction not found"));
      }
      const previousData = snapshot.data();

      // In a real accounting system, we'd also need to delete/reverse ledger entries.
      // For simplicity, we'll just delete the transaction document and entries.
      const batch = db.batch();
      batch.delete(ref);
      
      const entriesSnapshot = await db.collection("ledger_entries")
        .where("transactionId", "==", id)
        .get();
      entriesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      await batch.commit();

      await AuditService.log({
        userId,
        businessId: (previousData as any).businessId,
        action: "DELETE",
        resource: "transaction",
        resourceId: id,
        previousData
      });

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  }
}
