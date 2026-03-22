export interface Business {
  id: string;
  ownerId: string;
  name: string;
  currency: string;
  createdAt?: any;
  updatedAt?: any;
}

export type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export interface Account {
  id: string;
  businessId: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: string;
  isSystem: boolean;
  isActive: boolean;
}

export type TransactionType = "Income" | "Expense" | "Transfer" | "Adjustment";

export interface Transaction {
  id: string;
  businessId: string;
  date: any;
  description: string;
  type: TransactionType;
  source: string;
  amount: number;
  status: string;
  category?: string;
}

export interface Employee {
  id: string;
  businessId: string;
  name: string;
  payType: "Salary" | "Hourly";
  payRate: number;
  status: "Active" | "Inactive";
}

export interface PayrollRun {
  id: string;
  businessId: string;
  periodStart: any;
  periodEnd: any;
  status: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  createdAt: any;
}

export interface BankTransaction {
  id: string;
  businessId: string;
  source: string;
  date: any;
  description: string;
  amount: number;
  direction: "inflow" | "outflow";
  status: "unmatched" | "matched";
}
