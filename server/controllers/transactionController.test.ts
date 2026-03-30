import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, mockTimestamp, resetStore } from "../__mocks__/firestore";

vi.mock("../lib/firestore", () => ({
  db: mockDb,
  Timestamp: mockTimestamp,
}));

import { TransactionController } from "./transactionController";

function createMockReq(body: any = {}, query: any = {}): any {
  return { body, query, user: { uid: "user_1" } };
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

describe("TransactionController", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("create - input validation", () => {
    it("rejects missing businessId", async () => {
      const req = createMockReq({
        date: "2024-01-01",
        description: "Test",
        amount: 100,
        entries: [
          { accountId: "a1", debit: 100, credit: 0 },
          { accountId: "a2", debit: 0, credit: 100 },
        ],
      });
      const res = createMockRes();

      await TransactionController.create(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toMatch(/businessId/i);
    });

    it("rejects invalid date", async () => {
      const req = createMockReq({
        businessId: "biz_1",
        date: "not-a-date",
        description: "Test",
        amount: 100,
        entries: [
          { accountId: "a1", debit: 100, credit: 0 },
          { accountId: "a2", debit: 0, credit: 100 },
        ],
      });
      const res = createMockRes();

      await TransactionController.create(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toMatch(/date/i);
    });

    it("rejects missing description", async () => {
      const req = createMockReq({
        businessId: "biz_1",
        date: "2024-01-01",
        amount: 100,
        entries: [
          { accountId: "a1", debit: 100, credit: 0 },
          { accountId: "a2", debit: 0, credit: 100 },
        ],
      });
      const res = createMockRes();

      await TransactionController.create(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toMatch(/description/i);
    });

    it("rejects non-numeric amount", async () => {
      const req = createMockReq({
        businessId: "biz_1",
        date: "2024-01-01",
        description: "Test",
        amount: "one hundred",
        entries: [
          { accountId: "a1", debit: 100, credit: 0 },
          { accountId: "a2", debit: 0, credit: 100 },
        ],
      });
      const res = createMockRes();

      await TransactionController.create(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toMatch(/amount/i);
    });

    it("rejects fewer than 2 entries", async () => {
      const req = createMockReq({
        businessId: "biz_1",
        date: "2024-01-01",
        description: "Test",
        amount: 100,
        entries: [{ accountId: "a1", debit: 100, credit: 0 }],
      });
      const res = createMockRes();

      await TransactionController.create(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toMatch(/entries/i);
    });

    it("rejects entries without accountId", async () => {
      const req = createMockReq({
        businessId: "biz_1",
        date: "2024-01-01",
        description: "Test",
        amount: 100,
        entries: [
          { debit: 100, credit: 0 },
          { accountId: "a2", debit: 0, credit: 100 },
        ],
      });
      const res = createMockRes();

      await TransactionController.create(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toMatch(/accountId/i);
    });

    it("rejects invalid transaction type", async () => {
      const req = createMockReq({
        businessId: "biz_1",
        date: "2024-01-01",
        description: "Test",
        amount: 100,
        type: "InvalidType",
        entries: [
          { accountId: "a1", debit: 100, credit: 0 },
          { accountId: "a2", debit: 0, credit: 100 },
        ],
      });
      const res = createMockRes();

      await TransactionController.create(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toMatch(/type/i);
    });

    it("accepts valid transaction types", async () => {
      for (const type of ["Income", "Expense", "Transfer", "Adjustment"]) {
        resetStore();
        const req = createMockReq({
          businessId: "biz_1",
          date: "2024-01-01",
          description: "Test",
          amount: 100,
          type,
          entries: [
            { accountId: "a1", debit: 100, credit: 0 },
            { accountId: "a2", debit: 0, credit: 100 },
          ],
        });
        const res = createMockRes();

        await TransactionController.create(req, res);

        expect(res._status).not.toBe(400);
      }
    });

    it("creates a transaction with valid input", async () => {
      const req = createMockReq({
        businessId: "biz_1",
        date: "2024-01-01",
        description: "Office Supplies",
        amount: 250,
        entries: [
          { accountId: "a1", debit: 250, credit: 0 },
          { accountId: "a2", debit: 0, credit: 250 },
        ],
      });
      const res = createMockRes();

      await TransactionController.create(req, res);

      expect(res._json).toBeDefined();
      expect(res._json.businessId).toBe("biz_1");
      expect(res._json.description).toBe("Office Supplies");
    });
  });

  describe("list", () => {
    it("rejects missing businessId", async () => {
      const req = createMockReq({}, {});
      const res = createMockRes();

      await TransactionController.list(req, res);

      expect(res._status).toBe(400);
    });
  });
});
