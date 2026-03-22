import { db, Timestamp } from "../lib/firestore";
import { LedgerService } from "./ledgerService";
import { Employee, PayrollRun, PayrollRunItem } from "../types/payroll";

export class PayrollService {
  static async getPayrollPreview(
    businessId: string,
    employeeInputs: any[] = []
  ) {
    const employeesSnapshot = await db.collection("employees")
      .where("businessId", "==", businessId)
      .where("status", "==", "Active")
      .get();

    const items: any[] = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    employeesSnapshot.forEach(doc => {
      const employee = doc.data() as Employee;
      const input = employeeInputs.find(i => i.employeeId === doc.id);
      
      let gross = 0;
      let hours = 0;
      
      if (employee.payType === "Salary") {
        gross = employee.payRate / 12;
      } else {
        hours = input?.hours || employee.defaultHours || 160;
        gross = hours * employee.payRate;
      }

      const deductions = gross * (employee.deductionRate || 0.2);
      const net = gross - deductions;

      totalGross += gross;
      totalDeductions += deductions;
      totalNet += net;

      items.push({ employeeId: doc.id, name: employee.name, hours, gross, deductions, net });
    });

    return { items, totalGross, totalDeductions, totalNet };
  }

  static async runPayroll(
    businessId: string,
    periodStart: Date,
    periodEnd: Date,
    cashAccountId: string,
    expenseAccountId: string,
    liabilityAccountId: string,
    employeeInputs: any[] = []
  ) {
    const employeesSnapshot = await db.collection("employees")
      .where("businessId", "==", businessId)
      .where("status", "==", "Active")
      .get();

    const payrollItems: PayrollRunItem[] = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    employeesSnapshot.forEach(doc => {
      const employee = doc.data() as Employee;
      const input = employeeInputs.find(i => i.employeeId === doc.id);
      
      let gross = 0;
      let hours = 0;
      
      if (employee.payType === "Salary") {
        gross = employee.payRate / 12; // Monthly assumption
      } else {
        hours = input?.hours || employee.defaultHours || 160;
        gross = hours * employee.payRate;
      }

      const deductions = gross * (employee.deductionRate || 0.2);
      const net = gross - deductions;

      totalGross += gross;
      totalDeductions += deductions;
      totalNet += net;

      payrollItems.push({ employeeId: doc.id, hours, gross, deductions, net });
    });

    const payrollRun: Partial<PayrollRun> = {
      businessId,
      periodStart: Timestamp.fromDate(periodStart),
      periodEnd: Timestamp.fromDate(periodEnd),
      status: "Processed",
      totalGross,
      totalDeductions,
      totalNet,
      items: payrollItems,
      createdAt: Timestamp.now(),
    };

    const runRef = db.collection("payroll_runs").doc();
    await runRef.set({ ...payrollRun, id: runRef.id });

    // Post Journal Entry
    await LedgerService.createTransactionWithEntries(
      businessId,
      {
        date: new Date(),
        description: `Payroll Run: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
        amount: totalGross,
        source: "payroll",
      },
      [
        { accountId: expenseAccountId, debit: totalGross, credit: 0, memo: "Gross Pay" },
        { accountId: cashAccountId, debit: 0, credit: totalNet, memo: "Net Pay" },
        { accountId: liabilityAccountId, debit: 0, credit: totalDeductions, memo: "Withholdings" }
      ]
    );

    return payrollRun;
  }
}
