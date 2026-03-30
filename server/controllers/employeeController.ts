import { Response } from "express";
import { db, Timestamp } from "../lib/firestore";
import { AuthenticatedRequest } from "../middleware/auth";

export class EmployeeController {
  static async create(req: AuthenticatedRequest, res: Response) {
    const { businessId, name, payType, payRate, defaultHours, deductionRate } = req.body;
    
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!name) return res.status(400).json({ error: "Employee name is required" });
    if (!["Salary", "Hourly"].includes(payType)) return res.status(400).json({ error: "Pay type must be Salary or Hourly" });
    if (typeof payRate !== "number" || payRate <= 0) return res.status(400).json({ error: "Pay rate must be a positive number" });

    try {
      const ref = db.collection("employees").doc();
      const employee = {
        id: ref.id,
        businessId,
        name,
        payType,
        payRate,
        defaultHours: defaultHours || 160,
        deductionRate: deductionRate ?? 0.2,
        status: "Active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await ref.set(employee);
      res.json(employee);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const snapshot = await db.collection("employees")
        .where("businessId", "==", businessId)
        .get();
      const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
