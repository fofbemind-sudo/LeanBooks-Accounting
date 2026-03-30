import { Business, Account, Transaction, Employee, PayrollRun, BankTransaction } from "../types";
import { auth } from "../firebase";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const getHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

const request = async (url: string, options: RequestInit = {}) => {
  const headers = await getHeaders();
  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401) {
        toast.error("Session expired. Please log in again.");
        await auth.signOut();
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }
      if (response.status === 403) {
        toast.error("You don't have permission to perform this action.");
        throw new Error("Forbidden");
      }
      if (response.status === 404) {
        throw new Error("Resource not found");
      }
      if (response.status >= 500) {
        toast.error("Server error. Please try again later.");
        throw new Error("Internal Server Error");
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "An unexpected error occurred");
    }

    return response.json();
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    if (!navigator.onLine) {
      toast.error("You are offline. Please check your internet connection.");
      throw new Error("Offline");
    }
    throw error;
  }
};

export const api = {
  // Businesses
  getBusinesses: (): Promise<Business[]> => 
    request(`${API_BASE}/businesses`),
  createBusiness: (data: Partial<Business>): Promise<Business> =>
    request(`${API_BASE}/businesses`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
  initializeBusiness: (businessId: string): Promise<Account[]> =>
    request(`${API_BASE}/businesses/initialize`, {
      method: "POST",
      body: JSON.stringify({ businessId })
    }),

  // Accounts
  getAccounts: (businessId: string): Promise<Account[]> =>
    request(`${API_BASE}/accounts?businessId=${businessId}`),

  // Transactions
  getTransactions: (businessId: string): Promise<Transaction[]> =>
    request(`${API_BASE}/transactions?businessId=${businessId}`),
  createTransaction: (data: any): Promise<Transaction> =>
    request(`${API_BASE}/transactions`, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // Employees
  getEmployees: (businessId: string): Promise<Employee[]> =>
    request(`${API_BASE}/employees?businessId=${businessId}`),
  createEmployee: (data: any): Promise<Employee> =>
    request(`${API_BASE}/employees`, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // Payroll
  getPayrollRuns: (businessId: string): Promise<PayrollRun[]> =>
    request(`${API_BASE}/payroll/runs?businessId=${businessId}`),
  getPayrollPreview: (businessId: string, employeeInputs: any[]): Promise<any> =>
    request(`${API_BASE}/payroll/preview`, {
      method: "POST",
      body: JSON.stringify({ businessId, employeeInputs })
    }),
  runPayroll: (data: any): Promise<PayrollRun> =>
    request(`${API_BASE}/payroll/run`, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // Reports
  getPnL: (businessId: string, startDate: string, endDate: string): Promise<any> =>
    request(`${API_BASE}/reports/pnl?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`),
  getBalanceSheet: (businessId: string, date: string): Promise<any> =>
    request(`${API_BASE}/reports/balance-sheet?businessId=${businessId}&date=${date}`),
  getCashFlow: (businessId: string, startDate: string, endDate: string): Promise<any> =>
    request(`${API_BASE}/reports/cash-flow?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`),
  getCashBalance: (businessId: string, date: string): Promise<any> =>
    request(`${API_BASE}/reports/cash-balance?businessId=${businessId}&date=${date}`),

  // Integrations
  syncStripe: (data: any): Promise<any> =>
    request(`${API_BASE}/integrations/stripe/mock-sync`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
  syncBank: (businessId: string): Promise<any> =>
    request(`${API_BASE}/integrations/bank/mock-sync`, {
      method: "POST",
      body: JSON.stringify({ businessId })
    }),
  getBankTransactions: (businessId: string): Promise<BankTransaction[]> =>
    request(`${API_BASE}/integrations/bank-transactions?businessId=${businessId}`),
  autoMatch: (businessId: string): Promise<any> =>
    request(`${API_BASE}/integrations/reconciliation/auto-match`, {
      method: "POST",
      body: JSON.stringify({ businessId })
    }),
};
