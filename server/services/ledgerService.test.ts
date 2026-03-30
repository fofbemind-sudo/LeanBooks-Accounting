import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/firestore", () => ({
  db: {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    add: vi.fn(),
    batch: vi.fn(),
  },
  Timestamp: {
    now: vi.fn().mockReturnValue({ toDate: () => new Date() }),
    fromDate: vi.fn().mockImplementation((date: Date) => ({ toDate: () => date })),
  },
}));

import { LedgerService } from "./ledgerService";
import { db, Timestamp } from "../lib/firestore";

describe("LedgerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTransactionWithEntries", () => {
    it("should throw an error if debits and credits are not balanced", async () => {
      const entries = [
        { accountId: "1", debit: 100, credit: 0 },
        { accountId: "2", debit: 0, credit: 50 },
      ];

      await expect(
        LedgerService.createTransactionWithEntries("biz-1", {}, entries)
      ).rejects.toThrow("Total debits must equal total credits.");
    });

    it("should create a transaction and entries in a batch", async () => {
      const entries = [
        { accountId: "1", debit: 100, credit: 0 },
        { accountId: "2", debit: 0, credit: 100 },
      ];

      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue({}),
      };
      (db.batch as any).mockReturnValue(mockBatch);

      const mockDoc = { id: "mock-id" };
      (db.collection as any).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDoc),
      });

      const result = await LedgerService.createTransactionWithEntries(
        "biz-1",
        { description: "Test Transaction" },
        entries
      );

      expect(db.batch).toHaveBeenCalled();
      expect(mockBatch.set).toHaveBeenCalledTimes(3); // 1 transaction + 2 entries
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(result.id).toBe("mock-id");
      expect(result.businessId).toBe("biz-1");
    });

    it("should use the provided date if available", async () => {
      const entries = [
        { accountId: "1", debit: 100, credit: 0 },
        { accountId: "2", debit: 0, credit: 100 },
      ];

      const mockBatch = { set: vi.fn(), commit: vi.fn().mockResolvedValue({}) };
      (db.batch as any).mockReturnValue(mockBatch);

      const testDate = "2023-01-01";
      await LedgerService.createTransactionWithEntries(
        "biz-1",
        { date: testDate as any },
        entries
      );

      expect(Timestamp.fromDate).toHaveBeenCalled();
    });

    it("should throw InternalServerError if batch commit fails", async () => {
      const entries = [
        { accountId: "1", debit: 100, credit: 0 },
        { accountId: "2", debit: 0, credit: 100 },
      ];
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error("Commit failed")),
      };
      (db.batch as any).mockReturnValue(mockBatch);

      await expect(
        LedgerService.createTransactionWithEntries("biz-1", {}, entries)
      ).rejects.toThrow("Failed to create transaction with entries");
    });
  });

  describe("getAccountBalances", () => {
    it("should calculate account balances correctly", async () => {
      const mockEntries = [
        { accountId: "acc-1", debit: 100, credit: 0 },
        { accountId: "acc-1", debit: 0, credit: 20 },
        { accountId: "acc-2", debit: 50, credit: 0 },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => {
          mockEntries.forEach((entry) => callback({ data: () => entry }));
        },
      };

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSnapshot),
      });

      const balances = await LedgerService.getAccountBalances("biz-1", new Date());

      expect(balances["acc-1"]).toBe(80);
      expect(balances["acc-2"]).toBe(50);
    });
  });
});
