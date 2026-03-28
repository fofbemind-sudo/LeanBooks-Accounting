import { db, Timestamp } from "../lib/firestore";
import { Bill } from "../types/contacts";
import { LedgerService } from "./ledgerService";

export class BillService {
  static async create(businessId: string, data: Partial<Bill>): Promise<Bill> {
    const ref = db.collection("bills").doc();

    const lineItems = (data.lineItems || []).map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
      accountId: item.accountId,
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = data.tax || 0;
    const total = subtotal + tax;

    const bill: Bill = {
      id: ref.id,
      businessId,
      vendorId: data.vendorId || "",
      vendorName: data.vendorName || "",
      billNumber: data.billNumber || await this.generateNumber(businessId),
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

    await ref.set(bill);
    return bill;
  }

  static async list(businessId: string, status?: string): Promise<Bill[]> {
    let query: FirebaseFirestore.Query = db.collection("bills")
      .where("businessId", "==", businessId);
    if (status) {
      query = query.where("status", "==", status);
    }
    const snapshot = await query.orderBy("createdAt", "desc").get();
    return snapshot.docs.map(doc => doc.data() as Bill);
  }

  static async getById(businessId: string, billId: string): Promise<Bill | null> {
    const doc = await db.collection("bills").doc(billId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Bill;
    if (data.businessId !== businessId) return null;
    return data;
  }

  static async approveBill(businessId: string, billId: string, payableAccountId: string, expenseAccountId: string): Promise<Bill | null> {
    const ref = db.collection("bills").doc(billId);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const bill = doc.data() as Bill;
    if (bill.businessId !== businessId) return null;
    if (bill.status !== "Draft") return null;

    // Post journal entry: Debit Expense, Credit Accounts Payable
    await LedgerService.createTransactionWithEntries(
      businessId,
      {
        date: new Date().toISOString(),
        description: `Bill #${bill.billNumber} from ${bill.vendorName}`,
        amount: bill.total,
        type: "Expense",
        source: "manual",
      },
      [
        { accountId: expenseAccountId, debit: bill.total, credit: 0 },
        { accountId: payableAccountId, debit: 0, credit: bill.total },
      ]
    );

    await ref.update({ status: "Received", updatedAt: Timestamp.now() });
    return { ...bill, status: "Received" };
  }

  static async recordPayment(
    businessId: string,
    billId: string,
    amount: number,
    cashAccountId: string,
    payableAccountId: string
  ): Promise<Bill | null> {
    const ref = db.collection("bills").doc(billId);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const bill = doc.data() as Bill;
    if (bill.businessId !== businessId) return null;

    const newAmountPaid = bill.amountPaid + amount;
    const newStatus = newAmountPaid >= bill.total ? "Paid" : bill.status;

    // Post journal entry: Debit Accounts Payable, Credit Cash
    await LedgerService.createTransactionWithEntries(
      businessId,
      {
        date: new Date().toISOString(),
        description: `Payment for Bill #${bill.billNumber}`,
        amount,
        type: "Expense",
        source: "manual",
      },
      [
        { accountId: payableAccountId, debit: amount, credit: 0 },
        { accountId: cashAccountId, debit: 0, credit: amount },
      ]
    );

    await ref.update({
      amountPaid: newAmountPaid,
      status: newStatus,
      updatedAt: Timestamp.now(),
    });

    return { ...bill, amountPaid: newAmountPaid, status: newStatus as any };
  }

  static async getAgingReport(businessId: string): Promise<any> {
    const bills = await this.list(businessId);
    const now = new Date();
    const aging = { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, overNinety: 0, total: 0 };
    const details: any[] = [];

    for (const bill of bills) {
      if (bill.status === "Paid" || bill.status === "Cancelled" || bill.status === "Draft") continue;
      const outstanding = bill.total - bill.amountPaid;
      if (outstanding <= 0) continue;

      const dueDate = bill.dueDate.toDate ? bill.dueDate.toDate() : new Date(bill.dueDate);
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
        billNumber: bill.billNumber,
        vendorName: bill.vendorName,
        total: bill.total,
        outstanding,
        dueDate,
        daysOverdue: Math.max(0, daysOverdue),
        bucket,
      });
    }

    return { aging, details };
  }

  private static async generateNumber(businessId: string): Promise<string> {
    const snapshot = await db.collection("bills")
      .where("businessId", "==", businessId)
      .get();
    const num = snapshot.size + 1;
    return `BILL-${num.toString().padStart(4, "0")}`;
  }
}
