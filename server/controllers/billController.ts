import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { BillService } from "../services/billService";

export class BillController {
  static async create(req: AuthenticatedRequest, res: Response) {
    const { businessId, vendorId, vendorName, issueDate, dueDate, lineItems, tax, notes } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!vendorId) return res.status(400).json({ error: "vendorId is required" });
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: "At least one line item is required" });
    }

    try {
      const bill = await BillService.create(businessId, {
        vendorId, vendorName, issueDate, dueDate, lineItems, tax, notes,
      });
      res.json(bill);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    const { businessId, status } = req.query;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const bills = await BillService.list(businessId as string, status as string);
      res.json(bills);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.query;
    const { id } = req.params;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const bill = await BillService.getById(businessId as string, id);
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      res.json(bill);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async approve(req: AuthenticatedRequest, res: Response) {
    const { businessId, billId, payableAccountId, expenseAccountId } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!billId) return res.status(400).json({ error: "billId is required" });
    if (!payableAccountId || !expenseAccountId) {
      return res.status(400).json({ error: "payableAccountId and expenseAccountId are required" });
    }

    try {
      const bill = await BillService.approveBill(businessId, billId, payableAccountId, expenseAccountId);
      if (!bill) return res.status(404).json({ error: "Bill not found or not in Draft status" });
      res.json(bill);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async recordPayment(req: AuthenticatedRequest, res: Response) {
    const { businessId, billId, amount, cashAccountId, payableAccountId } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!billId) return res.status(400).json({ error: "billId is required" });
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    try {
      const bill = await BillService.recordPayment(businessId, billId, amount, cashAccountId, payableAccountId);
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      res.json(bill);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async agingReport(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const report = await BillService.getAgingReport(businessId as string);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
