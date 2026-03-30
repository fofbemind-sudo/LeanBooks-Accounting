import { db, Timestamp } from "../lib/firestore";
import { BankTransaction, Transaction } from "../types/accounting";

export class ReconciliationService {
  static async autoMatch(businessId: string) {
    const bankTxsSnapshot = await db.collection("bank_transactions")
      .where("businessId", "==", businessId)
      .where("status", "==", "unmatched")
      .get();

    const ledgerTxsSnapshot = await db.collection("transactions")
      .where("businessId", "==", businessId)
      .where("status", "==", "posted")
      .get();

    const ledgerTxs = ledgerTxsSnapshot.docs.map(doc => doc.data() as Transaction);
    const batch = db.batch();
    let matchCount = 0;

    for (const bankTxDoc of bankTxsSnapshot.docs) {
      const bankTx = bankTxDoc.data() as BankTransaction;
      
      // Heuristic: Match by amount and date within 3 days
      const match = ledgerTxs.find(ltx => {
        const amountMatch = Math.abs(Math.abs(ltx.amount) - Math.abs(bankTx.amount)) < 0.01;
        const dateDiff = Math.abs(ltx.date.toDate().getTime() - bankTx.date.toDate().getTime());
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        return amountMatch && dateDiff <= threeDays;
      });

      if (match) {
        batch.update(bankTxDoc.ref, { 
          status: "matched", 
          matchedTransactionId: match.id,
          updatedAt: Timestamp.now()
        });
        batch.update(db.collection("transactions").doc(match.id), {
          status: "matched",
          updatedAt: Timestamp.now()
        });
        matchCount++;
      }
    }

    await batch.commit();
    return { matchCount };
  }
}
