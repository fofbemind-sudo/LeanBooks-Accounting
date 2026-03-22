import { Response } from "express";
import { LedgerService } from "../services/ledgerService";
import { db } from "../lib/firestore";
import { AuthenticatedRequest } from "../middleware/auth";

export class TransactionController {
  static async create(req: AuthenticatedRequest, res: Response) {
    const { businessId, date, description, amount, source, type, entries } = req.body;
    
    const allowedTypes = ["Income", "Expense", "Transfer", "Adjustment"];
    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid transaction type. Must be one of: ${allowedTypes.join(", ")}` });
    }

    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!date || isNaN(Date.parse(date))) return res.status(400).json({ error: "Valid date is required" });
    if (!description) return res.status(400).json({ error: "Description is required" });
    if (typeof amount !== "number") return res.status(400).json({ error: "Amount must be a number" });
    if (!Array.isArray(entries) || entries.length < 2) return res.status(400).json({ error: "At least two entries are required" });

    // Validate entries
    for (const entry of entries) {
      if (!entry.accountId) return res.status(400).json({ error: "Each entry must have an accountId" });
      if (typeof entry.debit !== "number" || typeof entry.credit !== "number") {
        return res.status(400).json({ error: "Debit and credit must be numbers" });
      }
    }

    try {
      const transaction = await LedgerService.createTransactionWithEntries(
        businessId,
        { date, description, amount, source, type },
        entries
      );
      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

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
