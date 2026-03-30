import { z } from "zod";

export const businessIdSchema = z.string().min(1, "Business ID is required");

export const transactionSchema = z.object({
  body: z.object({
    businessId: businessIdSchema,
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
    description: z.string().min(1, "Description is required").max(255),
    amount: z.number().positive("Amount must be positive"),
    type: z.enum(["Income", "Expense", "Transfer", "Adjustment"]),
    source: z.string().optional(),
    entries: z.array(
      z.object({
        accountId: z.string().min(1, "Account ID is required"),
        debit: z.number().min(0),
        credit: z.number().min(0),
      })
    ).min(2, "At least two entries are required"),
  }),
});

export const employeeSchema = z.object({
  body: z.object({
    businessId: businessIdSchema,
    name: z.string().min(1).max(100),
    payType: z.enum(["Salary", "Hourly"]),
    payRate: z.number().positive(),
    defaultHours: z.number().min(0).optional(),
    deductionRate: z.number().min(0).max(1).optional(),
  }),
});

export const payrollRunSchema = z.object({
  body: z.object({
    businessId: businessIdSchema,
    periodStart: z.string().refine((val) => !isNaN(Date.parse(val))),
    periodEnd: z.string().refine((val) => !isNaN(Date.parse(val))),
    cashAccountId: z.string().min(1),
    expenseAccountId: z.string().min(1),
    liabilityAccountId: z.string().min(1),
    employeeInputs: z.array(
      z.object({
        employeeId: z.string().min(1),
        hoursWorked: z.number().min(0).optional(),
        bonus: z.number().min(0).optional(),
      })
    ).optional(),
  }),
});

export const payrollPreviewSchema = z.object({
  body: z.object({
    businessId: businessIdSchema,
    employeeInputs: z.array(
      z.object({
        employeeId: z.string().min(1),
        hoursWorked: z.number().min(0).optional(),
        bonus: z.number().min(0).optional(),
      })
    ).optional(),
  }),
});

export const reportQuerySchema = z.object({
  query: z.object({
    businessId: businessIdSchema,
    startDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
    date: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
  }),
});

export const businessSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    currency: z.string().length(3).optional(),
  }),
});

export const initializeBusinessSchema = z.object({
  body: z.object({
    businessId: businessIdSchema,
  }),
});

export const stripeSyncSchema = z.object({
  body: z.object({
    businessId: businessIdSchema,
    cashAccountId: z.string().min(1),
    feeAccountId: z.string().min(1),
    revenueAccountId: z.string().min(1),
  }),
});

export const bankSyncSchema = z.object({
  body: z.object({
    businessId: businessIdSchema,
  }),
});

export const autoMatchSchema = z.object({
  body: z.object({
    businessId: businessIdSchema,
  }),
});
