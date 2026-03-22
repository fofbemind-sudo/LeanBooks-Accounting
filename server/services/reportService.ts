import { db, Timestamp } from "../lib/firestore";
import { LedgerService } from "./ledgerService";
import { Account } from "../types/accounting";

export class ReportService {
  static async getProfitAndLoss(businessId: string, startDate: Date, endDate: Date) {
    const accountsSnapshot = await db.collection("accounts")
      .where("businessId", "==", businessId)
      .get();
    
    const accountsMap = new Map<string, Account>();
    accountsSnapshot.forEach(doc => accountsMap.set(doc.id, doc.data() as Account));

    const entriesSnapshot = await db.collection("entries")
      .where("businessId", "==", businessId)
      .where("date", ">=", Timestamp.fromDate(startDate))
      .where("date", "<=", Timestamp.fromDate(endDate))
      .get();

    let revenue = 0;
    let expenses = 0;
    const revenueAccounts: any[] = [];
    const expenseAccounts: any[] = [];

    const accountBalances: Record<string, number> = {};

    entriesSnapshot.forEach(doc => {
      const entry = doc.data();
      const accountId = entry.accountId;
      if (!accountBalances[accountId]) accountBalances[accountId] = 0;
      accountBalances[accountId] += (entry.credit - entry.debit); // Revenue/Expense usually credit-based
    });

    accountsMap.forEach((account, id) => {
      const balance = accountBalances[id] || 0;
      if (account.type === "Revenue") {
        revenue += balance;
        revenueAccounts.push({ name: account.name, balance });
      } else if (account.type === "Expense") {
        const expenseBalance = -balance; // Expenses are debit-based
        expenses += expenseBalance;
        expenseAccounts.push({ name: account.name, balance: expenseBalance });
      }
    });

    return { revenue, expenses, netIncome: revenue - expenses, revenueAccounts, expenseAccounts };
  }

  static async getBalanceSheet(businessId: string, asOfDate: Date) {
    const accountsSnapshot = await db.collection("accounts")
      .where("businessId", "==", businessId)
      .get();
    
    const accountsMap = new Map<string, Account>();
    accountsSnapshot.forEach(doc => accountsMap.set(doc.id, doc.data() as Account));

    const balances = await LedgerService.getAccountBalances(businessId, asOfDate);

    const report: any = { Assets: [], Liabilities: [], Equity: [], totals: { Assets: 0, Liabilities: 0, Equity: 0 } };

    accountsMap.forEach((account, id) => {
      const balance = balances[id] || 0;
      if (account.type === "Asset") {
        report.Assets.push({ name: account.name, balance });
        report.totals.Assets += balance;
      } else if (account.type === "Liability") {
        const liabilityBalance = -balance;
        report.Liabilities.push({ name: account.name, balance: liabilityBalance });
        report.totals.Liabilities += liabilityBalance;
      } else if (account.type === "Equity") {
        const equityBalance = -balance;
        report.Equity.push({ name: account.name, balance: equityBalance });
        report.totals.Equity += equityBalance;
      }
    });

    return report;
  }

  static async getCashFlow(businessId: string, startDate: Date, endDate: Date) {
    const accountsSnapshot = await db.collection("accounts")
      .where("businessId", "==", businessId)
      .where("subtype", "==", "Bank")
      .get();
    
    const bankAccountIds = accountsSnapshot.docs.map(doc => doc.id);

    const entriesSnapshot = await db.collection("entries")
      .where("businessId", "==", businessId)
      .where("date", ">=", Timestamp.fromDate(startDate))
      .where("date", "<=", Timestamp.fromDate(endDate))
      .get();

    let inflows = 0;
    let outflows = 0;

    entriesSnapshot.forEach(doc => {
      const entry = doc.data();
      if (bankAccountIds.includes(entry.accountId)) {
        if (entry.debit > 0) inflows += entry.debit;
        if (entry.credit > 0) outflows += entry.credit;
      }
    });

    return { inflows, outflows, netCashChange: inflows - outflows };
  }
}
