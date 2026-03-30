import { db, Timestamp } from "../lib/firestore";
import { Invoice, InvoiceLineItem } from "../types/contacts";
import { LedgerService } from "./ledgerService";

export class InvoiceService {
  static async create(businessId: string, data: Partial<Invoice>): Promise<Invoice> {
    const ref = db.collection("invoices").doc();

    const lineItems = (data.lineItems || []).map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = data.tax || 0;
    const total = subtotal + tax;

    const invoice: Invoice = {
      id: ref.id,
      businessId,
      customerId: data.customerId || "",
      customerName: data.customerName || "",
      invoiceNumber: data.invoiceNumber || await this.generateNumber(businessId),
      issueDate: data.issueDate ? Timestamp.fromDate(new Date(data.issueDate)) : Timestamp.now(),
      dueDate: data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : Timestamp.now(),
      lineItems,
      subtotal,
      tax,
      total,
      amountPaid: 0,
      status: data.status || "Draft",
      notes: data.notes || "",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await ref.set(invoice);
    return invoice;
  }

  static async list(businessId: string, status?: string): Promise<Invoice[]> {
    let query: FirebaseFirestore.Query = db.collection("invoices")
      .where("businessId", "==", businessId);
    if (status) {
      query = query.where("status", "==", status);
    }
    const snapshot = await query.orderBy("createdAt", "desc").get();
    return snapshot.docs.map(doc => doc.data() as Invoice);
  }

  static async getById(businessId: string, invoiceId: string): Promise<Invoice | null> {
    const doc = await db.collection("invoices").doc(invoiceId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Invoice;
    if (data.businessId !== businessId) return null;
    return data;
  }

  static async updateStatus(businessId: string, invoiceId: string, status: string): Promise<Invoice | null> {
    const ref = db.collection("invoices").doc(invoiceId);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const existing = doc.data() as Invoice;
    if (existing.businessId !== businessId) return null;

    await ref.update({ status, updatedAt: Timestamp.now() });
    return { ...existing, status: status as any, updatedAt: Timestamp.now() };
  }

  static async recordPayment(
    businessId: string,
    invoiceId: string,
    amount: number,
    cashAccountId: string,
    receivableAccountId: string
  ): Promise<Invoice | null> {
    const ref = db.collection("invoices").doc(invoiceId);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const invoice = doc.data() as Invoice;
    if (invoice.businessId !== businessId) return null;
    if (invoice.status === "Paid" || invoice.status === "Cancelled" || invoice.status === "Draft") {
      throw new Error(`Cannot record payment on invoice with status "${invoice.status}"`);
    }

    const remaining = invoice.total - invoice.amountPaid;
    if (amount > remaining + 0.01) {
      throw new Error(`Payment amount $${amount.toFixed(2)} exceeds outstanding balance $${remaining.toFixed(2)}`);
    }

    const newAmountPaid = invoice.amountPaid + amount;
    const newStatus = newAmountPaid >= invoice.total ? "Paid" : invoice.status;

    // Post journal entry: Debit Cash, Credit Accounts Receivable
    await LedgerService.createTransactionWithEntries(
      businessId,
      {
        date: new Date().toISOString(),
        description: `Payment received for Invoice #${invoice.invoiceNumber}`,
        amount,
        type: "Income",
        source: "manual",
      },
      [
        { accountId: cashAccountId, debit: amount, credit: 0 },
        { accountId: receivableAccountId, debit: 0, credit: amount },
      ]
    );

    await ref.update({
      amountPaid: newAmountPaid,
      status: newStatus,
      updatedAt: Timestamp.now(),
    });

    return { ...invoice, amountPaid: newAmountPaid, status: newStatus as any };
  }

  static async sendInvoice(businessId: string, invoiceId: string, receivableAccountId: string, revenueAccountId: string): Promise<Invoice | null> {
    const ref = db.collection("invoices").doc(invoiceId);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const invoice = doc.data() as Invoice;
    if (invoice.businessId !== businessId) return null;
    if (invoice.status !== "Draft") return null;

    // Post journal entry: Debit Accounts Receivable, Credit Revenue
    await LedgerService.createTransactionWithEntries(
      businessId,
      {
        date: new Date().toISOString(),
        description: `Invoice #${invoice.invoiceNumber} to ${invoice.customerName}`,
        amount: invoice.total,
        type: "Income",
        source: "manual",
      },
      [
        { accountId: receivableAccountId, debit: invoice.total, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: invoice.total },
      ]
    );

    await ref.update({ status: "Sent", updatedAt: Timestamp.now() });
    return { ...invoice, status: "Sent" };
  }

  static async getAgingReport(businessId: string): Promise<any> {
    const invoices = await this.list(businessId);
    const now = new Date();
    const aging = { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, overNinety: 0, total: 0 };
    const details: any[] = [];

    for (const inv of invoices) {
      if (inv.status === "Paid" || inv.status === "Cancelled" || inv.status === "Draft") continue;
      const outstanding = inv.total - inv.amountPaid;
      if (outstanding <= 0) continue;

      const dueDate = inv.dueDate.toDate ? inv.dueDate.toDate() : new Date(inv.dueDate);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      let bucket: string;
      if (daysOverdue <= 0) {
        aging.current += outstanding;
        bucket = "Current";
      } else if (daysOverdue <= 30) {
        aging.thirtyDays += outstanding;
        bucket = "1-30 days";
      } else if (daysOverdue <= 60) {
        aging.sixtyDays += outstanding;
        bucket = "31-60 days";
      } else if (daysOverdue <= 90) {
        aging.ninetyDays += outstanding;
        bucket = "61-90 days";
      } else {
        aging.overNinety += outstanding;
        bucket = "90+ days";
      }

      aging.total += outstanding;
      details.push({
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        total: inv.total,
        outstanding,
        dueDate,
        daysOverdue: Math.max(0, daysOverdue),
        bucket,
      });
    }

    return { aging, details };
  }

  private static async generateNumber(businessId: string): Promise<string> {
    const snapshot = await db.collection("invoices")
      .where("businessId", "==", businessId)
      .get();
    const num = snapshot.size + 1;
    return `INV-${num.toString().padStart(4, "0")}`;
  }
}
