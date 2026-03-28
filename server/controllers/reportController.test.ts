import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, mockTimestamp, resetStore } from "../__mocks__/firestore";

vi.mock("../lib/firestore", () => ({
  db: mockDb,
  Timestamp: mockTimestamp,
}));

import { ReportController } from "./reportController";

function createMockReq(query: any = {}): any {
  return { query };
}

function createMockRes(): any {
  const res: any = {
    _status: 0,
    _json: null,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: any) {
      res._json = data;
      return res;
    },
  };
  return res;
}

describe("ReportController", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("getPnL", () => {
    it("rejects missing parameters", async () => {
      const res = createMockRes();
      await ReportController.getPnL(createMockReq({}), res);
      expect(res._status).toBe(400);
    });

    it("rejects invalid startDate", async () => {
      const res = createMockRes();
      await ReportController.getPnL(
        createMockReq({ businessId: "b1", startDate: "not-a-date", endDate: "2024-12-31" }),
        res
      );
      expect(res._status).toBe(400);
      expect(res._json.error).toMatch(/date/i);
    });

    it("rejects invalid endDate", async () => {
      const res = createMockRes();
      await ReportController.getPnL(
        createMockReq({ businessId: "b1", startDate: "2024-01-01", endDate: "xyz" }),
        res
      );
      expect(res._status).toBe(400);
      expect(res._json.error).toMatch(/date/i);
    });

    it("accepts valid parameters", async () => {
      const res = createMockRes();
      await ReportController.getPnL(
        createMockReq({ businessId: "b1", startDate: "2024-01-01", endDate: "2024-12-31" }),
        res
      );
      expect(res._status).toBe(0); // status() not called = success
      expect(res._json).toBeDefined();
      expect(res._json.metadata.reportType).toBe("Profit & Loss");
    });
  });

  describe("getBalanceSheet", () => {
    it("rejects missing parameters", async () => {
      const res = createMockRes();
      await ReportController.getBalanceSheet(createMockReq({}), res);
      expect(res._status).toBe(400);
    });

    it("rejects invalid date", async () => {
      const res = createMockRes();
      await ReportController.getBalanceSheet(
        createMockReq({ businessId: "b1", date: "bad-date" }),
        res
      );
      expect(res._status).toBe(400);
      expect(res._json.error).toMatch(/date/i);
    });

    it("accepts valid parameters", async () => {
      const res = createMockRes();
      await ReportController.getBalanceSheet(
        createMockReq({ businessId: "b1", date: "2024-12-31" }),
        res
      );
      expect(res._status).toBe(0);
    });
  });

  describe("getCashFlow", () => {
    it("rejects invalid dates", async () => {
      const res = createMockRes();
      await ReportController.getCashFlow(
        createMockReq({ businessId: "b1", startDate: "abc", endDate: "2024-12-31" }),
        res
      );
      expect(res._status).toBe(400);
    });
  });

  describe("getCashBalance", () => {
    it("rejects invalid date", async () => {
      const res = createMockRes();
      await ReportController.getCashBalance(
        createMockReq({ businessId: "b1", date: "not-valid" }),
        res
      );
      expect(res._status).toBe(400);
    });
  });
});
