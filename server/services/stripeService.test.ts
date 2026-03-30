import { describe, it, expect, vi, beforeEach } from "vitest";
import { StripeService } from "./stripeService";
import { LedgerService } from "./ledgerService";

describe("StripeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncMockTransactions", () => {
    it("should sync mock stripe transactions to the ledger", async () => {
      const ledgerSpy = vi.spyOn(LedgerService, "createTransactionWithEntries").mockResolvedValue({} as any);

      const results = await StripeService.syncMockTransactions(
        "biz-1",
        "cash-acc",
        "fee-acc",
        "rev-acc"
      );

      expect(results.length).toBe(3);
      expect(ledgerSpy).toHaveBeenCalledTimes(3);
      
      // Check first charge: amount 10000, fee 300, net 9700
      // In the service, it's divided by 100
      expect(ledgerSpy).toHaveBeenCalledWith(
        "biz-1",
        expect.objectContaining({ amount: 100 }),
        expect.arrayContaining([
          expect.objectContaining({ accountId: "cash-acc", debit: 97 }),
          expect.objectContaining({ accountId: "fee-acc", debit: 3 }),
          expect.objectContaining({ accountId: "rev-acc", credit: 100 }),
        ])
      );
    });
  });
});
