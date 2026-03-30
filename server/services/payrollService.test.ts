import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/firestore", () => {
  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue({}),
  };
  return {
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
      batch: vi.fn().mockReturnValue(mockBatch),
    },
    Timestamp: {
      now: vi.fn().mockReturnValue({ toDate: () => new Date() }),
      fromDate: vi.fn().mockImplementation((date: Date) => ({ toDate: () => date })),
    },
  };
});

import { PayrollService } from "./payrollService";
import { db } from "../lib/firestore";
import { LedgerService } from "./ledgerService";

describe("PayrollService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPayrollPreview", () => {
    it("should calculate payroll preview for salary and hourly employees", async () => {
      const mockEmployees = [
        { id: "emp-1", name: "Salary Emp", payType: "Salary", payRate: 120000, deductionRate: 0.2 },
        { id: "emp-2", name: "Hourly Emp", payType: "Hourly", payRate: 50, defaultHours: 160, deductionRate: 0.2 },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => {
          mockEmployees.forEach((emp) => callback({ id: emp.id, data: () => emp }));
        },
      };

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSnapshot),
      });

      const preview = await PayrollService.getPayrollPreview("biz-1");

      expect(preview.totalGross).toBe(10000 + 8000); // 120k/12 + 50*160
      expect(preview.totalDeductions).toBe(preview.totalGross * 0.2);
      expect(preview.totalNet).toBe(preview.totalGross - preview.totalDeductions);
      expect(preview.items).toHaveLength(2);
    });
  });

  describe("runPayroll", () => {
    it("should process payroll and post journal entries for both salary and hourly employees", async () => {
      const mockEmployees = [
        { id: "emp-1", name: "Salary Emp", payType: "Salary", payRate: 120000, deductionRate: 0.2 },
        { id: "emp-2", name: "Hourly Emp", payType: "Hourly", payRate: 50, defaultHours: 160, deductionRate: 0.2 },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => {
          mockEmployees.forEach((emp) => callback({ id: emp.id, data: () => emp }));
        },
      };

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSnapshot),
        doc: vi.fn().mockReturnValue({
          id: "run-id",
          set: vi.fn().mockResolvedValue({}),
        }),
      });

      const ledgerSpy = vi.spyOn(LedgerService, "createTransactionWithEntries").mockResolvedValue({} as any);

      const result = await PayrollService.runPayroll(
        "biz-1",
        new Date(),
        new Date(),
        "cash-acc",
        "exp-acc",
        "liab-acc",
        [{ employeeId: "emp-2", hours: 100 }] // Custom hours for hourly emp
      );

      expect(result.totalGross).toBe(10000 + 5000); // 10k salary + 5k hourly (100 * 50)
      expect(ledgerSpy).toHaveBeenCalled();
      expect(db.collection).toHaveBeenCalledWith("payroll_runs");
    });

    it("should throw InternalServerError if runPayroll fails", async () => {
      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(new Error("Firestore error")),
      });

      await expect(
        PayrollService.runPayroll("biz-1", new Date(), new Date(), "cash", "exp", "liab")
      ).rejects.toThrow("Failed to process payroll run");
    });
  });
});
