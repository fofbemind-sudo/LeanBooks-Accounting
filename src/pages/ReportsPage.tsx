import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Download,
  Calendar,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from "lucide-react";
import { Card, Button, Badge, Select } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "../components/ui";

export const ReportsPage = () => {
  const { business } = useAppContext();
  const [pnl, setPnl] = useState<any>(null);
  const [bs, setBs] = useState<any>(null);
  const [cf, setCf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("current");

  useEffect(() => {
    if (!business) return;
    const fetchReports = async () => {
      setLoading(true);
      try {
        let start = startOfMonth(new Date());
        let end = endOfMonth(new Date());

        if (dateRange === "last") {
          start = startOfMonth(subMonths(new Date(), 1));
          end = endOfMonth(subMonths(new Date(), 1));
        }

        const [pnlRes, bsRes, cfRes] = await Promise.all([
          api.getPnL(business.id, start.toISOString(), end.toISOString()),
          api.getBalanceSheet(business.id, end.toISOString()),
          api.getCashFlow(business.id, start.toISOString(), end.toISOString())
        ]);

        setPnl(pnlRes);
        setBs(bsRes);
        setCf(cfRes);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [business, dateRange]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-500">Real-time insights into your business health</p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-48">
            <option value="current">Current Month</option>
            <option value="last">Last Month</option>
          </Select>
          <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* P&L */}
        <Card title="Profit & Loss">
          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue</h4>
              {pnl?.lineItems?.revenue?.map((acc: any) => (
                <div key={acc.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-600">{acc.name}</span>
                  <span className="font-medium text-slate-900">${acc.balance.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 font-bold text-emerald-600">
                <span>Total Revenue</span>
                <span>${pnl?.totals?.revenue?.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expenses</h4>
              {pnl?.lineItems?.expenses?.map((acc: any) => (
                <div key={acc.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-600">{acc.name}</span>
                  <span className="font-medium text-slate-900">${acc.balance.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 font-bold text-rose-600">
                <span>Total Expenses</span>
                <span>(${pnl?.totals?.expenses?.toLocaleString()})</span>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-slate-100 flex justify-between items-center">
              <span className="text-lg font-black text-slate-900">Net Income</span>
              <span className={cn("text-2xl font-black", pnl?.totals?.netIncome >= 0 ? "text-emerald-600" : "text-rose-600")}>
                ${pnl?.totals?.netIncome?.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* Balance Sheet */}
        <Card title="Balance Sheet">
          <div className="space-y-8">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assets</h4>
              {bs?.lineItems?.assets?.map((acc: any) => (
                <div key={acc.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-600">{acc.name}</span>
                  <span className="font-medium text-slate-900">${acc.balance.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 font-bold text-indigo-600">
                <span>Total Assets</span>
                <span>${bs?.totals?.Assets?.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Liabilities</h4>
              {bs?.lineItems?.liabilities?.map((acc: any) => (
                <div key={acc.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-600">{acc.name}</span>
                  <span className="font-medium text-slate-900">${acc.balance.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 font-bold text-rose-600">
                <span>Total Liabilities</span>
                <span>${bs?.totals?.Liabilities?.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Equity</h4>
              {bs?.lineItems?.equity?.map((acc: any) => (
                <div key={acc.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-600">{acc.name}</span>
                  <span className="font-medium text-slate-900">${acc.balance.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 font-bold text-amber-600">
                <span>Total Equity</span>
                <span>${bs?.totals?.Equity?.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-slate-100 flex justify-between items-center">
              <span className="text-lg font-black text-slate-900">Total Liabilities & Equity</span>
              <span className="text-2xl font-black text-slate-900">
                ${(bs?.totals?.Liabilities + bs?.totals?.Equity).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Cash Flow */}
      <Card title="Cash Flow (Direct Method)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-3 text-emerald-600 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">Cash Inflows</span>
            </div>
            <div className="text-3xl font-black text-emerald-700">${cf?.inflows?.toLocaleString()}</div>
          </div>

          <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <TrendingDown className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">Cash Outflows</span>
            </div>
            <div className="text-3xl font-black text-rose-700">${cf?.outflows?.toLocaleString()}</div>
          </div>

          <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-3 text-indigo-600 mb-2">
              <BarChart3 className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">Net Cash Change</span>
            </div>
            <div className="text-3xl font-black text-indigo-700">
              {cf?.netCashChange >= 0 ? "+" : ""}${cf?.netCashChange?.toLocaleString()}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
