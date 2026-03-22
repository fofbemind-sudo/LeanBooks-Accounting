import { db, Timestamp } from "../lib/firestore";
import { Transaction, Entry } from "../types/accounting";

export class LedgerService {
  static async createTransactionWithEntries(
    businessId: string,
    transactionData: Partial<Transaction>,
    entries: Partial<Entry>[]
  ) {
    // 1. Validate balanced entries
    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error("Total debits must equal total credits.");
    }

    const batch = db.batch();
    const transactionRef = db.collection("transactions").doc();
    const date = transactionData.date ? Timestamp.fromDate(new Date(transactionData.date)) : Timestamp.now();

    const transaction = {
      ...transactionData,
      id: transactionRef.id,
      businessId,
      date,
      type: transactionData.type || "Adjustment",
      source: transactionData.source || "manual",
      status: transactionData.status || "posted",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    batch.set(transactionRef, transaction);

    entries.forEach((entryData) => {
      const entryRef = db.collection("entries").doc();
      const entry = {
        ...entryData,
        id: entryRef.id,
        businessId,
        transactionId: transactionRef.id,
        date,
        debit: entryData.debit || 0,
        credit: entryData.credit || 0,
        createdAt: Timestamp.now(),
      };
      batch.set(entryRef, entry);
    });

    await batch.commit();
    return transaction;
  }

  static async getAccountBalances(businessId: string, asOfDate: Date) {
    const entriesSnapshot = await db.collection("entries")
      .where("businessId", "==", businessId)
      .where("date", "<=", Timestamp.fromDate(asOfDate))
      .get();

    const balances: Record<string, number> = {};

    entriesSnapshot.forEach((doc) => {
      const entry = doc.data() as Entry;
      if (!balances[entry.accountId]) {
        balances[entry.accountId] = 0;
      }
      balances[entry.accountId] += (entry.debit - entry.credit);
    });

    return balances;
  }
}
