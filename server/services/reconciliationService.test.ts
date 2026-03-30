import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/firestore", () => ({
  db: {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn(),
    batch: vi.fn(),
  },
  Timestamp: {
    now: vi.fn().mockReturnValue({ toDate: () => new Date() }),
    fromDate: vi.fn().mockImplementation((date: Date) => ({ toDate: () => date })),
  },
}));

import { ReconciliationService } from "./reconciliationService";
import { db } from "../lib/firestore";

describe("ReconciliationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("autoMatch", () => {
    it("should match bank transactions with ledger transactions by amount and date", async () => {
      const now = new Date();
      const mockBankTxs = [
        { 
          id: "btx-1", 
          amount: 100, 
          date: { toDate: () => now }, 
          status: "unmatched" 
        },
      ];

      const mockLedgerTxs = [
        { 
          id: "ltx-1", 
          amount: 100, 
          date: { toDate: () => new Date(now.getTime() + 1000 * 60 * 60) }, // 1 hour later
          status: "posted" 
        },
      ];

      const mockBankSnapshot = {
        docs: mockBankTxs.map(tx => ({ 
          data: () => tx, 
          ref: { id: tx.id } 
        })),
      };

      const mockLedgerSnapshot = {
        docs: mockLedgerTxs.map(tx => ({ 
          data: () => tx, 
          ref: { id: tx.id } 
        })),
      };

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn()
          .mockResolvedValueOnce(mockBankSnapshot)
          .mockResolvedValueOnce(mockLedgerSnapshot),
        doc: vi.fn().mockReturnThis(),
      });

      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue({}),
      };
      (db.batch as any).mockReturnValue(mockBatch);

      const result = await ReconciliationService.autoMatch("biz-1");

      expect(result.matchCount).toBe(1);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should not match if amount differs", async () => {
      const now = new Date();
      const mockBankTxs = [{ id: "btx-1", amount: 100, date: { toDate: () => now }, status: "unmatched" }];
      const mockLedgerTxs = [{ id: "ltx-1", amount: 101, date: { toDate: () => now }, status: "posted" }];

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn()
          .mockResolvedValueOnce({ docs: mockBankTxs.map(tx => ({ data: () => tx, ref: {} })) })
          .mockResolvedValueOnce({ docs: mockLedgerTxs.map(tx => ({ data: () => tx, ref: {} })) }),
      });

      const mockBatch = { update: vi.fn(), commit: vi.fn().mockResolvedValue({}) };
      (db.batch as any).mockReturnValue(mockBatch);

      const result = await ReconciliationService.autoMatch("biz-1");

      expect(result.matchCount).toBe(0);
      expect(mockBatch.update).not.toHaveBeenCalled();
    });

    it("should throw InternalServerError if autoMatch fails", async () => {
      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(new Error("Firestore error")),
      });

      await expect(
        ReconciliationService.autoMatch("biz-1")
      ).rejects.toThrow("Failed to perform auto-match reconciliation");
    });
  });
});
