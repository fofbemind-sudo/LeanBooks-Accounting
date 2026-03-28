import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, Button, Badge, Select } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "../components/ui";

const exportToCsv = (filename: string, rows: string[][]) => {
  const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const ReportsPage = () => {
  const { business } = useAppContext();
  const [pnl, setPnl] = useState<any>(null);
  const [bs, setBs] = useState<any>(null);
  const [cf, setCf] = useState<any>(null);
  const [tb, setTb] = useState<any>(null);
  const [gl, setGl] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("current");
  const [activeReport, setActiveReport] = useState<"pnl" | "bs" | "cf" | "tb" | "gl">("pnl");

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

        const [pnlRes, bsRes, cfRes, tbRes, glRes] = await Promise.all([
          api.getPnL(business.id, start.toISOString(), end.toISOString()),
          api.getBalanceSheet(business.id, end.toISOString()),
          api.getCashFlow(business.id, start.toISOString(), end.toISOString()),
          api.getTrialBalance(business.id, end.toISOString()),
          api.getGeneralLedger(business.id, start.toISOString(), end.toISOString()),
        ]);

        setPnl(pnlRes);
        setBs(bsRes);
        setCf(cfRes);
        setTb(tbRes);
        setGl(glRes);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [business, dateRange]);

  const handleExportCsv = () => {
    if (activeReport === "pnl" && pnl) {
      const rows: string[][] = [["Account", "Type", "Amount"]];
      pnl.lineItems?.revenue?.forEach((a: any) => rows.push([a.name, "Revenue", a.balance.toFixed(2)]));
      rows.push(["Total Revenue", "", pnl.totals?.revenue?.toFixed(2) || "0"]);
      pnl.lineItems?.expenses?.forEach((a: any) => rows.push([a.name, "Expense", a.balance.toFixed(2)]));
      rows.push(["Total Expenses", "", pnl.totals?.expenses?.toFixed(2) || "0"]);
      rows.push(["Net Income", "", pnl.totals?.netIncome?.toFixed(2) || "0"]);
      exportToCsv("profit-and-loss.csv", rows);
    } else if (activeReport === "bs" && bs) {
      const rows: string[][] = [["Account", "Section", "Balance"]];
      bs.lineItems?.assets?.forEach((a: any) => rows.push([a.name, "Assets", a.balance.toFixed(2)]));
      rows.push(["Total Assets", "", bs.totals?.Assets?.toFixed(2) || "0"]);
      bs.lineItems?.liabilities?.forEach((a: any) => rows.push([a.name, "Liabilities", a.balance.toFixed(2)]));
      rows.push(["Total Liabilities", "", bs.totals?.Liabilities?.toFixed(2) || "0"]);
      bs.lineItems?.equity?.forEach((a: any) => rows.push([a.name, "Equity", a.balance.toFixed(2)]));
      rows.push(["Total Equity", "", bs.totals?.Equity?.toFixed(2) || "0"]);
      exportToCsv("balance-sheet.csv", rows);
    } else if (activeReport === "tb" && tb) {
      const rows: string[][] = [["Code", "Account", "Type", "Debit", "Credit"]];
      tb.accounts?.forEach((a: any) => rows.push([a.code, a.name, a.type, a.debit.toFixed(2), a.credit.toFixed(2)]));
      rows.push(["", "TOTALS", "", tb.totals?.debit?.toFixed(2) || "0", tb.totals?.credit?.toFixed(2) || "0"]);
      exportToCsv("trial-balance.csv", rows);
    } else if (activeReport === "gl" && gl) {
      const rows: string[][] = [["Date", "Account", "Description", "Debit", "Credit"]];
      gl.entries?.forEach((e: any) => {
        const d = e.date?.toDate ? format(e.date.toDate(), "yyyy-MM-dd") : (e.date?._seconds ? format(new Date(e.date._seconds * 1000), "yyyy-MM-dd") : "");
        rows.push([d, `${e.accountCode} - ${e.accountName}`, e.description, e.debit.toFixed(2), e.credit.toFixed(2)]);
      });
      exportToCsv("general-ledger.csv", rows);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  const reportTabs = [
    { id: "pnl" as const, label: "P&L" },
    { id: "bs" as const, label: "Balance Sheet" },
    { id: "cf" as const, label: "Cash Flow" },
    { id: "tb" as const, label: "Trial Balance" },
    { id: "gl" as const, label: "General Ledger" },
  ];

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
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={cn(
              "px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
              activeReport === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* P&L */}
      {activeReport === "pnl" && (
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
      )}

      {/* Balance Sheet */}
      {activeReport === "bs" && (
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
                ${((bs?.totals?.Liabilities || 0) + (bs?.totals?.Equity || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Cash Flow */}
      {activeReport === "cf" && (
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
      )}

      {/* Trial Balance */}
      {activeReport === "tb" && (
        <Card title="Trial Balance">
          <div className="mb-4 flex items-center gap-2">
            {tb?.totals?.balanced ? (
              <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" /> Balanced</Badge>
            ) : (
              <Badge variant="error"><AlertCircle className="w-3 h-3 mr-1" /> Out of Balance</Badge>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Account</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Debit</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tb?.accounts?.map((acc: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono">{acc.code}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{acc.name}</td>
                    <td className="px-4 py-3"><Badge variant="neutral">{acc.type}</Badge></td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{acc.debit > 0 ? `$${acc.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{acc.credit > 0 ? `$${acc.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                  <td colSpan={3} className="px-4 py-3 text-sm">TOTALS</td>
                  <td className="px-4 py-3 text-sm text-right">${tb?.totals?.debit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-right">${tb?.totals?.credit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* General Ledger */}
      {activeReport === "gl" && (
        <Card title="General Ledger">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Account</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Debit</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gl?.entries?.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No entries for this period.</td></tr>
                ) : (
                  gl?.entries?.map((entry: any, i: number) => {
                    const d = entry.date?._seconds
                      ? format(new Date(entry.date._seconds * 1000), "MMM dd, yyyy")
                      : entry.date?.toDate
                        ? format(entry.date.toDate(), "MMM dd, yyyy")
                        : "";
                    return (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm text-slate-500">{d}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-mono text-slate-400 mr-1">{entry.accountCode}</span>
                          <span className="font-medium text-slate-800">{entry.accountName}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{entry.description}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{entry.debit > 0 ? `$${entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{entry.credit > 0 ? `$${entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
