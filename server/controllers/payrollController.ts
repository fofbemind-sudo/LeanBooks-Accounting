import { Request, Response } from "express";
import { PayrollService } from "../services/payrollService";
import { db } from "../lib/firestore";

export class PayrollController {
  static async run(req: Request, res: Response) {
    const { businessId, periodStart, periodEnd, cashAccountId, expenseAccountId, liabilityAccountId, employeeInputs } = req.body;
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

  static async listRuns(req: Request, res: Response) {
    const { businessId } = req.query;
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
