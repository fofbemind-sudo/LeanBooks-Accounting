import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Building2, 
  CreditCard, 
  Wallet, 
  RefreshCw, 
  Plus, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, Button, Badge, Input, Select } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { cn } from "../components/ui";

export const SettingsPage = () => {
  const { business, user, refreshBusiness } = useAppContext();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!business) return;
    api.getAccounts(business.id).then(setAccounts);
  }, [business]);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await api.createBusiness({
        ownerId: user.uid,
        name: newBusinessName,
        currency: "USD"
      });
      await refreshBusiness();
      setNewBusinessName("");
    } catch (error) {
      console.error("Error creating business:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncStripe = async () => {
    if (!business) return;
    setLoading(true);
    try {
      const cashAcc = accounts.find(a => a.name === "Cash")?.id;
      const feeAcc = accounts.find(a => a.name === "Stripe Fees")?.id;
      const revAcc = accounts.find(a => a.name === "Sales Revenue")?.id;

      if (!cashAcc || !feeAcc || !revAcc) {
        alert("Please ensure you have 'Cash', 'Stripe Fees', and 'Sales Revenue' accounts set up.");
        return;
      }

      await api.syncStripe({
        businessId: business.id,
        cashAccountId: cashAcc,
        feeAccountId: feeAcc,
        revenueAccountId: revAcc
      });
      setSyncStatus("Stripe sync successful!");
    } catch (error) {
      console.error("Error syncing stripe:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncBank = async () => {
    if (!business) return;
    setLoading(true);
    try {
      await api.syncBank(business.id);
      setSyncStatus("Bank sync successful!");
    } catch (error) {
      console.error("Error syncing bank:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMatch = async () => {
    if (!business) return;
    setLoading(true);
    try {
      const res = await api.autoMatch(business.id);
      setSyncStatus(`Auto-match complete! Matched ${res.matchCount} transactions.`);
    } catch (error) {
      console.error("Error auto-matching:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">Manage your business and integrations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Business Management */}
          <Card title="Business Profile">
            {business ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-lg">{business.name}</div>
                      <div className="text-sm text-slate-500">Currency: {business.currency}</div>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
                <Button variant="outline" className="w-full">Edit Business Details</Button>
              </div>
            ) : (
              <form onSubmit={handleCreateBusiness} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                  <Input value={newBusinessName} onChange={(e) => setNewBusinessName(e.target.value)} placeholder="e.g. My Awesome Startup" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Business
                </Button>
              </form>
            )}
          </Card>

          {/* Chart of Accounts */}
          <Card title="Chart of Accounts">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">Manage your ledger accounts</p>
                <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Account</Button>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {accounts.map(acc => (
                  <div key={acc.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-400 w-10">{acc.code}</span>
                      <span className="font-medium text-slate-800">{acc.name}</span>
                    </div>
                    <Badge variant="neutral">{acc.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Integrations */}
          <Card title="Integrations">
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-slate-900">Stripe</span>
                </div>
                <p className="text-xs text-slate-500">Sync your Stripe sales and fees automatically.</p>
                <Button variant="outline" size="sm" className="w-full" onClick={handleSyncStripe} disabled={loading}>
                  <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                  Sync Mock Stripe
                </Button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-slate-900">Bank Sync</span>
                </div>
                <p className="text-xs text-slate-500">Import bank transactions from mock Plaid.</p>
                <Button variant="outline" size="sm" className="w-full" onClick={handleSyncBank} disabled={loading}>
                  <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                  Sync Mock Bank
                </Button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-slate-900">Reconciliation</span>
                </div>
                <p className="text-xs text-slate-500">Auto-match bank items to ledger entries.</p>
                <Button variant="outline" size="sm" className="w-full" onClick={handleAutoMatch} disabled={loading}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Auto-Match
                </Button>
              </div>

              {syncStatus && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {syncStatus}
                </div>
              )}
            </div>
          </Card>

          {/* Help / Info */}
          <Card className="bg-slate-900 text-white border-none">
            <div className="flex items-center gap-2 mb-4 text-slate-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">MVP Note</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              This is a secure, founder-operated MVP. All transactions are balanced using double-entry logic. Reports are computed from ledger entries.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
