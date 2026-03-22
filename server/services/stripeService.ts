import { LedgerService } from "./ledgerService";

export class StripeService {
  static async syncMockTransactions(
    businessId: string,
    cashAccountId: string,
    feeAccountId: string,
    revenueAccountId: string
  ) {
    const mockCharges = [
      { id: "ch_1", amount: 10000, fee: 300, description: "Customer Payment 1" },
      { id: "ch_2", amount: 5000, fee: 150, description: "Customer Payment 2" },
      { id: "ch_3", amount: 20000, fee: 600, description: "Customer Payment 3" },
    ];

    const results = [];

    for (const charge of mockCharges) {
      const net = charge.amount - charge.fee;
      const transaction = await LedgerService.createTransactionWithEntries(
        businessId,
        {
          date: new Date(),
          description: `Stripe Charge: ${charge.description}`,
          amount: charge.amount / 100,
          source: "stripe",
          sourceRef: charge.id,
        },
        [
          { accountId: cashAccountId, debit: net / 100, credit: 0, memo: "Net Deposit" },
          { accountId: feeAccountId, debit: charge.fee / 100, credit: 0, memo: "Stripe Fee" },
          { accountId: revenueAccountId, debit: 0, credit: charge.amount / 100, memo: "Gross Sales" }
        ]
      );
      results.push(transaction);
    }

    return results;
  }
}
