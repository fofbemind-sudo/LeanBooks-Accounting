import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { RecurringInvoiceService } from "../services/recurringInvoiceService";

export class RecurringInvoiceController {
  static async create(req: AuthenticatedRequest, res: Response) {
    const { businessId, customerId, customerName, lineItems, frequency, nextDate, notes, receivableAccountId, revenueAccountId } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: "At least one line item is required" });
    }
    if (!frequency || !["weekly", "monthly", "quarterly"].includes(frequency)) {
      return res.status(400).json({ error: "frequency must be weekly, monthly, or quarterly" });
    }

    try {
      const recurring = await RecurringInvoiceService.create(businessId, {
        customerId, customerName, lineItems, frequency, nextDate, notes, receivableAccountId, revenueAccountId,
      });
      res.json(recurring);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const items = await RecurringInvoiceService.list(businessId as string);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async toggle(req: AuthenticatedRequest, res: Response) {
    const { businessId, recurringId } = req.body;
    if (!businessId || !recurringId) {
      return res.status(400).json({ error: "businessId and recurringId are required" });
    }

    try {
      const result = await RecurringInvoiceService.toggle(businessId, recurringId);
      if (!result) return res.status(404).json({ error: "Recurring invoice not found" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async processDue(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const result = await RecurringInvoiceService.processDue(businessId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
