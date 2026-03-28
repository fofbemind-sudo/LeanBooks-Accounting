import { Business, Account, Transaction, Employee, PayrollRun, BankTransaction, Contact, Invoice, Bill } from "../types";
import { auth } from "../firebase";

const API_BASE = "/api";

const getHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export const api = {
  // Businesses
  getBusinesses: async (): Promise<Business[]> => 
    fetch(`${API_BASE}/businesses`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  createBusiness: async (data: Partial<Business>): Promise<Business> =>
    fetch(`${API_BASE}/businesses`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  initializeBusiness: async (businessId: string): Promise<Account[]> =>
    fetch(`${API_BASE}/businesses/initialize`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ businessId })
    }).then(r => r.json()),

  // Accounts
  getAccounts: async (businessId: string): Promise<Account[]> =>
    fetch(`${API_BASE}/accounts?businessId=${businessId}`, {
      headers: await getHeaders()
    }).then(r => r.json()),

  // Transactions
  getTransactions: async (businessId: string): Promise<Transaction[]> =>
    fetch(`${API_BASE}/transactions?businessId=${businessId}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  createTransaction: async (data: any): Promise<Transaction> =>
    fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // Employees
  getEmployees: async (businessId: string): Promise<Employee[]> =>
    fetch(`${API_BASE}/employees?businessId=${businessId}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  createEmployee: async (data: any): Promise<Employee> =>
    fetch(`${API_BASE}/employees`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // Payroll
  getPayrollRuns: async (businessId: string): Promise<PayrollRun[]> =>
    fetch(`${API_BASE}/payroll/runs?businessId=${businessId}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  getPayrollPreview: async (businessId: string, employeeInputs: any[]): Promise<any> =>
    fetch(`${API_BASE}/payroll/preview`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ businessId, employeeInputs })
    }).then(r => r.json()),
  runPayroll: async (data: any): Promise<PayrollRun> =>
    fetch(`${API_BASE}/payroll/run`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // Reports
  getPnL: async (businessId: string, startDate: string, endDate: string): Promise<any> =>
    fetch(`${API_BASE}/reports/pnl?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  getBalanceSheet: async (businessId: string, date: string): Promise<any> =>
    fetch(`${API_BASE}/reports/balance-sheet?businessId=${businessId}&date=${date}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  getCashFlow: async (businessId: string, startDate: string, endDate: string): Promise<any> =>
    fetch(`${API_BASE}/reports/cash-flow?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  getCashBalance: async (businessId: string, date: string): Promise<any> =>
    fetch(`${API_BASE}/reports/cash-balance?businessId=${businessId}&date=${date}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  getTrialBalance: async (businessId: string, date: string): Promise<any> =>
    fetch(`${API_BASE}/reports/trial-balance?businessId=${businessId}&date=${date}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  getGeneralLedger: async (businessId: string, startDate: string, endDate: string, accountId?: string): Promise<any> =>
    fetch(`${API_BASE}/reports/general-ledger?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}${accountId ? `&accountId=${accountId}` : ""}`, {
      headers: await getHeaders()
    }).then(r => r.json()),

  // Integrations
  syncStripe: async (data: any): Promise<any> =>
    fetch(`${API_BASE}/integrations/stripe/mock-sync`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  syncBank: async (businessId: string): Promise<any> =>
    fetch(`${API_BASE}/integrations/bank/mock-sync`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ businessId })
    }).then(r => r.json()),
  getBankTransactions: async (businessId: string): Promise<BankTransaction[]> =>
    fetch(`${API_BASE}/integrations/bank-transactions?businessId=${businessId}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  autoMatch: async (businessId: string): Promise<any> =>
    fetch(`${API_BASE}/integrations/reconciliation/auto-match`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ businessId })
    }).then(r => r.json()),

  // Contacts
  getContacts: async (businessId: string, type?: string): Promise<Contact[]> =>
    fetch(`${API_BASE}/contacts?businessId=${businessId}${type ? `&type=${type}` : ""}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  createContact: async (data: any): Promise<Contact> =>
    fetch(`${API_BASE}/contacts`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  updateContact: async (id: string, data: any): Promise<Contact> =>
    fetch(`${API_BASE}/contacts/${id}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),

  // Invoices
  getInvoices: async (businessId: string, status?: string): Promise<Invoice[]> =>
    fetch(`${API_BASE}/invoices?businessId=${businessId}${status ? `&status=${status}` : ""}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  createInvoice: async (data: any): Promise<Invoice> =>
    fetch(`${API_BASE}/invoices`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  sendInvoice: async (data: any): Promise<Invoice> =>
    fetch(`${API_BASE}/invoices/send`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  recordInvoicePayment: async (data: any): Promise<Invoice> =>
    fetch(`${API_BASE}/invoices/payment`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  getInvoiceAging: async (businessId: string): Promise<any> =>
    fetch(`${API_BASE}/invoices/aging?businessId=${businessId}`, {
      headers: await getHeaders()
    }).then(r => r.json()),

  // Bills
  getBills: async (businessId: string, status?: string): Promise<Bill[]> =>
    fetch(`${API_BASE}/bills?businessId=${businessId}${status ? `&status=${status}` : ""}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  createBill: async (data: any): Promise<Bill> =>
    fetch(`${API_BASE}/bills`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  approveBill: async (data: any): Promise<Bill> =>
    fetch(`${API_BASE}/bills/approve`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  recordBillPayment: async (data: any): Promise<Bill> =>
    fetch(`${API_BASE}/bills/payment`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  getBillAging: async (businessId: string): Promise<any> =>
    fetch(`${API_BASE}/bills/aging?businessId=${businessId}`, {
      headers: await getHeaders()
    }).then(r => r.json()),

  // Recurring Invoices
  getRecurringInvoices: async (businessId: string): Promise<any[]> =>
    fetch(`${API_BASE}/recurring-invoices?businessId=${businessId}`, {
      headers: await getHeaders()
    }).then(r => r.json()),
  createRecurringInvoice: async (data: any): Promise<any> =>
    fetch(`${API_BASE}/recurring-invoices`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  toggleRecurringInvoice: async (data: any): Promise<any> =>
    fetch(`${API_BASE}/recurring-invoices/toggle`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  processRecurringInvoices: async (businessId: string): Promise<any> =>
    fetch(`${API_BASE}/recurring-invoices/process`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ businessId })
    }).then(r => r.json()),
};
