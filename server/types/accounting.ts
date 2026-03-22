export interface Business {
  id: string;
  ownerId: string;
  name: string;
  currency: string;
  createdAt: any;
  updatedAt: any;
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
  createdAt: any;
  updatedAt: any;
}

export type TransactionType = "Income" | "Expense" | "Transfer" | "Adjustment";

export interface Transaction {
  id: string;
  businessId: string;
  date: any;
  description: string;
  type: TransactionType;
  source: "manual" | "stripe" | "bank" | "payroll" | "adjustment";
  sourceRef?: string;
  amount: number;
  status: "posted" | "draft" | "matched" | "unmatched";
  category?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Entry {
  id: string;
  businessId: string;
  transactionId: string;
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
  date: any;
  createdAt: any;
}

export interface BankTransaction {
  id: string;
  businessId: string;
  source: "plaid_mock" | "csv";
  externalId: string;
  date: any;
  description: string;
  amount: number;
  direction: "inflow" | "outflow";
  status: "unmatched" | "matched";
  matchedTransactionId?: string;
  raw?: any;
  createdAt: any;
}
