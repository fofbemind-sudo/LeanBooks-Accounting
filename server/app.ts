import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import xss from "xss-clean";
import { authMiddleware } from "./middleware/auth";
import { businessOwnershipMiddleware } from "./middleware/business";
import { errorHandler } from "./middleware/error";
import { requestLogger } from "./middleware/logger";
import transactionsRouter from "./routes/transactions";
import reportsRouter from "./routes/reports";
import payrollRouter from "./routes/payroll";
import employeesRouter from "./routes/employees";
import accountsRouter from "./routes/accounts";
import integrationsRouter from "./routes/integrations";
import businessesRouter from "./routes/businesses";

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" })); // Limit body size
app.use(xss());

// Rate Limiting
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: "Too many business creation attempts, please try again after a minute",
});

const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: "Too many transaction requests, please try again after a minute",
});

const reportLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: "Too many report requests, please try again after a minute",
});

app.use("/api/", defaultLimiter);

// Logging
app.use(requestLogger);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// API Routes
app.use("/api/businesses", authMiddleware, authLimiter, businessesRouter);

// All other API routes require business ownership
app.use("/api/transactions", authMiddleware, businessOwnershipMiddleware, transactionLimiter, transactionsRouter);
app.use("/api/reports", authMiddleware, businessOwnershipMiddleware, reportLimiter, reportsRouter);
app.use("/api/payroll", authMiddleware, businessOwnershipMiddleware, payrollRouter);
app.use("/api/employees", authMiddleware, businessOwnershipMiddleware, employeesRouter);
app.use("/api/accounts", authMiddleware, businessOwnershipMiddleware, accountsRouter);
app.use("/api/integrations", authMiddleware, businessOwnershipMiddleware, integrationsRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
