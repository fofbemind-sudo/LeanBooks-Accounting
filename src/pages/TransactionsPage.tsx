import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Loader2,
  Receipt,
  Filter,
  RefreshCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, Button, Badge, Input, Select, Modal } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { format } from "date-fns";
import { cn } from "../components/ui";

export const TransactionsPage = () => {
  const { business } = useAppContext();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bankTransactions, setBankTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"ledger" | "bank">("ledger");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Expense");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [drAccount, setDrAccount] = useState("");
  const [crAccount, setCrAccount] = useState("");

  const fetchData = async () => {
    if (!business) return;
    setLoading(true);
    try {
      const [txs, accs, btxs] = await Promise.all([
        api.getTransactions(business.id),
        api.getAccounts(business.id),
        api.getBankTransactions(business.id)
      ]);
      setTransactions(txs);
      setAccounts(accs);
      setBankTransactions(btxs);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setLoading(true);
    try {
      await api.createTransaction({
        businessId: business.id,
        date,
        description,
        amount: parseFloat(amount),
        type,
        source: "manual",
        entries: [
          { accountId: drAccount, debit: parseFloat(amount), credit: 0 },
          { accountId: crAccount, debit: 0, credit: parseFloat(amount) }
        ]
      });
      await fetchData();
      setIsTxModalOpen(false);
      setDescription("");
      setAmount("");
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Failed to save transaction. Check if debits and credits balance.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMatch = async () => {
    if (!business) return;
    setLoading(true);
    try {
      await api.autoMatch(business.id);
      await fetchData();
    } catch (error) {
      console.error("Error auto-matching:", error);
    } finally {
      setLoading(false);
    }
  };

  const unmatchedCount = bankTransactions.filter(t => t.status === "unmatched").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500">Manage your income, expenses, and bank reconciliation</p>
        </div>
        <div className="flex gap-3">
          {activeTab === "bank" && (
            <Button variant="outline" onClick={handleAutoMatch} disabled={loading || unmatchedCount === 0}>
              <RefreshCcw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Auto-Match
            </Button>
          )}
          <Button onClick={() => setIsTxModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Transaction</Button>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("ledger")}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2",
            activeTab === "ledger" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          General Ledger
        </button>
        <button 
          onClick={() => setActiveTab("bank")}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
            activeTab === "bank" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Bank Reconciliation
          {unmatchedCount > 0 && <Badge variant="warning" className="ml-1">{unmatchedCount}</Badge>}
        </button>
      </div>

      <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title="New Transaction">
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
              <option value="Adjustment">Manual Adjustment</option>
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
            <Button type="button" variant="outline" onClick={() => setIsTxModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Save Transaction
            </Button>
          </div>
        </form>
      </Modal>

      {activeTab === "ledger" ? (
        <Card className="p-0">
          <div className="p-4 border-b border-slate-100 flex gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-10" placeholder="Search transactions..." />
            </div>
            <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type / Source</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">{tx.date?.toDate ? format(tx.date.toDate(), "MMM dd, yyyy") : tx.date}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{tx.description}</div>
                        <div className="text-xs text-slate-400">ID: {tx.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral" className="capitalize">{tx.type || "Other"}</Badge>
                          <span className="text-xs text-slate-400 capitalize">{tx.source}</span>
                        </div>
                      </td>
                      <td className={cn("px-6 py-4 text-sm font-bold text-right", tx.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                        {tx.amount > 0 ? "+" : ""}${tx.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={tx.status === "matched" ? "success" : "neutral"}>
                          {tx.status === "matched" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              {unmatchedCount} unmatched bank transactions found.
            </div>
            <p className="text-xs text-amber-700">Auto-match will attempt to link these to existing ledger entries based on amount and date.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Description</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                    </td>
                  </tr>
                ) : bankTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No bank transactions imported.
                    </td>
                  </tr>
                ) : (
                  bankTransactions.map((btx) => (
                    <tr key={btx.id} className={cn("hover:bg-slate-50/50 transition-colors", btx.status === "unmatched" && "bg-amber-50/20")}>
                      <td className="px-6 py-4 text-sm text-slate-600">{btx.date?.toDate ? format(btx.date.toDate(), "MMM dd, yyyy") : btx.date}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{btx.description}</td>
                      <td className={cn("px-6 py-4 text-sm font-bold text-right", btx.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                        {btx.amount > 0 ? "+" : ""}${btx.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={btx.status === "matched" ? "success" : "warning"}>
                          {btx.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {btx.status === "unmatched" ? (
                          <Button variant="ghost" size="sm" className="text-slate-400 cursor-not-allowed" disabled>
                            Manual Match (Coming Soon)
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Linked to {btx.transactionId?.slice(0, 8)}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
