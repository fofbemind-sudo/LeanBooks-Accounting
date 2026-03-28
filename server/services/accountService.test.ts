import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, mockTimestamp, resetStore, seedDoc } from "../__mocks__/firestore";

vi.mock("../lib/firestore", () => ({
  db: mockDb,
  Timestamp: mockTimestamp,
}));

import { AccountService } from "./accountService";

describe("AccountService", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("initializeBusiness", () => {
    it("creates the full default chart of accounts", async () => {
      const results = await AccountService.initializeBusiness("biz_1");

      expect(results.length).toBe(16); // 16 default accounts
      const codes = results.map((a: any) => a.code);
      expect(codes).toContain("1000"); // Cash
      expect(codes).toContain("4000"); // Sales Revenue
      expect(codes).toContain("5999"); // Misc Expense
    });

    it("sets businessId on all created accounts", async () => {
      const results = await AccountService.initializeBusiness("biz_1");

      for (const account of results) {
        expect(account.businessId).toBe("biz_1");
      }
    });

    it("marks all default accounts as system accounts", async () => {
      const results = await AccountService.initializeBusiness("biz_1");

      for (const account of results) {
        expect(account.isSystem).toBe(true);
      }
    });

    it("marks all default accounts as active", async () => {
      const results = await AccountService.initializeBusiness("biz_1");

      for (const account of results) {
        expect(account.isActive).toBe(true);
      }
    });

    it("is idempotent — does not duplicate existing accounts", async () => {
      // Seed an account with code "1000" already in the DB
      seedDoc("accounts", "existing_cash", {
        businessId: "biz_1",
        code: "1000",
        name: "Cash",
        type: "Asset",
      });

      const results = await AccountService.initializeBusiness("biz_1");

      // Should create 15, not 16, because "1000" already exists
      expect(results.length).toBe(15);
      const codes = results.map((a: any) => a.code);
      expect(codes).not.toContain("1000");
    });

    it("returns empty array when all accounts already exist", async () => {
      // First call creates all
      await AccountService.initializeBusiness("biz_1");
      // Second call should find them all and skip
      resetStore();
      // Re-seed all 16 default codes
      const defaultCodes = [
        "1000", "1010", "1100", "1200",
        "2000", "2100",
        "3000", "3100",
        "4000",
        "5000", "5100", "5200", "5300", "5400", "5500", "5999",
      ];
      defaultCodes.forEach((code, i) => {
        seedDoc("accounts", `acc_${i}`, { businessId: "biz_1", code });
      });

      const results = await AccountService.initializeBusiness("biz_1");

      expect(results.length).toBe(0);
    });

    it("creates accounts with correct types", async () => {
      const results = await AccountService.initializeBusiness("biz_1");

      const cash = results.find((a: any) => a.code === "1000");
      expect(cash.type).toBe("Asset");
      expect(cash.subtype).toBe("Bank");

      const ap = results.find((a: any) => a.code === "2000");
      expect(ap.type).toBe("Liability");

      const revenue = results.find((a: any) => a.code === "4000");
      expect(revenue.type).toBe("Revenue");
    });
  });
});
