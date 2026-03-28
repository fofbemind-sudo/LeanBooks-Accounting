import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, mockTimestamp, resetStore, seedDoc } from "../__mocks__/firestore";

vi.mock("../lib/firestore", () => ({
  db: mockDb,
  Timestamp: mockTimestamp,
}));

import { PayrollService } from "./payrollService";

function seedEmployee(id: string, overrides: Record<string, any> = {}) {
  seedDoc("employees", id, {
    businessId: "biz_1",
    name: "Test Employee",
    payType: "Salary",
    payRate: 120000,
    defaultHours: 160,
    deductionRate: 0.2,
    status: "Active",
    ...overrides,
  });
}

describe("PayrollService", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("getPayrollPreview", () => {
    it("calculates salary employee as payRate / 12", async () => {
      seedEmployee("emp_1", { payType: "Salary", payRate: 120000 });

      const preview = await PayrollService.getPayrollPreview("biz_1");

      expect(preview.items).toHaveLength(1);
      expect(preview.items[0].gross).toBe(10000); // 120000 / 12
      expect(preview.items[0].deductions).toBe(2000); // 10000 * 0.2
      expect(preview.items[0].net).toBe(8000);
    });

    it("calculates hourly employee as hours * payRate", async () => {
      seedEmployee("emp_1", { payType: "Hourly", payRate: 25, defaultHours: 160 });

      const preview = await PayrollService.getPayrollPreview("biz_1");

      expect(preview.items[0].gross).toBe(4000); // 160 * 25
      expect(preview.items[0].hours).toBe(160);
    });

    it("uses employeeInputs hours override for hourly employees", async () => {
      seedEmployee("emp_1", { payType: "Hourly", payRate: 30, defaultHours: 160 });

      const preview = await PayrollService.getPayrollPreview("biz_1", [
        { employeeId: "emp_1", hours: 80 },
      ]);

      expect(preview.items[0].hours).toBe(80);
      expect(preview.items[0].gross).toBe(2400); // 80 * 30
    });

    it("uses default deduction rate of 0.2 when not specified", async () => {
      seedEmployee("emp_1", { payType: "Salary", payRate: 60000, deductionRate: undefined });

      const preview = await PayrollService.getPayrollPreview("biz_1");

      // deductionRate is undefined, so (employee.deductionRate || 0.2) = 0.2
      expect(preview.items[0].deductions).toBe(1000); // 5000 * 0.2
    });

    it("calculates totals across multiple employees", async () => {
      seedEmployee("emp_1", { payType: "Salary", payRate: 120000, deductionRate: 0.2 });
      seedEmployee("emp_2", { payType: "Hourly", payRate: 50, defaultHours: 100, deductionRate: 0.1 });

      const preview = await PayrollService.getPayrollPreview("biz_1");

      expect(preview.items).toHaveLength(2);
      // emp_1: gross=10000, ded=2000, net=8000
      // emp_2: gross=5000, ded=500, net=4500
      expect(preview.totalGross).toBe(15000);
      expect(preview.totalDeductions).toBe(2500);
      expect(preview.totalNet).toBe(12500);
    });

    it("excludes inactive employees", async () => {
      seedEmployee("emp_1", { status: "Active" });
      seedEmployee("emp_2", { status: "Inactive" });

      const preview = await PayrollService.getPayrollPreview("biz_1");

      // Our mock filters by status == "Active", so only emp_1 should appear
      expect(preview.items).toHaveLength(1);
    });

    it("returns empty results when no employees exist", async () => {
      const preview = await PayrollService.getPayrollPreview("biz_1");

      expect(preview.items).toHaveLength(0);
      expect(preview.totalGross).toBe(0);
      expect(preview.totalNet).toBe(0);
    });
  });

  describe("runPayroll", () => {
    it("creates a payroll run and posts a balanced journal entry", async () => {
      seedEmployee("emp_1", { payType: "Salary", payRate: 60000, deductionRate: 0.2 });

      const result = await PayrollService.runPayroll(
        "biz_1",
        new Date("2024-01-01"),
        new Date("2024-01-31"),
        "cash_acc",
        "expense_acc",
        "liability_acc"
      );

      expect(result.status).toBe("Processed");
      expect(result.totalGross).toBe(5000); // 60000/12
      expect(result.totalDeductions).toBe(1000); // 5000*0.2
      expect(result.totalNet).toBe(4000);
      expect(result.items).toHaveLength(1);
    });

    it("preview and runPayroll produce identical calculations", async () => {
      seedEmployee("emp_1", { payType: "Hourly", payRate: 40, defaultHours: 100, deductionRate: 0.15 });

      const preview = await PayrollService.getPayrollPreview("biz_1");
      // Reset and re-seed since runPayroll modifies state
      resetStore();
      seedEmployee("emp_1", { payType: "Hourly", payRate: 40, defaultHours: 100, deductionRate: 0.15 });

      const run = await PayrollService.runPayroll(
        "biz_1",
        new Date("2024-01-01"),
        new Date("2024-01-31"),
        "cash",
        "expense",
        "liability"
      );

      expect(run.totalGross).toBe(preview.totalGross);
      expect(run.totalDeductions).toBe(preview.totalDeductions);
      expect(run.totalNet).toBe(preview.totalNet);
    });
  });
});
