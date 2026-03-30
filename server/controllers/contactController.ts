import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { ContactService } from "../services/contactService";

export class ContactController {
  static async create(req: AuthenticatedRequest, res: Response) {
    const { businessId, type, name, email, phone, address, city, state, zip, taxId, paymentTerms, notes } = req.body;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });
    if (!name) return res.status(400).json({ error: "name is required" });
    if (!type || !["Customer", "Vendor"].includes(type)) {
      return res.status(400).json({ error: "type must be 'Customer' or 'Vendor'" });
    }

    try {
      const contact = await ContactService.create(businessId, {
        type, name, email, phone, address, city, state, zip, taxId, paymentTerms, notes,
      });
      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    const { businessId, type } = req.query;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const contacts = await ContactService.list(
        businessId as string,
        type as any
      );
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.query;
    const { id } = req.params;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const contact = await ContactService.getById(businessId as string, id);
      if (!contact) return res.status(404).json({ error: "Contact not found" });
      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    const { businessId } = req.body;
    const { id } = req.params;
    if (!businessId) return res.status(400).json({ error: "businessId is required" });

    try {
      const contact = await ContactService.update(businessId, id, req.body);
      if (!contact) return res.status(404).json({ error: "Contact not found" });
      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
