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

import { ReportService } from "./reportService";
import { db } from "../lib/firestore";
import { LedgerService } from "./ledgerService";

describe("ReportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfitAndLoss", () => {
    it("should calculate profit and loss correctly", async () => {
      const mockAccounts = [
        { id: "acc-1", name: "Sales", type: "Revenue" },
        { id: "acc-2", name: "Rent", type: "Expense" },
      ];

      const mockEntries = [
        { accountId: "acc-1", debit: 0, credit: 1000 },
        { accountId: "acc-2", debit: 500, credit: 0 },
      ];

      const mockAccountsSnapshot = {
        forEach: (callback: any) => {
          mockAccounts.forEach((acc) => callback({ id: acc.id, data: () => acc }));
        },
      };

      const mockEntriesSnapshot = {
        forEach: (callback: any) => {
          mockEntries.forEach((entry) => callback({ data: () => entry }));
        },
      };

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn()
          .mockResolvedValueOnce(mockAccountsSnapshot)
          .mockResolvedValueOnce(mockEntriesSnapshot),
      });

      const pnl = await ReportService.getProfitAndLoss("biz-1", new Date(), new Date());

      expect(pnl.totals.revenue).toBe(1000);
      expect(pnl.totals.expenses).toBe(500);
      expect(pnl.totals.netIncome).toBe(500);
    });
  });

  describe("getBalanceSheet", () => {
    it("should calculate balance sheet correctly", async () => {
      const mockAccounts = [
        { id: "acc-1", name: "Cash", type: "Asset" },
        { id: "acc-2", name: "Payable", type: "Liability" },
        { id: "acc-3", name: "Capital", type: "Equity" },
      ];

      const mockAccountsSnapshot = {
        forEach: (callback: any) => {
          mockAccounts.forEach((acc) => callback({ id: acc.id, data: () => acc }));
        },
      };

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn()
          .mockResolvedValueOnce(mockAccountsSnapshot) // for accounts
          .mockResolvedValueOnce(mockAccountsSnapshot) // for P&L accounts
          .mockResolvedValueOnce({ forEach: () => {} }), // for P&L entries
      });

      vi.spyOn(LedgerService, "getAccountBalances").mockResolvedValue({
        "acc-1": 1000,
        "acc-2": -200, // Liability is credit-based, so debit balance is negative
        "acc-3": -300, // Equity is credit-based
      });

      const bs = await ReportService.getBalanceSheet("biz-1", new Date());

      expect(bs.totals.Assets).toBe(1000);
      expect(bs.totals.Liabilities).toBe(200);
      expect(bs.totals.Equity).toBe(300); // 300 from acc-3 + 0 from net income
    });
  });

  describe("getCashBalance", () => {
    it("should calculate total cash balance correctly", async () => {
      const mockAccounts = [
        { id: "acc-1", name: "Bank", subtype: "Bank" },
        { id: "acc-2", name: "Cash", subtype: "Cash" },
        { id: "acc-3", name: "Other", subtype: "Other" },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => {
          mockAccounts.forEach((acc) => callback({ id: acc.id, data: () => acc }));
        },
      };

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSnapshot),
      });

      vi.spyOn(LedgerService, "getAccountBalances").mockResolvedValue({
        "acc-1": 1000,
        "acc-2": 500,
        "acc-3": 200,
      });

      const result = await ReportService.getCashBalance("biz-1", new Date());

      expect(result.totalCash).toBe(1500); // acc-1 + acc-2
    });
  });

  describe("getCashFlow", () => {
    it("should calculate cash flow correctly", async () => {
      const mockAccounts = [
        { id: "acc-1", name: "Bank", subtype: "Bank" },
      ];

      const mockEntries = [
        { accountId: "acc-1", debit: 1000, credit: 0 },
        { accountId: "acc-1", debit: 0, credit: 400 },
      ];

      const mockAccountsSnapshot = {
        docs: mockAccounts.map(acc => ({ id: acc.id })),
      };

      const mockEntriesSnapshot = {
        forEach: (callback: any) => {
          mockEntries.forEach((entry) => callback({ data: () => entry }));
        },
      };

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn()
          .mockResolvedValueOnce(mockAccountsSnapshot)
          .mockResolvedValueOnce(mockEntriesSnapshot),
      });

      const result = await ReportService.getCashFlow("biz-1", new Date(), new Date());

      expect(result.inflows).toBe(1000);
      expect(result.outflows).toBe(400);
      expect(result.netCashChange).toBe(600);
    });

    it("should throw InternalServerError if getCashFlow fails", async () => {
      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(new Error("Firestore error")),
      });

      await expect(
        ReportService.getCashFlow("biz-1", new Date(), new Date())
      ).rejects.toThrow("Failed to generate Cash Flow report");
    });
  });
});
