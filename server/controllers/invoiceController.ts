import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { InvoiceService } from "../services/invoiceService";

export class InvoiceController {
  static async create(req: AuthenticatedRequest, res: Response) {
    const { businessId, customerId, customerName, issueDate, dueDate, lineItems, tax, notes } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: "At least one line item is required" });
    }

    try {
      const invoice = await InvoiceService.create(businessId, {
        customerId, customerName, issueDate, dueDate, lineItems, tax, notes,
      });
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    const { businessId, status } = req.query;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const invoices = await InvoiceService.list(businessId as string, status as string);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.query;
    const { id } = req.params;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const invoice = await InvoiceService.getById(businessId as string, id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async send(req: AuthenticatedRequest, res: Response) {
    const { businessId, invoiceId, receivableAccountId, revenueAccountId } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!invoiceId) return res.status(400).json({ error: "invoiceId is required" });
    if (!receivableAccountId || !revenueAccountId) {
      return res.status(400).json({ error: "receivableAccountId and revenueAccountId are required" });
    }

    try {
      const invoice = await InvoiceService.sendInvoice(businessId, invoiceId, receivableAccountId, revenueAccountId);
      if (!invoice) return res.status(404).json({ error: "Invoice not found or not in Draft status" });
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async recordPayment(req: AuthenticatedRequest, res: Response) {
    const { businessId, invoiceId, amount, cashAccountId, receivableAccountId } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!invoiceId) return res.status(400).json({ error: "invoiceId is required" });
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    try {
      const invoice = await InvoiceService.recordPayment(businessId, invoiceId, amount, cashAccountId, receivableAccountId);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async agingReport(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const report = await InvoiceService.getAgingReport(businessId as string);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
