import { db, Timestamp } from "../lib/firestore";
import { BankTransaction } from "../types/accounting";

export class PlaidMockService {
  static async importMockBankTransactions(businessId: string) {
    const mockTxs = [
      { id: "bank_1", date: new Date(), description: "Office Rent", amount: 2000, direction: "outflow" },
      { id: "bank_2", date: new Date(), description: "Software Subscription", amount: 50, direction: "outflow" },
      { id: "bank_3", date: new Date(), description: "Customer Payment", amount: 1250, direction: "inflow" },
    ];

    const batch = db.batch();
    const results = [];

    for (const tx of mockTxs) {
      const ref = db.collection("bank_transactions").doc();
      const bankTx: Partial<BankTransaction> = {
        id: ref.id,
        businessId,
        source: "plaid_mock",
        externalId: tx.id,
        date: Timestamp.fromDate(tx.date),
        description: tx.description,
        amount: tx.amount,
        direction: tx.direction as any,
        status: "unmatched",
        createdAt: Timestamp.now(),
      };
      batch.set(ref, bankTx);
      results.push(bankTx);
    }

    await batch.commit();
    return results;
  }
}
