import express from "express";
import transactionsRouter from "./routes/transactions";
import reportsRouter from "./routes/reports";
import payrollRouter from "./routes/payroll";
import employeesRouter from "./routes/employees";
import accountsRouter from "./routes/accounts";
import integrationsRouter from "./routes/integrations";
import businessesRouter from "./routes/businesses";

const app = express();

app.use(express.json());

// API Routes
app.use("/api/transactions", transactionsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/businesses", businessesRouter);

export default app;
