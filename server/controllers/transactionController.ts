import { Request, Response } from "express";
import { LedgerService } from "../services/ledgerService";
import { db } from "../lib/firestore";

export class TransactionController {
  static async create(req: Request, res: Response) {
    const { businessId, date, description, amount, source, entries } = req.body;
    try {
      const transaction = await LedgerService.createTransactionWithEntries(
        businessId,
        { date, description, amount, source },
        entries
      );
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    const { businessId } = req.query;
    try {
      const snapshot = await db.collection("transactions")
        .where("businessId", "==", businessId)
        .orderBy("date", "desc")
        .get();
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
