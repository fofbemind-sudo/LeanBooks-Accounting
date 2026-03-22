import { Response } from "express";
import { PayrollService } from "../services/payrollService";
import { db } from "../lib/firestore";
import { AuthenticatedRequest } from "../middleware/auth";

export class PayrollController {
  static async preview(req: AuthenticatedRequest, res: Response) {
    const { businessId, employeeInputs } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const preview = await PayrollService.getPayrollPreview(businessId, employeeInputs);
      res.json(preview);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async run(req: AuthenticatedRequest, res: Response) {
    const { businessId, periodStart, periodEnd, cashAccountId, expenseAccountId, liabilityAccountId, employeeInputs } = req.body;
    
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!periodStart || isNaN(Date.parse(periodStart))) return res.status(400).json({ error: "Valid periodStart is required" });
    if (!periodEnd || isNaN(Date.parse(periodEnd))) return res.status(400).json({ error: "Valid periodEnd is required" });
    if (!cashAccountId || !expenseAccountId || !liabilityAccountId) {
      return res.status(400).json({ error: "Cash, Expense, and Liability account IDs are required" });
    }

    try {
      const run = await PayrollService.runPayroll(
        businessId,
        new Date(periodStart),
        new Date(periodEnd),
        cashAccountId,
        expenseAccountId,
        liabilityAccountId,
        employeeInputs
      );
      res.json(run);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listRuns(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const snapshot = await db.collection("payroll_runs")
        .where("businessId", "==", businessId)
        .orderBy("createdAt", "desc")
        .get();
      const runs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(runs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
