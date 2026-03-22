import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { fileURLToPath } from "url";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // 1. Accounting: Create Transaction
  app.post("/api/transactions", async (req, res) => {
    const { businessId, date, description, amount, type, source, entries } = req.body;

    // Validate double-entry balance
    const totalDebit = entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return res.status(400).json({ error: "Total debits must equal total credits." });
    }

    try {
      const batch = db.batch();
      const transactionRef = db.collection("transactions").doc();
      batch.set(transactionRef, {
        businessId,
        date: admin.firestore.Timestamp.fromDate(new Date(date)),
        description,
        amount,
        type,
        source,
      });

      entries.forEach((entry: any) => {
        const entryRef = db.collection("entries").doc();
        batch.set(entryRef, {
          businessId,
          transactionId: transactionRef.id,
          accountId: entry.accountId,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          date: admin.firestore.Timestamp.fromDate(new Date(date)),
        });
      });

      await batch.commit();
      res.json({ id: transactionRef.id });
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ error: "Failed to create transaction." });
    }
  });

  // 2. Reporting: P&L
  app.get("/api/reports/pnl", async (req, res) => {
    const { businessId, startDate, endDate } = req.query;

    try {
      const accountsSnapshot = await db.collection("accounts")
        .where("businessId", "==", businessId)
        .get();
      
      const accountsMap = new Map();
      accountsSnapshot.forEach(doc => accountsMap.set(doc.id, doc.data()));

      const entriesSnapshot = await db.collection("entries")
        .where("businessId", "==", businessId)
        .where("date", ">=", admin.firestore.Timestamp.fromDate(new Date(startDate as string)))
        .where("date", "<=", admin.firestore.Timestamp.fromDate(new Date(endDate as string)))
        .get();

      let revenue = 0;
      let expenses = 0;

      entriesSnapshot.forEach(doc => {
        const entry = doc.data();
        const account = accountsMap.get(entry.accountId);
        if (account) {
          if (account.type === "Revenue") {
            revenue += (entry.credit - entry.debit);
          } else if (account.type === "Expense") {
            expenses += (entry.debit - entry.credit);
          }
        }
      });

      res.json({ revenue, expenses, netIncome: revenue - expenses });
    } catch (error) {
      console.error("Error generating P&L:", error);
      res.status(500).json({ error: "Failed to generate P&L." });
    }
  });

  // 3. Reporting: Balance Sheet
  app.get("/api/reports/balance-sheet", async (req, res) => {
    const { businessId, date } = req.query;

    try {
      const accountsSnapshot = await db.collection("accounts")
        .where("businessId", "==", businessId)
        .get();
      
      const accountsMap = new Map();
      accountsSnapshot.forEach(doc => accountsMap.set(doc.id, doc.data()));

      const entriesSnapshot = await db.collection("entries")
        .where("businessId", "==", businessId)
        .where("date", "<=", admin.firestore.Timestamp.fromDate(new Date(date as string)))
        .get();

      const balances: any = { Assets: 0, Liabilities: 0, Equity: 0 };

      entriesSnapshot.forEach(doc => {
        const entry = doc.data();
        const account = accountsMap.get(entry.accountId);
        if (account && balances[account.type] !== undefined) {
          if (account.type === "Asset") {
            balances.Assets += (entry.debit - entry.credit);
          } else if (account.type === "Liability") {
            balances.Liabilities += (entry.credit - entry.debit);
          } else if (account.type === "Equity") {
            balances.Equity += (entry.credit - entry.debit);
          }
        }
      });

      res.json(balances);
    } catch (error) {
      console.error("Error generating Balance Sheet:", error);
      res.status(500).json({ error: "Failed to generate Balance Sheet." });
    }
  });

  // 4. Payroll: Run Payroll
  app.post("/api/payroll/run", async (req, res) => {
    const { businessId, periodStart, periodEnd, cashAccountId, expenseAccountId, liabilityAccountId } = req.body;

    try {
      const employeesSnapshot = await db.collection("employees")
        .where("businessId", "==", businessId)
        .where("status", "==", "Active")
        .get();

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      const payrollItems: any[] = [];

      employeesSnapshot.forEach(doc => {
        const employee = doc.data();
        const gross = employee.payType === "Salary" ? employee.payRate / 12 : employee.payRate * 160; // Mock 160 hours
        const deductions = gross * 0.2; // Mock 20% deductions
        const net = gross - deductions;

        totalGross += gross;
        totalDeductions += deductions;
        totalNet += net;

        payrollItems.push({ employeeId: doc.id, gross, deductions, net });
      });

      const batch = db.batch();
      const runRef = db.collection("payroll_runs").doc();
      batch.set(runRef, {
        businessId,
        date: admin.firestore.Timestamp.now(),
        periodStart: admin.firestore.Timestamp.fromDate(new Date(periodStart)),
        periodEnd: admin.firestore.Timestamp.fromDate(new Date(periodEnd)),
        totalGross,
        totalDeductions,
        totalNet,
        status: "Processed",
        items: payrollItems
      });

      // Create Ledger Entries for Payroll
      const transactionRef = db.collection("transactions").doc();
      batch.set(transactionRef, {
        businessId,
        date: admin.firestore.Timestamp.now(),
        description: `Payroll Run: ${periodStart} - ${periodEnd}`,
        amount: totalGross,
        type: "Payroll",
        source: "Manual",
      });

      // Debit Payroll Expense (Gross)
      batch.set(db.collection("entries").doc(), {
        businessId,
        transactionId: transactionRef.id,
        accountId: expenseAccountId,
        debit: totalGross,
        credit: 0,
        date: admin.firestore.Timestamp.now(),
      });

      // Credit Cash (Net)
      batch.set(db.collection("entries").doc(), {
        businessId,
        transactionId: transactionRef.id,
        accountId: cashAccountId,
        debit: 0,
        credit: totalNet,
        date: admin.firestore.Timestamp.now(),
      });

      // Credit Tax Payable (Deductions)
      batch.set(db.collection("entries").doc(), {
        businessId,
        transactionId: transactionRef.id,
        accountId: liabilityAccountId,
        debit: 0,
        credit: totalDeductions,
        date: admin.firestore.Timestamp.now(),
      });

      await batch.commit();
      res.json({ id: runRef.id, totalNet });
    } catch (error) {
      console.error("Error running payroll:", error);
      res.status(500).json({ error: "Failed to run payroll." });
    }
  });

  // 5. Seed Data
  app.post("/api/seed", async (req, res) => {
    const { businessId } = req.body;
    try {
      const batch = db.batch();
      
      // 1. Accounts
      const accounts = [
        { name: "Cash", type: "Asset", subtype: "Bank" },
        { name: "Sales", type: "Revenue", subtype: "Operating Revenue" },
        { name: "Payroll Expense", type: "Expense", subtype: "Operating Expense" },
        { name: "Rent Expense", type: "Expense", subtype: "Operating Expense" },
        { name: "Payroll Taxes Payable", type: "Liability", subtype: "Current Liability" },
        { name: "Owner's Equity", type: "Equity", subtype: "Equity" },
      ];

      const accountRefs: any = {};
      for (const acc of accounts) {
        const ref = db.collection("accounts").doc();
        batch.set(ref, { ...acc, businessId });
        accountRefs[acc.name] = ref.id;
      }

      // 2. Employees
      const employees = [
        { name: "Alice Johnson", payType: "Salary", payRate: 75000, status: "Active", businessId },
        { name: "Bob Smith", payType: "Hourly", payRate: 45, status: "Active", businessId },
      ];
      for (const emp of employees) {
        batch.set(db.collection("employees").doc(), emp);
      }

      // 3. Transactions & Entries
      const txs = [
        { desc: "Initial Investment", amount: 50000, type: "Income", dr: "Cash", cr: "Owner's Equity" },
        { desc: "Stripe Sale", amount: 1250, type: "Income", dr: "Cash", cr: "Sales" },
        { desc: "Office Rent", amount: 2000, type: "Expense", dr: "Rent Expense", cr: "Cash" },
      ];

      for (const tx of txs) {
        const txRef = db.collection("transactions").doc();
        batch.set(txRef, {
          businessId,
          date: admin.firestore.Timestamp.now(),
          description: tx.desc,
          amount: tx.amount,
          type: tx.type,
          source: "Manual",
        });

        batch.set(db.collection("entries").doc(), {
          businessId,
          transactionId: txRef.id,
          accountId: accountRefs[tx.dr],
          debit: tx.amount,
          credit: 0,
          date: admin.firestore.Timestamp.now(),
        });

        batch.set(db.collection("entries").doc(), {
          businessId,
          transactionId: txRef.id,
          accountId: accountRefs[tx.cr],
          debit: 0,
          credit: tx.amount,
          date: admin.firestore.Timestamp.now(),
        });
      }

      await batch.commit();
      res.json({ success: true });
    } catch (error) {
      console.error("Error seeding data:", error);
      res.status(500).json({ error: "Failed to seed data." });
    }
  });

  // --- VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
