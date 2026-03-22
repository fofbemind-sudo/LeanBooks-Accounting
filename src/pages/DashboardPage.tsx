import React, { useState, useEffect } from "react";
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet,
  Receipt,
  ChevronRight,
  Loader2,
  Search,
  Users,
  BarChart3
} from "lucide-react";
import { Card, Button, Badge, cn } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

export const DashboardPage = () => {
  const { business } = useAppContext();
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, cash: 0, unmatchedCount: 0 });
  const [recentTxs, setRecentTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;

    const fetchData = async () => {
      try {
        const start = startOfMonth(new Date()).toISOString();
        const end = endOfMonth(new Date()).toISOString();
        
        const [pnl, bs, txs, bankTxs] = await Promise.all([
          api.getPnL(business.id, start, end),
          api.getBalanceSheet(business.id, end),
          api.getTransactions(business.id),
          api.getBankTransactions(business.id)
        ]);

        setStats({
          revenue: pnl.revenue || 0,
          expenses: pnl.expenses || 0,
          cash: bs.totals?.Assets || 0,
          unmatchedCount: bankTxs.filter(t => t.status === "unmatched").length
        });

        setRecentTxs(txs.slice(0, 5));
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back to {business.name}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Search className="w-4 h-4 mr-2" /> Search</Button>
          <Button><Plus className="w-4 h-4 mr-2" /> New Transaction</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Monthly Revenue</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${stats.revenue.toLocaleString()}</div>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Monthly Expenses</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${stats.expenses.toLocaleString()}</div>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Cash Balance</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${stats.cash.toLocaleString()}</div>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Unmatched Items</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.unmatchedCount}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Transactions">
          <div className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : recentTxs.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No recent transactions.</p>
            ) : (
              recentTxs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{tx.description}</div>
                      <div className="text-xs text-slate-500">{tx.date?.toDate ? format(tx.date.toDate(), "MMM dd, yyyy") : tx.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("font-bold", tx.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                      {tx.amount > 0 ? "+" : ""}${tx.amount.toLocaleString()}
                    </div>
                    <Badge variant={tx.status === "matched" ? "success" : "neutral"}>{tx.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
          <Button variant="ghost" className="w-full mt-4 text-indigo-600">View all transactions <ChevronRight className="w-4 h-4 ml-1" /></Button>
        </Card>

        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Plus className="w-6 h-6" />
              Add Income
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Plus className="w-6 h-6" />
              Add Expense
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Users className="w-6 h-6" />
              Run Payroll
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <BarChart3 className="w-6 h-6" />
              View Reports
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
