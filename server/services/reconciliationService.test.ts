import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, mockTimestamp, resetStore, seedDoc } from "../__mocks__/firestore";

vi.mock("../lib/firestore", () => ({
  db: mockDb,
  Timestamp: mockTimestamp,
}));

import { ReconciliationService } from "./reconciliationService";

function seedBankTx(id: string, amount: number, date: Date, status = "unmatched") {
  seedDoc("bank_transactions", id, {
    businessId: "biz_1",
    amount,
    date: mockTimestamp.fromDate(date),
    status,
  });
}

function seedLedgerTx(id: string, amount: number, date: Date, status = "posted") {
  seedDoc("transactions", id, {
    id,
    businessId: "biz_1",
    amount,
    date: mockTimestamp.fromDate(date),
    status,
  });
}

describe("ReconciliationService", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("autoMatch", () => {
    it("matches bank and ledger transactions with same amount and close dates", async () => {
      seedBankTx("bt_1", 100, new Date("2024-06-15"));
      seedLedgerTx("lt_1", 100, new Date("2024-06-15"));

      const result = await ReconciliationService.autoMatch("biz_1");

      expect(result.matchCount).toBe(1);
    });

    it("matches when dates are within 3 days", async () => {
      seedBankTx("bt_1", 250, new Date("2024-06-15"));
      seedLedgerTx("lt_1", 250, new Date("2024-06-17")); // 2 days later

      const result = await ReconciliationService.autoMatch("biz_1");

      expect(result.matchCount).toBe(1);
    });

    it("does not match when dates are more than 3 days apart", async () => {
      seedBankTx("bt_1", 250, new Date("2024-06-15"));
      seedLedgerTx("lt_1", 250, new Date("2024-06-25")); // 10 days later

      const result = await ReconciliationService.autoMatch("biz_1");

      expect(result.matchCount).toBe(0);
    });

    it("does not match when amounts differ", async () => {
      seedBankTx("bt_1", 100, new Date("2024-06-15"));
      seedLedgerTx("lt_1", 200, new Date("2024-06-15"));

      const result = await ReconciliationService.autoMatch("biz_1");

      expect(result.matchCount).toBe(0);
    });

    it("matches by absolute value (negative bank vs positive ledger)", async () => {
      seedBankTx("bt_1", -500, new Date("2024-06-15"));
      seedLedgerTx("lt_1", 500, new Date("2024-06-15"));

      const result = await ReconciliationService.autoMatch("biz_1");

      expect(result.matchCount).toBe(1);
    });

    it("returns zero matches when no bank transactions exist", async () => {
      seedLedgerTx("lt_1", 100, new Date("2024-06-15"));

      const result = await ReconciliationService.autoMatch("biz_1");

      expect(result.matchCount).toBe(0);
    });

    it("skips already matched bank transactions", async () => {
      seedBankTx("bt_1", 100, new Date("2024-06-15"), "matched");
      seedLedgerTx("lt_1", 100, new Date("2024-06-15"));

      const result = await ReconciliationService.autoMatch("biz_1");

      expect(result.matchCount).toBe(0);
    });

    it("matches amounts within floating-point tolerance (< 0.01)", async () => {
      seedBankTx("bt_1", 99.999, new Date("2024-06-15"));
      seedLedgerTx("lt_1", 100.0, new Date("2024-06-15"));

      const result = await ReconciliationService.autoMatch("biz_1");

      expect(result.matchCount).toBe(1);
    });

    it("does not match amounts differing by more than tolerance", async () => {
      seedBankTx("bt_1", 99.98, new Date("2024-06-15"));
      seedLedgerTx("lt_1", 100.0, new Date("2024-06-15"));

      const result = await ReconciliationService.autoMatch("biz_1");

      expect(result.matchCount).toBe(0);
    });

    it("can match multiple transactions in one run", async () => {
      seedBankTx("bt_1", 100, new Date("2024-06-15"));
      seedBankTx("bt_2", 200, new Date("2024-06-20"));
      seedLedgerTx("lt_1", 100, new Date("2024-06-15"));
      seedLedgerTx("lt_2", 200, new Date("2024-06-20"));

      const result = await ReconciliationService.autoMatch("biz_1");

      expect(result.matchCount).toBe(2);
    });
  });
});
