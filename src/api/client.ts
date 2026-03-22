import { Business, Account, Transaction, Employee, PayrollRun, BankTransaction } from "../types";

const API_BASE = "/api";

export const api = {
  // Businesses
  getBusinesses: (ownerId: string): Promise<Business[]> => 
    fetch(`${API_BASE}/businesses?ownerId=${ownerId}`).then(r => r.json()),
  createBusiness: (data: Partial<Business>): Promise<Business> =>
    fetch(`${API_BASE}/businesses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  initializeBusiness: (businessId: string): Promise<Account[]> =>
    fetch(`${API_BASE}/businesses/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId })
    }).then(r => r.json()),

  // Accounts
  getAccounts: (businessId: string): Promise<Account[]> =>
    fetch(`${API_BASE}/accounts?businessId=${businessId}`).then(r => r.json()),

  // Transactions
  getTransactions: (businessId: string): Promise<Transaction[]> =>
    fetch(`${API_BASE}/transactions?businessId=${businessId}`).then(r => r.json()),
  createTransaction: (data: any): Promise<Transaction> =>
    fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // Employees
  getEmployees: (businessId: string): Promise<Employee[]> =>
    fetch(`${API_BASE}/employees?businessId=${businessId}`).then(r => r.json()),
  createEmployee: (data: any): Promise<Employee> =>
    fetch(`${API_BASE}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // Payroll
  getPayrollRuns: (businessId: string): Promise<PayrollRun[]> =>
    fetch(`${API_BASE}/payroll/runs?businessId=${businessId}`).then(r => r.json()),
  runPayroll: (data: any): Promise<PayrollRun> =>
    fetch(`${API_BASE}/payroll/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // Reports
  getPnL: (businessId: string, startDate: string, endDate: string): Promise<any> =>
    fetch(`${API_BASE}/reports/pnl?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),
  getBalanceSheet: (businessId: string, date: string): Promise<any> =>
    fetch(`${API_BASE}/reports/balance-sheet?businessId=${businessId}&date=${date}`).then(r => r.json()),
  getCashFlow: (businessId: string, startDate: string, endDate: string): Promise<any> =>
    fetch(`${API_BASE}/reports/cash-flow?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),

  // Integrations
  syncStripe: (data: any): Promise<any> =>
    fetch(`${API_BASE}/integrations/stripe/mock-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
  syncBank: (businessId: string): Promise<any> =>
    fetch(`${API_BASE}/integrations/bank/mock-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId })
    }).then(r => r.json()),
  getBankTransactions: (businessId: string): Promise<BankTransaction[]> =>
    fetch(`${API_BASE}/integrations/bank-transactions?businessId=${businessId}`).then(r => r.json()),
  autoMatch: (businessId: string): Promise<any> =>
    fetch(`${API_BASE}/integrations/reconciliation/auto-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId })
    }).then(r => r.json()),
};
