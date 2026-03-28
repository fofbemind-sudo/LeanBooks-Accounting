import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, mockTimestamp, resetStore, seedDoc } from "../__mocks__/firestore";

vi.mock("../lib/firestore", () => ({
  db: mockDb,
  Timestamp: mockTimestamp,
}));

import { ReportService } from "./reportService";

function seedAccount(id: string, type: string, subtype: string = "General", name?: string) {
  seedDoc("accounts", id, {
    businessId: "biz_1",
    name: name || `${type} Account`,
    type,
    subtype,
  });
}

function seedEntry(id: string, accountId: string, debit: number, credit: number, date?: Date) {
  seedDoc("entries", id, {
    businessId: "biz_1",
    accountId,
    debit,
    credit,
    date: mockTimestamp.fromDate(date || new Date("2024-06-15")),
  });
}

describe("ReportService", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("getProfitAndLoss", () => {
    it("calculates revenue, expenses, and net income", async () => {
      seedAccount("rev_1", "Revenue", "Operating Revenue", "Sales");
      seedAccount("exp_1", "Expense", "Operating Expense", "Rent");

      seedEntry("e1", "rev_1", 0, 5000);  // Revenue: credit-based
      seedEntry("e2", "exp_1", 3000, 0);   // Expense: debit-based

      const pnl = await ReportService.getProfitAndLoss(
        "biz_1",
        new Date("2020-01-01"),
        new Date("2030-01-01")
      );

      expect(pnl.totals.revenue).toBe(5000);
      expect(pnl.totals.expenses).toBe(3000);
      expect(pnl.totals.netIncome).toBe(2000);
    });

    it("returns zero totals when no entries exist", async () => {
      seedAccount("rev_1", "Revenue");

      const pnl = await ReportService.getProfitAndLoss(
        "biz_1",
        new Date("2020-01-01"),
        new Date("2030-01-01")
      );

      expect(pnl.totals.revenue).toBe(0);
      expect(pnl.totals.expenses).toBe(0);
      expect(pnl.totals.netIncome).toBe(0);
    });

    it("handles negative net income (loss)", async () => {
      seedAccount("rev_1", "Revenue");
      seedAccount("exp_1", "Expense");

      seedEntry("e1", "rev_1", 0, 1000);
      seedEntry("e2", "exp_1", 5000, 0);

      const pnl = await ReportService.getProfitAndLoss(
        "biz_1",
        new Date("2020-01-01"),
        new Date("2030-01-01")
      );

      expect(pnl.totals.netIncome).toBe(-4000);
    });

    it("includes metadata in the response", async () => {
      const pnl = await ReportService.getProfitAndLoss(
        "biz_1",
        new Date("2024-01-01"),
        new Date("2024-12-31")
      );

      expect(pnl.metadata.reportType).toBe("Profit & Loss");
      expect(pnl.metadata.businessId).toBe("biz_1");
    });

    it("groups line items by revenue and expense accounts", async () => {
      seedAccount("rev_1", "Revenue", "Op", "Product Sales");
      seedAccount("rev_2", "Revenue", "Op", "Service Revenue");
      seedAccount("exp_1", "Expense", "Op", "Rent");

      seedEntry("e1", "rev_1", 0, 3000);
      seedEntry("e2", "rev_2", 0, 2000);
      seedEntry("e3", "exp_1", 1000, 0);

      const pnl = await ReportService.getProfitAndLoss(
        "biz_1",
        new Date("2020-01-01"),
        new Date("2030-01-01")
      );

      expect(pnl.lineItems.revenue).toHaveLength(2);
      expect(pnl.lineItems.expenses).toHaveLength(1);
    });
  });

  describe("getBalanceSheet", () => {
    it("categorizes accounts into assets, liabilities, and equity", async () => {
      seedAccount("asset_1", "Asset", "Bank", "Cash");
      seedAccount("liab_1", "Liability", "Payable", "AP");
      seedAccount("eq_1", "Equity", "Equity", "Owner Equity");

      seedEntry("e1", "asset_1", 10000, 0);
      seedEntry("e2", "liab_1", 0, 5000);
      seedEntry("e3", "eq_1", 0, 5000);

      const bs = await ReportService.getBalanceSheet("biz_1", new Date("2030-01-01"));

      expect(bs.lineItems.assets).toHaveLength(1);
      expect(bs.lineItems.liabilities).toHaveLength(1);
      // Equity includes seeded account + retained earnings
      expect(bs.lineItems.equity.length).toBeGreaterThanOrEqual(1);
    });

    it("includes retained earnings from P&L", async () => {
      seedAccount("rev_1", "Revenue");
      seedAccount("exp_1", "Expense");
      seedAccount("asset_1", "Asset");

      seedEntry("e1", "rev_1", 0, 10000);
      seedEntry("e2", "exp_1", 3000, 0);
      seedEntry("e3", "asset_1", 7000, 0);

      const bs = await ReportService.getBalanceSheet("biz_1", new Date("2030-01-01"));

      const retainedEarnings = bs.lineItems.equity.find(
        (e: any) => e.name === "Retained Earnings / Net Income"
      );
      expect(retainedEarnings).toBeDefined();
      expect(retainedEarnings.balance).toBe(7000); // 10000 revenue - 3000 expense
    });

    it("returns report type metadata", async () => {
      const bs = await ReportService.getBalanceSheet("biz_1", new Date("2030-01-01"));
      expect(bs.metadata.reportType).toBe("Balance Sheet");
    });
  });

  describe("getCashBalance", () => {
    it("sums balances of Bank, Cash, and Clearing accounts", async () => {
      seedAccount("bank_1", "Asset", "Bank", "Checking");
      seedAccount("cash_1", "Asset", "Cash", "Petty Cash");
      seedAccount("clear_1", "Asset", "Clearing", "Stripe Clearing");
      seedAccount("ar_1", "Asset", "Receivable", "AR"); // Not cash-equivalent

      seedEntry("e1", "bank_1", 5000, 0);
      seedEntry("e2", "cash_1", 1000, 0);
      seedEntry("e3", "clear_1", 500, 0);
      seedEntry("e4", "ar_1", 3000, 0);

      const result = await ReportService.getCashBalance("biz_1", new Date("2030-01-01"));

      expect(result.totalCash).toBe(6500); // 5000+1000+500, excluding AR
    });

    it("returns zero when no cash accounts exist", async () => {
      const result = await ReportService.getCashBalance("biz_1", new Date("2030-01-01"));
      expect(result.totalCash).toBe(0);
    });
  });

  describe("getCashFlow", () => {
    it("calculates inflows and outflows for bank accounts", async () => {
      seedAccount("bank_1", "Asset", "Bank", "Checking");

      seedEntry("e1", "bank_1", 5000, 0);  // Inflow
      seedEntry("e2", "bank_1", 0, 2000);   // Outflow

      const cf = await ReportService.getCashFlow(
        "biz_1",
        new Date("2020-01-01"),
        new Date("2030-01-01")
      );

      expect(cf.inflows).toBe(5000);
      expect(cf.outflows).toBe(2000);
      expect(cf.netCashChange).toBe(3000);
    });

    it("returns zero when no bank entries exist", async () => {
      const cf = await ReportService.getCashFlow(
        "biz_1",
        new Date("2020-01-01"),
        new Date("2030-01-01")
      );

      expect(cf.inflows).toBe(0);
      expect(cf.outflows).toBe(0);
      expect(cf.netCashChange).toBe(0);
    });
  });
});
