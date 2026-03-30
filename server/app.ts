import express from "express";
import { authMiddleware } from "./middleware/auth";
import { businessOwnershipMiddleware } from "./middleware/business";
import transactionsRouter from "./routes/transactions";
import reportsRouter from "./routes/reports";
import payrollRouter from "./routes/payroll";
import employeesRouter from "./routes/employees";
import accountsRouter from "./routes/accounts";
import integrationsRouter from "./routes/integrations";
import businessesRouter from "./routes/businesses";
import contactsRouter from "./routes/contacts";
import invoicesRouter from "./routes/invoices";
import billsRouter from "./routes/bills";
import recurringInvoicesRouter from "./routes/recurringInvoices";

const app = express();

app.use(express.json());

// API Routes
app.use("/api/businesses", authMiddleware, businessesRouter);

// All other API routes require business ownership
app.use("/api/transactions", authMiddleware, businessOwnershipMiddleware, transactionsRouter);
app.use("/api/reports", authMiddleware, businessOwnershipMiddleware, reportsRouter);
app.use("/api/payroll", authMiddleware, businessOwnershipMiddleware, payrollRouter);
app.use("/api/employees", authMiddleware, businessOwnershipMiddleware, employeesRouter);
app.use("/api/accounts", authMiddleware, businessOwnershipMiddleware, accountsRouter);
app.use("/api/integrations", authMiddleware, businessOwnershipMiddleware, integrationsRouter);
app.use("/api/contacts", authMiddleware, businessOwnershipMiddleware, contactsRouter);
app.use("/api/invoices", authMiddleware, businessOwnershipMiddleware, invoicesRouter);
app.use("/api/bills", authMiddleware, businessOwnershipMiddleware, billsRouter);
app.use("/api/recurring-invoices", authMiddleware, businessOwnershipMiddleware, recurringInvoicesRouter);

export default app;
