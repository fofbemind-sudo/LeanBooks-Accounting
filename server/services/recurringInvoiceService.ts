import { db, Timestamp } from "../lib/firestore";
import { InvoiceService } from "./invoiceService";

export interface RecurringInvoice {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
  frequency: "weekly" | "monthly" | "quarterly";
  nextDate: any;
  isActive: boolean;
  notes?: string;
  receivableAccountId: string;
  revenueAccountId: string;
  createdAt: any;
  updatedAt: any;
}

export class RecurringInvoiceService {
  static async create(businessId: string, data: Partial<RecurringInvoice>): Promise<RecurringInvoice> {
    const ref = db.collection("recurring_invoices").doc();
    const recurring: RecurringInvoice = {
      id: ref.id,
      businessId,
      customerId: data.customerId || "",
      customerName: data.customerName || "",
      lineItems: data.lineItems || [],
      frequency: data.frequency || "monthly",
      nextDate: data.nextDate ? Timestamp.fromDate(new Date(data.nextDate)) : Timestamp.now(),
      isActive: true,
      notes: data.notes || "",
      receivableAccountId: data.receivableAccountId || "",
      revenueAccountId: data.revenueAccountId || "",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await ref.set(recurring);
    return recurring;
  }

  static async list(businessId: string): Promise<RecurringInvoice[]> {
    const snapshot = await db.collection("recurring_invoices")
      .where("businessId", "==", businessId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map(doc => doc.data() as RecurringInvoice);
  }

  static async toggle(businessId: string, recurringId: string): Promise<RecurringInvoice | null> {
    const ref = db.collection("recurring_invoices").doc(recurringId);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const existing = doc.data() as RecurringInvoice;
    if (existing.businessId !== businessId) return null;

    const newActive = !existing.isActive;
    await ref.update({ isActive: newActive, updatedAt: Timestamp.now() });
    return { ...existing, isActive: newActive };
  }

  static async processDue(businessId: string): Promise<{ created: number }> {
    const now = new Date();
    const snapshot = await db.collection("recurring_invoices")
      .where("businessId", "==", businessId)
      .where("isActive", "==", true)
      .where("nextDate", "<=", Timestamp.fromDate(now))
      .get();

    let created = 0;

    for (const doc of snapshot.docs) {
      const recurring = doc.data() as RecurringInvoice;

      // Create the invoice
      const invoice = await InvoiceService.create(businessId, {
        customerId: recurring.customerId,
        customerName: recurring.customerName,
        lineItems: recurring.lineItems.map(li => ({
          ...li,
          amount: li.quantity * li.unitPrice,
        })),
        issueDate: now.toISOString(),
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: recurring.notes,
      });

      // Auto-send if accounts are configured
      if (recurring.receivableAccountId && recurring.revenueAccountId) {
        await InvoiceService.sendInvoice(
          businessId,
          invoice.id,
          recurring.receivableAccountId,
          recurring.revenueAccountId
        );
      }

      // Calculate next date
      const currentNext = recurring.nextDate.toDate ? recurring.nextDate.toDate() : new Date(recurring.nextDate);
      let nextDate: Date;
      if (recurring.frequency === "weekly") {
        nextDate = new Date(currentNext.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (recurring.frequency === "quarterly") {
        nextDate = new Date(currentNext);
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else {
        nextDate = new Date(currentNext);
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      await db.collection("recurring_invoices").doc(recurring.id).update({
        nextDate: Timestamp.fromDate(nextDate),
        updatedAt: Timestamp.now(),
      });

      created++;
    }

    return { created };
  }
}
