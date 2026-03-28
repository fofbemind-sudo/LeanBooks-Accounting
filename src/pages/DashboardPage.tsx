import React, { useState, useEffect } from "react";
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Receipt,
  ChevronRight,
  Loader2,
  FileText,
  FileCheck,
  UserCircle,
  BarChart3,
  Users,
  Search,
} from "lucide-react";
import { Card, Button, Badge, cn } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Link } from "react-router-dom";

export const DashboardPage = () => {
  const { business } = useAppContext();
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, cash: 0, unmatchedCount: 0 });
  const [arTotal, setArTotal] = useState(0);
  const [apTotal, setApTotal] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [recentTxs, setRecentTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;

    const fetchData = async () => {
      try {
        const start = startOfMonth(new Date()).toISOString();
        const end = endOfMonth(new Date()).toISOString();

        const [pnl, cashData, txs, bankTxs, invoices, bills, arAging, apAging] = await Promise.all([
          api.getPnL(business.id, start, end),
          api.getCashBalance(business.id, end),
          api.getTransactions(business.id),
          api.getBankTransactions(business.id),
          api.getInvoices(business.id),
          api.getBills(business.id),
          api.getInvoiceAging(business.id),
          api.getBillAging(business.id),
        ]);

        setStats({
          revenue: pnl.totals?.revenue || 0,
          expenses: pnl.totals?.expenses || 0,
          cash: cashData.totalCash || 0,
          unmatchedCount: Array.isArray(bankTxs) ? bankTxs.filter((t: any) => t.status === "unmatched").length : 0,
        });

        setArTotal(arAging?.aging?.total || 0);
        setApTotal(apAging?.aging?.total || 0);
        setRecentInvoices(Array.isArray(invoices) ? invoices.slice(0, 5) : []);
        setRecentBills(Array.isArray(bills) ? bills.slice(0, 5) : []);
        setRecentTxs(Array.isArray(txs) ? txs.slice(0, 5) : []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [business]);

  if (!business) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">No Business Found</h2>
        <p className="text-slate-500 mt-2">Please go to Settings to create or select a business.</p>
      </div>
    );
  }

  const statusVariant = (s: string) => {
    switch (s) {
      case "Paid": return "success";
      case "Sent": case "Received": return "indigo";
      case "Overdue": return "error";
      case "Draft": return "neutral";
      default: return "neutral";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back to {business.name}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/invoices"><Button><Plus className="w-4 h-4 mr-2" /> New Invoice</Button></Link>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Monthly Revenue</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600"><ArrowUpRight className="w-3.5 h-3.5" /></div>
          </div>
          <div className="text-xl font-bold text-slate-900">${stats.revenue.toLocaleString()}</div>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Monthly Expenses</span>
            <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600"><ArrowDownLeft className="w-3.5 h-3.5" /></div>
          </div>
          <div className="text-xl font-bold text-slate-900">${stats.expenses.toLocaleString()}</div>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Cash Balance</span>
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><Wallet className="w-3.5 h-3.5" /></div>
          </div>
          <div className="text-xl font-bold text-slate-900">${stats.cash.toLocaleString()}</div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Receivable (A/R)</span>
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><FileText className="w-3.5 h-3.5" /></div>
          </div>
          <div className="text-xl font-bold text-blue-600">${arTotal.toLocaleString()}</div>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Payable (A/P)</span>
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600"><FileCheck className="w-3.5 h-3.5" /></div>
          </div>
          <div className="text-xl font-bold text-amber-600">${apTotal.toLocaleString()}</div>
        </Card>

        <Card className="border-l-4 border-l-slate-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Unmatched</span>
            <div className="p-1.5 bg-slate-50 rounded-lg text-slate-600"><Receipt className="w-3.5 h-3.5" /></div>
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.unmatchedCount}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card title="Recent Invoices">
          <div className="space-y-3 mt-2">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : recentInvoices.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-sm">No invoices yet.</p>
            ) : (
              recentInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-800">{inv.invoiceNumber}</div>
                      <div className="text-xs text-slate-500">{inv.customerName}</div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-900">${inv.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <Badge variant={statusVariant(inv.status) as any}>{inv.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link to="/invoices">
            <Button variant="ghost" className="w-full mt-3 text-indigo-600">View all invoices <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </Card>

        {/* Recent Bills */}
        <Card title="Recent Bills">
          <div className="space-y-3 mt-2">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : recentBills.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-sm">No bills yet.</p>
            ) : (
              recentBills.map((bill: any) => (
                <div key={bill.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-800">{bill.billNumber}</div>
                      <div className="text-xs text-slate-500">{bill.vendorName}</div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-900">${bill.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <Badge variant={statusVariant(bill.status) as any}>{bill.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link to="/bills">
            <Button variant="ghost" className="w-full mt-3 text-indigo-600">View all bills <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card title="Recent Transactions">
          <div className="space-y-3 mt-2">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : recentTxs.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-sm">No recent transactions.</p>
            ) : (
              recentTxs.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-800">{tx.description}</div>
                      <div className="text-xs text-slate-500">{tx.date?.toDate ? format(tx.date.toDate(), "MMM dd, yyyy") : tx.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("font-bold text-sm", tx.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                      {tx.amount > 0 ? "+" : ""}${tx.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link to="/transactions">
            <Button variant="ghost" className="w-full mt-3 text-indigo-600">View all transactions <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-4 mt-2">
            <Link to="/invoices">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <FileText className="w-5 h-5" />
                <span className="text-xs">New Invoice</span>
              </Button>
            </Link>
            <Link to="/bills">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <FileCheck className="w-5 h-5" />
                <span className="text-xs">New Bill</span>
              </Button>
            </Link>
            <Link to="/contacts">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <UserCircle className="w-5 h-5" />
                <span className="text-xs">Contacts</span>
              </Button>
            </Link>
            <Link to="/payroll">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Users className="w-5 h-5" />
                <span className="text-xs">Run Payroll</span>
              </Button>
            </Link>
            <Link to="/reports">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs">Reports</span>
              </Button>
            </Link>
            <Link to="/transactions">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Receipt className="w-5 h-5" />
                <span className="text-xs">Transactions</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
