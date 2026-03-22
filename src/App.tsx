import React, { Component, useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, addDoc, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import { 
  LayoutDashboard, 
  Receipt, 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet,
  CreditCard,
  Building2,
  Menu,
  X,
  ChevronRight,
  Loader2
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from "recharts";

// --- UTILS ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState;
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.operationType) {
          errorMessage = `Firestore Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path}`;
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto">
              <X className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Application Error</h2>
            <p className="text-slate-500 text-sm">{errorMessage}</p>
            <Button onClick={() => window.location.reload()} className="w-full">Reload Application</Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- CONTEXT ---
interface Business {
  id: string;
  name: string;
  ownerId: string;
  currency: string;
}

interface AppContextType {
  user: User | null;
  business: Business | null;
  loading: boolean;
  setBusiness: (b: Business | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

// --- COMPONENTS ---

const Card = ({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
    {title && (
      <div className="px-6 py-4 border-bottom border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const Button = ({ 
  children, 
  className, 
  variant = "primary", 
  size = "md",
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "ghost"; size?: "sm" | "md" | "lg" }) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-slate-800 text-white hover:bg-slate-900 shadow-sm",
    outline: "border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };
  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className={cn(
      "w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white",
      className
    )}
    {...props}
  />
);

const Select = ({ children, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    className={cn(
      "w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white appearance-none",
      className
    )}
    {...props}
  >
    {children}
  </select>
);

const Badge = ({ children, variant = "neutral" }: { children: React.ReactNode; variant?: "success" | "warning" | "error" | "neutral" | "indigo" }) => {
  const variants = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    error: "bg-rose-50 text-rose-700 border-rose-100",
    neutral: "bg-slate-50 text-slate-700 border-slate-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", variants[variant])}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const AddEmployeeModal = ({ isOpen, onClose, businessId }: { isOpen: boolean; onClose: () => void; businessId: string }) => {
  const [name, setName] = useState("");
  const [payType, setPayType] = useState("Salary");
  const [payRate, setPayRate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "employees"), {
        businessId,
        name,
        payType,
        payRate: parseFloat(payRate),
        status: "Active"
      });
      onClose();
      setName("");
      setPayRate("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "employees");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Employee">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pay Type</label>
            <Select value={payType} onChange={(e) => setPayType(e.target.value)}>
              <option value="Salary">Salary</option>
              <option value="Hourly">Hourly</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pay Rate ({payType === "Salary" ? "Annual" : "Hourly"})</label>
            <Input type="number" value={payRate} onChange={(e) => setPayRate(e.target.value)} placeholder="0.00" required />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Add Employee
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const AddTransactionModal = ({ isOpen, onClose, businessId }: { isOpen: boolean; onClose: () => void; businessId: string }) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Income");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [drAccount, setDrAccount] = useState("");
  const [crAccount, setCrAccount] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, "accounts"), where("businessId", "==", businessId));
    getDocs(q).then(snap => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(err => handleFirestoreError(err, OperationType.GET, "accounts"));
  }, [isOpen, businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          date,
          description,
          amount: parseFloat(amount),
          type,
          source: "Manual",
          entries: [
            { accountId: drAccount, debit: parseFloat(amount), credit: 0 },
            { accountId: crAccount, debit: 0, credit: parseFloat(amount) }
          ]
        })
      });
      if (res.ok) {
        onClose();
        setDescription("");
        setAmount("");
      } else {
        alert("Failed to save transaction. Check if debits and credits balance.");
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Monthly Rent" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
            <option value="Transfer">Transfer</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Debit Account (+)</label>
            <Select value={drAccount} onChange={(e) => setDrAccount(e.target.value)} required>
              <option value="">Select Account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Credit Account (-)</label>
            <Select value={crAccount} onChange={(e) => setCrAccount(e.target.value)} required>
              <option value="">Select Account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Save Transaction
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// --- PAGES ---

const Dashboard = () => {
  const { business } = useAppContext();
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, cash: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  useEffect(() => {
    if (!business) return;

    const fetchStats = async () => {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      
      const res = await fetch(`/api/reports/pnl?businessId=${business.id}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      const data = await res.json();
      
      const bsRes = await fetch(`/api/reports/balance-sheet?businessId=${business.id}&date=${end.toISOString()}`);
      const bsData = await bsRes.json();

      setStats({
        revenue: data.revenue || 0,
        expenses: data.expenses || 0,
        cash: bsData.Assets || 0
      });

      // Mock chart data
      setChartData([
        { name: "Jan", revenue: 4000, expenses: 2400 },
        { name: "Feb", revenue: 3000, expenses: 1398 },
        { name: "Mar", revenue: 2000, expenses: 9800 },
        { name: "Apr", revenue: 2780, expenses: 3908 },
        { name: "May", revenue: 1890, expenses: 4800 },
        { name: "Jun", revenue: 2390, expenses: 3800 },
      ]);
    };

    fetchStats();
  }, [business]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back to {business?.name}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Search className="w-4 h-4 mr-2" /> Search</Button>
          <Button onClick={() => setIsTxModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Transaction</Button>
        </div>
      </div>

      <AddTransactionModal 
        isOpen={isTxModalOpen} 
        onClose={() => setIsTxModalOpen(false)} 
        businessId={business?.id || ""} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Monthly Revenue</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${stats.revenue.toLocaleString()}</div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">+12.5% from last month</div>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Monthly Expenses</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${stats.expenses.toLocaleString()}</div>
          <div className="mt-2 text-xs text-rose-600 font-medium">+4.2% from last month</div>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Cash Balance</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${stats.cash.toLocaleString()}</div>
          <div className="mt-2 text-xs text-indigo-600 font-medium">Updated just now</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Revenue vs Expenses">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Recent Transactions">
          <div className="space-y-4 mt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Stripe Payout</div>
                    <div className="text-xs text-slate-500">March 1{i}, 2026 • Sales</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600">+$1,250.00</div>
                  <Badge variant="success">Cleared</Badge>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="w-full mt-4 text-indigo-600">View all transactions <ChevronRight className="w-4 h-4 ml-1" /></Button>
        </Card>
      </div>
    </div>
  );
};

const Transactions = () => {
  const { business } = useAppContext();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  useEffect(() => {
    if (!business) return;
    const q = query(collection(db, "transactions"), where("businessId", "==", business.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "transactions");
    });
    return unsubscribe;
  }, [business]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500">Manage your income and expenses</p>
        </div>
        <Button onClick={() => setIsTxModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Transaction</Button>
      </div>

      <AddTransactionModal 
        isOpen={isTxModalOpen} 
        onClose={() => setIsTxModalOpen(false)} 
        businessId={business?.id || ""} 
      />

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{tx.date?.toDate ? format(tx.date.toDate(), "MMM dd, yyyy") : tx.date}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{tx.description}</td>
                    <td className="px-6 py-4"><Badge variant={tx.type === "Income" ? "success" : "error"}>{tx.type}</Badge></td>
                    <td className="px-6 py-4 text-sm text-slate-500">{tx.source}</td>
                    <td className={cn("px-6 py-4 text-sm font-bold text-right", tx.type === "Income" ? "text-emerald-600" : "text-rose-600")}>
                      {tx.type === "Income" ? "+" : "-"}${tx.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4"><Badge variant="success">Cleared</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const Reports = () => {
  const { business } = useAppContext();
  const [pnl, setPnl] = useState<any>(null);
  const [bs, setBs] = useState<any>(null);

  useEffect(() => {
    if (!business) return;
    const fetchReports = async () => {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      
      const pnlRes = await fetch(`/api/reports/pnl?businessId=${business.id}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      setPnl(await pnlRes.json());
      
      const bsRes = await fetch(`/api/reports/balance-sheet?businessId=${business.id}&date=${end.toISOString()}`);
      setBs(await bsRes.json());
    };
    fetchReports();
  }, [business]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-500">Real-time insights into your business health</p>
        </div>
        <Button variant="outline"><BarChart3 className="w-4 h-4 mr-2" /> Export PDF</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Profit & Loss (Current Month)">
          <div className="space-y-6 mt-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Total Revenue</span>
              <span className="text-emerald-600 font-bold text-lg">${pnl?.revenue?.toLocaleString() || "0"}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Total Expenses</span>
              <span className="text-rose-600 font-bold text-lg">(${pnl?.expenses?.toLocaleString() || "0"})</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-900 font-bold text-xl">Net Income</span>
              <span className={cn("font-black text-2xl", (pnl?.netIncome || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                ${pnl?.netIncome?.toLocaleString() || "0"}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Balance Sheet (As of Today)">
          <div className="space-y-6 mt-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Assets</span>
              <span className="text-indigo-600 font-bold text-lg">${bs?.Assets?.toLocaleString() || "0"}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Liabilities</span>
              <span className="text-rose-600 font-bold text-lg">${bs?.Liabilities?.toLocaleString() || "0"}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Equity</span>
              <span className="text-amber-600 font-bold text-lg">${bs?.Equity?.toLocaleString() || "0"}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-900 font-bold text-xl">Total L + E</span>
              <span className="text-slate-900 font-bold text-xl">
                ${((bs?.Liabilities || 0) + (bs?.Equity || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const Payroll = () => {
  const { business } = useAppContext();
  const [employees, setEmployees] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);

  useEffect(() => {
    if (!business) return;
    const qEmp = query(collection(db, "employees"), where("businessId", "==", business.id));
    const unsubEmp = onSnapshot(qEmp, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "employees");
    });

    const qRuns = query(collection(db, "payroll_runs"), where("businessId", "==", business.id));
    const unsubRuns = onSnapshot(qRuns, (snapshot) => {
      setRuns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "payroll_runs");
    });

    return () => { unsubEmp(); unsubRuns(); };
  }, [business]);

  const runPayroll = async () => {
    if (!business) return;
    
    // In a real app, we'd have a modal to select accounts
    // For MVP, we'll assume some default IDs or fetch them
    const accountsSnap = await getDocs(query(collection(db, "accounts"), where("businessId", "==", business.id)))
      .catch(err => handleFirestoreError(err, OperationType.GET, "accounts"));
    if (!accountsSnap) return;
    const accounts = accountsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    
    const cashAcc = accounts.find(a => a.name === "Cash")?.id;
    const expAcc = accounts.find(a => a.name === "Payroll Expense")?.id;
    const liabAcc = accounts.find(a => a.name === "Payroll Taxes Payable")?.id;

    if (!cashAcc || !expAcc || !liabAcc) {
      alert("Please ensure you have 'Cash', 'Payroll Expense', and 'Payroll Taxes Payable' accounts set up in Settings.");
      return;
    }

    const res = await fetch("/api/payroll/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: business.id,
        periodStart: startOfMonth(new Date()).toISOString(),
        periodEnd: endOfMonth(new Date()).toISOString(),
        cashAccountId: cashAcc,
        expenseAccountId: expAcc,
        liabilityAccountId: liabAcc
      })
    });

    if (res.ok) {
      alert("Payroll processed successfully!");
    } else {
      alert("Failed to process payroll.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payroll</h1>
          <p className="text-slate-500">Manage employees and process pay runs</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsEmpModalOpen(true)} variant="outline"><Users className="w-4 h-4 mr-2" /> Add Employee</Button>
          <Button onClick={runPayroll}><CreditCard className="w-4 h-4 mr-2" /> Run Payroll</Button>
        </div>
      </div>

      <AddEmployeeModal 
        isOpen={isEmpModalOpen} 
        onClose={() => setIsEmpModalOpen(false)} 
        businessId={business?.id || ""} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Active Employees">
            <div className="divide-y divide-slate-100">
              {employees.map(emp => (
                <div key={emp.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{emp.name}</div>
                      <div className="text-xs text-slate-500">{emp.payType} • ${emp.payRate.toLocaleString()}/{emp.payType === "Salary" ? "yr" : "hr"}</div>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Payroll History">
            <div className="divide-y divide-slate-100">
              {runs.map(run => (
                <div key={run.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {run.periodStart?.toDate ? format(run.periodStart.toDate(), "MMM yyyy") : "Payroll Run"}
                    </div>
                    <div className="text-xs text-slate-500">Processed on {run.date?.toDate ? format(run.date.toDate(), "MMM dd") : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">${run.totalNet?.toLocaleString()}</div>
                    <Badge variant="indigo">Processed</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-indigo-600 text-white border-none">
            <h3 className="text-lg font-bold mb-4">Payroll Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-indigo-100">
                <span>Total Employees</span>
                <span className="font-bold text-white">{employees.length}</span>
              </div>
              <div className="flex justify-between text-indigo-100">
                <span>Next Pay Date</span>
                <span className="font-bold text-white">Mar 31, 2026</span>
              </div>
              <div className="pt-4 border-t border-indigo-500/50 flex justify-between">
                <span className="font-medium">Estimated Total</span>
                <span className="font-bold text-xl">$12,450.00</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { business } = useAppContext();
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!business) return;
    const q = query(collection(db, "accounts"), where("businessId", "==", business.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [business]);

  const createDefaultAccounts = async () => {
    if (!business) return;
    const res = await fetch("/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: business.id })
    });
    if (res.ok) {
      alert("Sample data seeded successfully!");
    } else {
      alert("Failed to seed data.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">Configure your business and chart of accounts</p>
        </div>
        <Button onClick={createDefaultAccounts} variant="outline">Initialize Accounts</Button>
      </div>

      <Card title="Chart of Accounts">
        <div className="divide-y divide-slate-100 mt-4">
          {accounts.map(acc => (
            <div key={acc.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">{acc.name}</div>
                <div className="text-xs text-slate-500">{acc.subtype}</div>
              </div>
              <Badge variant="indigo">{acc.type}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// --- LAYOUT ---

const Sidebar = () => {
  const location = useLocation();
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Receipt, label: "Transactions", path: "/transactions" },
    { icon: BarChart3, label: "Reports", path: "/reports" },
    { icon: Users, label: "Payroll", path: "/payroll" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
          <Building2 className="w-5 h-5" />
        </div>
        <span className="font-bold text-xl text-white tracking-tight">LeanBooks</span>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-slate-800 hover:text-white transition-all text-slate-400 group"
        >
          <LogOut className="w-5 h-5 group-hover:text-rose-400" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

const Header = () => {
  const { user, business } = useAppContext();
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Badge variant="indigo">{business?.name || "No Business Selected"}</Badge>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-slate-800">{user?.displayName}</div>
          <div className="text-xs text-slate-500">{user?.email}</div>
        </div>
        <img src={user?.photoURL || ""} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-slate-100" referrerPolicy="no-referrer" />
      </div>
    </header>
  );
};

// --- AUTH ---

const Login = () => {
  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-600/20">
          <Building2 className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">LeanBooks</h1>
          <p className="text-slate-500 mt-2">The lean accounting system for small businesses.</p>
        </div>
        <Button onClick={handleLogin} className="w-full py-4 text-lg" size="lg">
          Sign in with Google
        </Button>
        <p className="text-xs text-slate-400">By signing in, you agree to our Terms of Service.</p>
      </Card>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // Fetch or create business
          const q = query(collection(db, "businesses"), where("ownerId", "==", u.uid));
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            const newBiz = { name: "My New Business", ownerId: u.uid, currency: "USD" };
            const docRef = await addDoc(collection(db, "businesses"), newBiz);
            setBusiness({ id: docRef.id, ...newBiz });
          } else {
            setBusiness({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() as any });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, "businesses");
        }
      } else {
        setBusiness(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <ErrorBoundary>
      <AppContext.Provider value={{ user, business, loading, setBusiness }}>
        <Router>
          <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Header />
              <main className="p-8 max-w-7xl mx-auto w-full">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/payroll" element={<Payroll />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </main>
            </div>
          </div>
        </Router>
      </AppContext.Provider>
    </ErrorBoundary>
  );
}
