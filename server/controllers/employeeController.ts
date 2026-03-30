import { Response, NextFunction } from "express";
import { db, Timestamp } from "../lib/firestore";
import { AuditService } from "../services/auditService";
import { AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../lib/errors";

export class EmployeeController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId, name, payType, payRate, defaultHours, deductionRate } = req.body;
    const requestId = (req as any).requestId || "unknown";
    const userId = req.user?.uid || "system";

    try {
      const ref = db.collection("employees").doc();
      const employee = {
        id: ref.id,
        businessId,
        name,
        payType,
        payRate,
        defaultHours: defaultHours || 160,
        deductionRate: deductionRate || 0.2,
        status: "Active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await ref.set(employee);
      
      await AuditService.log({
        userId,
        businessId,
        action: "CREATE",
        resource: "employee",
        resourceId: employee.id,
        newData: employee
      });

      console.log(`[${requestId}] [EMPLOYEE_CREATED]: Employee ${name} created for business ${businessId}`);
      res.json(employee);
    } catch (error: any) {
      next(error);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { businessId } = req.query;
    if (!businessId) return next(new BadRequestError("businessId is required"));

    try {
      const snapshot = await db.collection("employees")
        .where("businessId", "==", businessId)
        .get();
      const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(employees);
    } catch (error: any) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { businessId, name, payType, payRate, defaultHours, deductionRate, status } = req.body;
    const userId = req.user?.uid || "system";

    try {
      const ref = db.collection("employees").doc(id);
      const snapshot = await ref.get();
      if (!snapshot.exists) {
        return next(new BadRequestError("Employee not found"));
      }
      const previousData = snapshot.data();

      const updateData: any = {
        updatedAt: Timestamp.now(),
      };
      if (name) updateData.name = name;
      if (payType) updateData.payType = payType;
      if (payRate !== undefined) updateData.payRate = payRate;
      if (defaultHours !== undefined) updateData.defaultHours = defaultHours;
      if (deductionRate !== undefined) updateData.deductionRate = deductionRate;
      if (status) updateData.status = status;

      await ref.update(updateData);
      const newData = { ...previousData, ...updateData };

      await AuditService.log({
        userId,
        businessId: businessId || (previousData as any).businessId,
        action: "UPDATE",
        resource: "employee",
        resourceId: id,
        previousData,
        newData
      });

      res.json(newData);
    } catch (error: any) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    const userId = req.user?.uid || "system";

    try {
      const ref = db.collection("employees").doc(id);
      const snapshot = await ref.get();
      if (!snapshot.exists) {
        return next(new BadRequestError("Employee not found"));
      }
      const previousData = snapshot.data();

      await ref.delete();

      await AuditService.log({
        userId,
        businessId: (previousData as any).businessId,
        action: "DELETE",
        resource: "employee",
        resourceId: id,
        previousData
      });

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  }
}
