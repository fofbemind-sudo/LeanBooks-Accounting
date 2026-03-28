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
      // For P&L, we usually look at the net change in the period
      accountBalances[accountId] += (entry.credit - entry.debit);
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

    return { 
      metadata: { businessId, startDate, endDate, reportType: "Profit & Loss" },
      lineItems: { revenue: revenueAccounts, expenses: expenseAccounts },
      totals: { revenue, expenses, netIncome: revenue - expenses }
    };
  }

  static async getBalanceSheet(businessId: string, asOfDate: Date) {
    const accountsSnapshot = await db.collection("accounts")
      .where("businessId", "==", businessId)
      .get();
    
    const accountsMap = new Map<string, Account>();
    accountsSnapshot.forEach(doc => accountsMap.set(doc.id, doc.data() as Account));

    const balances = await LedgerService.getAccountBalances(businessId, asOfDate);

    const report: any = { 
      Assets: [], 
      Liabilities: [], 
      Equity: [], 
      totals: { Assets: 0, Liabilities: 0, Equity: 0 } 
    };

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

    // Calculate Net Income from inception to asOfDate to balance the sheet
    // This represents Retained Earnings + Current Net Income
    const pnl = await this.getProfitAndLoss(businessId, new Date(0), asOfDate);
    const netIncome = pnl.totals.netIncome;

    report.Equity.push({ name: "Retained Earnings / Net Income", balance: netIncome });
    report.totals.Equity += netIncome;

    return {
      metadata: { businessId, asOfDate, reportType: "Balance Sheet" },
      lineItems: { assets: report.Assets, liabilities: report.Liabilities, equity: report.Equity },
      totals: report.totals
    };
  }

  static async getCashBalance(businessId: string, asOfDate: Date) {
    const accountsSnapshot = await db.collection("accounts")
      .where("businessId", "==", businessId)
      .get();
    
    const cashEquivalentSubtypes = ["Bank", "Cash", "Clearing"];
    const cashAccountIds: string[] = [];
    
    accountsSnapshot.forEach(doc => {
      const data = doc.data();
      if (cashEquivalentSubtypes.includes(data.subtype)) {
        cashAccountIds.push(doc.id);
      }
    });

    const balances = await LedgerService.getAccountBalances(businessId, asOfDate);
    let totalCash = 0;
    cashAccountIds.forEach(id => {
      totalCash += (balances[id] || 0);
    });

    return { totalCash };
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

  static async getTrialBalance(businessId: string, asOfDate: Date) {
    const accountsSnapshot = await db.collection("accounts")
      .where("businessId", "==", businessId)
      .get();

    const accountsMap = new Map<string, Account>();
    accountsSnapshot.forEach(doc => accountsMap.set(doc.id, doc.data() as Account));

    const entriesSnapshot = await db.collection("entries")
      .where("businessId", "==", businessId)
      .where("date", "<=", Timestamp.fromDate(asOfDate))
      .get();

    const totals: Record<string, { debit: number; credit: number }> = {};
    entriesSnapshot.forEach(doc => {
      const entry = doc.data();
      if (!totals[entry.accountId]) totals[entry.accountId] = { debit: 0, credit: 0 };
      totals[entry.accountId].debit += entry.debit || 0;
      totals[entry.accountId].credit += entry.credit || 0;
    });

    const accounts: any[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    accountsMap.forEach((account, id) => {
      const t = totals[id];
      if (!t) return;
      const debitBalance = t.debit > t.credit ? t.debit - t.credit : 0;
      const creditBalance = t.credit > t.debit ? t.credit - t.debit : 0;
      totalDebit += debitBalance;
      totalCredit += creditBalance;
      accounts.push({
        code: account.code,
        name: account.name,
        type: account.type,
        debit: debitBalance,
        credit: creditBalance,
      });
    });

    accounts.sort((a, b) => a.code.localeCompare(b.code));

    return {
      metadata: { businessId, asOfDate, reportType: "Trial Balance" },
      accounts,
      totals: { debit: totalDebit, credit: totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 },
    };
  }

  static async getGeneralLedger(businessId: string, startDate: Date, endDate: Date, accountId?: string) {
    const accountsSnapshot = await db.collection("accounts")
      .where("businessId", "==", businessId)
      .get();

    const accountsMap = new Map<string, Account>();
    accountsSnapshot.forEach(doc => accountsMap.set(doc.id, doc.data() as Account));

    let entriesQuery: FirebaseFirestore.Query = db.collection("entries")
      .where("businessId", "==", businessId)
      .where("date", ">=", Timestamp.fromDate(startDate))
      .where("date", "<=", Timestamp.fromDate(endDate));

    const entriesSnapshot = await entriesQuery.orderBy("date", "asc").get();

    // Get transaction descriptions
    const txIds = new Set<string>();
    entriesSnapshot.forEach(doc => txIds.add(doc.data().transactionId));

    const txMap = new Map<string, any>();
    // Fetch transactions in batches of 10 (Firestore 'in' limit)
    const txIdArray = Array.from(txIds);
    for (let i = 0; i < txIdArray.length; i += 10) {
      const batch = txIdArray.slice(i, i + 10);
      const txSnapshot = await db.collection("transactions")
        .where("id", "in", batch)
        .get();
      txSnapshot.forEach(doc => txMap.set(doc.data().id, doc.data()));
    }

    const entries: any[] = [];
    entriesSnapshot.forEach(doc => {
      const entry = doc.data();
      if (accountId && entry.accountId !== accountId) return;
      const account = accountsMap.get(entry.accountId);
      const tx = txMap.get(entry.transactionId);
      entries.push({
        date: entry.date,
        accountCode: account?.code || "",
        accountName: account?.name || "Unknown",
        accountType: account?.type || "",
        description: tx?.description || entry.memo || "",
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        transactionId: entry.transactionId,
      });
    });

    return {
      metadata: { businessId, startDate, endDate, reportType: "General Ledger" },
      entries,
    };
  }
}
