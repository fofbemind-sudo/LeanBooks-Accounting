import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, mockTimestamp, resetStore, seedDoc } from "../__mocks__/firestore";

vi.mock("../lib/firestore", () => ({
  db: mockDb,
  Timestamp: mockTimestamp,
}));

import { EmployeeController } from "./employeeController";

function createMockReq(body: any = {}): any {
  return { body, user: { uid: "user_1" } };
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

describe("EmployeeController", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("create", () => {
    it("rejects missing businessId", async () => {
      const res = createMockRes();
      await EmployeeController.create(
        createMockReq({ name: "John", payType: "Salary", payRate: 50000 }),
        res
      );
      expect(res._status).toBe(400);
    });

    it("rejects missing name", async () => {
      const res = createMockRes();
      await EmployeeController.create(
        createMockReq({ businessId: "b1", payType: "Salary", payRate: 50000 }),
        res
      );
      expect(res._status).toBe(400);
    });

    it("rejects invalid payType", async () => {
      const res = createMockRes();
      await EmployeeController.create(
        createMockReq({ businessId: "b1", name: "John", payType: "Commission", payRate: 50000 }),
        res
      );
      expect(res._status).toBe(400);
    });

    it("rejects non-positive payRate", async () => {
      const res = createMockRes();
      await EmployeeController.create(
        createMockReq({ businessId: "b1", name: "John", payType: "Salary", payRate: -100 }),
        res
      );
      expect(res._status).toBe(400);
    });

    it("creates an employee with valid input", async () => {
      const res = createMockRes();
      await EmployeeController.create(
        createMockReq({ businessId: "b1", name: "Jane", payType: "Salary", payRate: 60000 }),
        res
      );
      expect(res._json.name).toBe("Jane");
      expect(res._json.status).toBe("Active");
      expect(res._json.defaultHours).toBe(160);
      expect(res._json.deductionRate).toBe(0.2);
    });

    it("preserves deductionRate=0 for tax-exempt employees", async () => {
      const res = createMockRes();
      await EmployeeController.create(
        createMockReq({
          businessId: "b1",
          name: "Contractor",
          payType: "Hourly",
          payRate: 50,
          deductionRate: 0,
        }),
        res
      );
      expect(res._json.deductionRate).toBe(0);
    });
  });
});
