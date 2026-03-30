import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart3, 
  Download,
  Calendar,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  Building2
} from "lucide-react";
import { Card, Button, Badge, Select, LoadingSpinner, EmptyState } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "../components/ui";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTitle } from "../hooks/useTitle";

export const ReportsPage = React.memo(() => {
  useTitle("Reports");
  const { business } = useAppContext();
  const navigate = useNavigate();
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
        toast.error("Failed to load financial reports");
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [business, dateRange]);

  if (!business) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <EmptyState 
          icon={Building2}
          title="No business selected"
          description="Please select or create a business in settings to view reports."
          action={{ label: "Go to Settings", onClick: () => navigate("/settings") }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const hasData = pnl?.totals?.revenue > 0 || pnl?.totals?.expenses > 0 || bs?.totals?.Assets > 0;

  if (!hasData) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
            <p className="text-slate-500">Real-time insights into your business health</p>
          </div>
          <div className="flex gap-3">
            <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-48">
              <option value="current">Current Month</option>
              <option value="last">Last Month</option>
            </Select>
          </div>
        </div>
        <div className="min-h-[40vh] flex items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm">
          <EmptyState 
            icon={FileText}
            title="No report data available"
            description="There isn't enough data to generate reports for this period. Try changing the date range or adding transactions."
            action={{ label: "Add Transactions", onClick: () => navigate("/transactions") }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-500">Real-time insights into your business health</p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full sm:w-48">
            <option value="current">Current Month</option>
            <option value="last">Last Month</option>
          </Select>
          <Button variant="outline" className="hidden sm:flex" onClick={() => toast.info("PDF export coming soon!")}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* P&L */}
        <Card title="Profit & Loss">
          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue</h4>
              {pnl?.lineItems?.revenue?.length > 0 ? (
                pnl.lineItems.revenue.map((acc: any) => (
                  <div key={acc.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-slate-600">{acc.name}</span>
                    <span className="font-medium text-slate-900">${acc.balance.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 py-2 italic">No revenue recorded</p>
              )}
              <div className="flex justify-between items-center py-3 font-bold text-emerald-600">
                <span>Total Revenue</span>
                <span>${pnl?.totals?.revenue?.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expenses</h4>
              {pnl?.lineItems?.expenses?.length > 0 ? (
                pnl.lineItems.expenses.map((acc: any) => (
                  <div key={acc.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-slate-600">{acc.name}</span>
                    <span className="font-medium text-slate-900">${acc.balance.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 py-2 italic">No expenses recorded</p>
              )}
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
              {bs?.lineItems?.assets?.length > 0 ? (
                bs.lineItems.assets.map((acc: any) => (
                  <div key={acc.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-slate-600">{acc.name}</span>
                    <span className="font-medium text-slate-900">${acc.balance.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 py-2 italic">No assets recorded</p>
              )}
              <div className="flex justify-between items-center py-3 font-bold text-indigo-600">
                <span>Total Assets</span>
                <span>${bs?.totals?.Assets?.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Liabilities</h4>
              {bs?.lineItems?.liabilities?.length > 0 ? (
                bs.lineItems.liabilities.map((acc: any) => (
                  <div key={acc.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-slate-600">{acc.name}</span>
                    <span className="font-medium text-slate-900">${acc.balance.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 py-2 italic">No liabilities recorded</p>
              )}
              <div className="flex justify-between items-center py-3 font-bold text-rose-600">
                <span>Total Liabilities</span>
                <span>${bs?.totals?.Liabilities?.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Equity</h4>
              {bs?.lineItems?.equity?.length > 0 ? (
                bs.lineItems.equity.map((acc: any) => (
                  <div key={acc.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-slate-600">{acc.name}</span>
                    <span className="font-medium text-slate-900">${acc.balance.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 py-2 italic">No equity recorded</p>
              )}
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
});
