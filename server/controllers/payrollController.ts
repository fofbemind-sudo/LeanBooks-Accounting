import { Response, NextFunction } from "express";
import { PayrollService } from "../services/payrollService";
import { AuditService } from "../services/auditService";
import { db } from "../lib/firestore";
import { AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../lib/errors";

export class PayrollController {
  static async preview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId, employeeInputs } = req.body;
    const requestId = (req as any).requestId || "unknown";

    try {
      const preview = await PayrollService.getPayrollPreview(businessId, employeeInputs);
      res.json(preview);
    } catch (error: any) {
      next(error);
    }
  }

  static async run(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId, periodStart, periodEnd, cashAccountId, expenseAccountId, liabilityAccountId, employeeInputs } = req.body;
    const requestId = (req as any).requestId || "unknown";
    const userId = req.user?.uid || "system";

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
      
      await AuditService.log({
        userId,
        businessId,
        action: "CREATE",
        resource: "payroll_run",
        resourceId: (run as any).id || "unknown",
        newData: run
      });

      console.log(`[${requestId}] [PAYROLL_RUN]: Payroll run completed for business ${businessId} from ${periodStart} to ${periodEnd}`);
      res.json(run);
    } catch (error: any) {
      next(error);
    }
  }

  static async listRuns(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId } = req.query;
    if (!businessId) return next(new BadRequestError("businessId is required"));

    try {
      const snapshot = await db.collection("payroll_runs")
        .where("businessId", "==", businessId)
        .orderBy("createdAt", "desc")
        .get();
      const runs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(runs);
    } catch (error: any) {
      next(error);
    }
  }
}
