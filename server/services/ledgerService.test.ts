import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, mockTimestamp, resetStore } from "../__mocks__/firestore";

vi.mock("../lib/firestore", () => ({
  db: mockDb,
  Timestamp: mockTimestamp,
}));

import { LedgerService } from "./ledgerService";

describe("LedgerService", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("createTransactionWithEntries", () => {
    it("creates a transaction when debits equal credits", async () => {
      const result = await LedgerService.createTransactionWithEntries(
        "biz_1",
        { date: "2024-01-15", description: "Test transaction", amount: 100 },
        [
          { accountId: "acc_cash", debit: 100, credit: 0 },
          { accountId: "acc_revenue", debit: 0, credit: 100 },
        ]
      );

      expect(result).toBeDefined();
      expect(result.businessId).toBe("biz_1");
      expect(result.description).toBe("Test transaction");
      expect(result.status).toBe("posted");
      expect(result.source).toBe("manual");
    });

    it("throws when debits do not equal credits", async () => {
      await expect(
        LedgerService.createTransactionWithEntries(
          "biz_1",
          { description: "Unbalanced" },
          [
            { accountId: "acc_cash", debit: 100, credit: 0 },
            { accountId: "acc_revenue", debit: 0, credit: 50 },
          ]
        )
      ).rejects.toThrow("Total debits must equal total credits.");
    });

    it("accepts entries within the 0.001 tolerance", async () => {
      const result = await LedgerService.createTransactionWithEntries(
        "biz_1",
        { description: "Near-balanced" },
        [
          { accountId: "acc_cash", debit: 100.0005, credit: 0 },
          { accountId: "acc_revenue", debit: 0, credit: 100 },
        ]
      );

      expect(result).toBeDefined();
    });

    it("rejects entries just outside the 0.001 tolerance", async () => {
      await expect(
        LedgerService.createTransactionWithEntries(
          "biz_1",
          { description: "Just outside tolerance" },
          [
            { accountId: "acc_cash", debit: 100.002, credit: 0 },
            { accountId: "acc_revenue", debit: 0, credit: 100 },
          ]
        )
      ).rejects.toThrow("Total debits must equal total credits.");
    });

    it("defaults missing debit/credit to 0", async () => {
      const result = await LedgerService.createTransactionWithEntries(
        "biz_1",
        { description: "Defaults test" },
        [
          { accountId: "acc_cash", debit: 50 },
          { accountId: "acc_revenue", credit: 50 },
        ]
      );

      expect(result).toBeDefined();
    });

    it("uses default type, source, and status when not provided", async () => {
      const result = await LedgerService.createTransactionWithEntries(
        "biz_1",
        { description: "Defaults" },
        [
          { accountId: "a1", debit: 10, credit: 0 },
          { accountId: "a2", debit: 0, credit: 10 },
        ]
      );

      expect(result.type).toBe("Adjustment");
      expect(result.source).toBe("manual");
      expect(result.status).toBe("posted");
    });

    it("preserves provided type, source, and status", async () => {
      const result = await LedgerService.createTransactionWithEntries(
        "biz_1",
        { description: "Custom", type: "Income", source: "stripe", status: "draft" },
        [
          { accountId: "a1", debit: 10, credit: 0 },
          { accountId: "a2", debit: 0, credit: 10 },
        ]
      );

      expect(result.type).toBe("Income");
      expect(result.source).toBe("stripe");
      expect(result.status).toBe("draft");
    });

    it("handles zero-amount balanced entries", async () => {
      const result = await LedgerService.createTransactionWithEntries(
        "biz_1",
        { description: "Zero" },
        [
          { accountId: "a1", debit: 0, credit: 0 },
          { accountId: "a2", debit: 0, credit: 0 },
        ]
      );

      expect(result).toBeDefined();
    });

    it("handles multi-leg entries that balance", async () => {
      const result = await LedgerService.createTransactionWithEntries(
        "biz_1",
        { description: "Multi-leg" },
        [
          { accountId: "cash", debit: 97, credit: 0 },
          { accountId: "fees", debit: 3, credit: 0 },
          { accountId: "revenue", debit: 0, credit: 100 },
        ]
      );

      expect(result).toBeDefined();
    });
  });

  describe("getAccountBalances", () => {
    it("returns debit-minus-credit balances per account", async () => {
      const { seedDoc, mockTimestamp: ts } = await import("../__mocks__/firestore");
      const pastDate = ts.fromDate(new Date("2024-01-01"));
      // Seed some entries with mock timestamps that will pass <= filter
      seedDoc("entries", "e1", {
        businessId: "biz_1",
        accountId: "acc_cash",
        debit: 100,
        credit: 0,
        date: pastDate,
      });
      seedDoc("entries", "e2", {
        businessId: "biz_1",
        accountId: "acc_revenue",
        debit: 0,
        credit: 100,
        date: pastDate,
      });
      seedDoc("entries", "e3", {
        businessId: "biz_1",
        accountId: "acc_cash",
        debit: 50,
        credit: 0,
        date: pastDate,
      });

      const balances = await LedgerService.getAccountBalances("biz_1", new Date("2025-01-01"));
      expect(balances["acc_cash"]).toBe(150);
      expect(balances["acc_revenue"]).toBe(-100);
    });

    it("returns empty object when no entries exist", async () => {
      const balances = await LedgerService.getAccountBalances("biz_empty", new Date("2025-01-01"));
      expect(balances).toEqual({});
    });
  });
});
