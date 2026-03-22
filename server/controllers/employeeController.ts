import { Request, Response } from "express";
import { db, Timestamp } from "../lib/firestore";

export class EmployeeController {
  static async create(req: Request, res: Response) {
    const { businessId, name, payType, payRate, defaultHours, deductionRate } = req.body;
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
      res.json(employee);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    const { businessId } = req.query;
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
