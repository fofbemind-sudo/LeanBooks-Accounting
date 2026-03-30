import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Loader2,
  Send,
  DollarSign,
  Trash2,
  Repeat,
  Play,
  Pause,
} from "lucide-react";
import { Card, Button, Badge, Input, Select, Modal, cn } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { Invoice, Contact, Account } from "../types";
import { format, addDays } from "date-fns";

const statusVariant = (s: string) => {
  switch (s) {
    case "Paid": return "success";
    case "Sent": return "indigo";
    case "Overdue": return "error";
    case "Draft": return "neutral";
    case "Cancelled": return "warning";
    default: return "neutral";
  }
};

export const InvoicesPage = () => {
  const { business } = useAppContext();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState<"invoices" | "recurring">("invoices");
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [recurringInvoices, setRecurringInvoices] = useState<any[]>([]);

  // Recurring form
  const [recCustomerId, setRecCustomerId] = useState("");
  const [recFrequency, setRecFrequency] = useState("monthly");
  const [recNextDate, setRecNextDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [recLineItems, setRecLineItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [recNotes, setRecNotes] = useState("");

  // Aging
  const [aging, setAging] = useState<any>(null);

  // Create form
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!business) return;
    fetchData();
  }, [business]);

  const fetchData = async () => {
    if (!business) return;
    setLoading(true);
    try {
      const [inv, cust, accts, agingData, recInvs] = await Promise.all([
        api.getInvoices(business.id),
        api.getContacts(business.id, "Customer"),
        api.getAccounts(business.id),
        api.getInvoiceAging(business.id),
        api.getRecurringInvoices(business.id),
      ]);
      setInvoices(inv);
      setCustomers(cust);
      setAccounts(accts);
      setAging(agingData);
      setRecurringInvoices(Array.isArray(recInvs) ? recInvs : []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    setLoading(true);
    try {
      await api.createInvoice({
        businessId: business.id,
        customerId,
        customerName: customer.name,
        issueDate,
        dueDate,
        lineItems: lineItems.map(li => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
        })),
        notes,
      });
      await fetchData();
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert("Failed to create invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (invoice: Invoice) => {
    if (!business) return;
    const receivableAcc = accounts.find(a => a.name === "Accounts Receivable");
    const revenueAcc = accounts.find(a => a.name === "Sales Revenue");
    if (!receivableAcc || !revenueAcc) {
      alert("Please ensure 'Accounts Receivable' and 'Sales Revenue' accounts exist.");
      return;
    }

    try {
      await api.sendInvoice({
        businessId: business.id,
        invoiceId: invoice.id,
        receivableAccountId: receivableAcc.id,
        revenueAccountId: revenueAcc.id,
      });
      await fetchData();
    } catch (error) {
      console.error("Error sending invoice:", error);
      alert("Failed to send invoice. Please try again.");
    }
  };

  const handleRecordPayment = async () => {
    if (!business || !selectedInvoice) return;
    const cashAcc = accounts.find(a => a.name === "Cash");
    const receivableAcc = accounts.find(a => a.name === "Accounts Receivable");
    if (!cashAcc || !receivableAcc) {
      alert("Please ensure 'Cash' and 'Accounts Receivable' accounts exist.");
      return;
    }

    try {
      await api.recordInvoicePayment({
        businessId: business.id,
        invoiceId: selectedInvoice.id,
        amount: parseFloat(payAmount),
        cashAccountId: cashAcc.id,
        receivableAccountId: receivableAcc.id,
      });
      await fetchData();
      setIsPayOpen(false);
      setSelectedInvoice(null);
      setPayAmount("");
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment. Please try again.");
    }
  };

  const resetForm = () => {
    setCustomerId("");
    setIssueDate(format(new Date(), "yyyy-MM-dd"));
    setDueDate(format(addDays(new Date(), 30), "yyyy-MM-dd"));
    setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    setNotes("");
  };

  const addLineItem = () => setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeLineItem = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));
  const updateLineItem = (i: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[i] as any)[field] = value;
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const recSubtotal = recLineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    const customer = customers.find(c => c.id === recCustomerId);
    if (!customer) return;
    const receivableAcc = accounts.find(a => a.name === "Accounts Receivable");
    const revenueAcc = accounts.find(a => a.name === "Sales Revenue");

    try {
      await api.createRecurringInvoice({
        businessId: business.id,
        customerId: recCustomerId,
        customerName: customer.name,
        frequency: recFrequency,
        nextDate: recNextDate,
        lineItems: recLineItems,
        notes: recNotes,
        receivableAccountId: receivableAcc?.id || "",
        revenueAccountId: revenueAcc?.id || "",
      });
      await fetchData();
      setIsRecurringOpen(false);
      setRecCustomerId("");
      setRecFrequency("monthly");
      setRecNextDate(format(new Date(), "yyyy-MM-dd"));
      setRecLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setRecNotes("");
    } catch (error) {
      console.error("Error creating recurring invoice:", error);
      alert("Failed to create recurring invoice.");
    }
  };

  const handleToggleRecurring = async (recurringId: string) => {
    if (!business) return;
    try {
      await api.toggleRecurringInvoice({ businessId: business.id, recurringId });
      await fetchData();
    } catch (error) {
      console.error("Error toggling recurring invoice:", error);
    }
  };

  const handleProcessRecurring = async () => {
    if (!business) return;
    try {
      const result = await api.processRecurringInvoices(business.id);
      alert(`${result.created} invoice(s) generated from recurring templates.`);
      await fetchData();
    } catch (error) {
      console.error("Error processing recurring invoices:", error);
      alert("Failed to process recurring invoices.");
    }
  };

  const filtered = filterStatus === "all"
    ? invoices
    : invoices.filter(inv => inv.status === filterStatus);

  const totalOutstanding = invoices
    .filter(i => i.status !== "Paid" && i.status !== "Cancelled" && i.status !== "Draft")
    .reduce((sum, i) => sum + (i.total - i.amountPaid), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">Create and manage customer invoices</p>
        </div>
        <div className="flex gap-3">
          {activeTab === "recurring" && (
            <Button variant="outline" onClick={handleProcessRecurring}>
              <Play className="w-4 h-4 mr-2" /> Process Due
            </Button>
          )}
          {activeTab === "recurring" ? (
            <Button onClick={() => setIsRecurringOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Recurring
            </Button>
          ) : (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("invoices")}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2",
            activeTab === "invoices" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Invoices
        </button>
        <button
          onClick={() => setActiveTab("recurring")}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
            activeTab === "recurring" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Repeat className="w-4 h-4" /> Recurring
          {recurringInvoices.filter(r => r.isActive).length > 0 && (
            <Badge variant="indigo">{recurringInvoices.filter(r => r.isActive).length}</Badge>
          )}
        </button>
      </div>

      {activeTab === "invoices" && (<>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs text-slate-500 font-medium">Total Invoices</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{invoices.length}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 font-medium">Outstanding</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 font-medium">Paid</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{invoices.filter(i => i.status === "Paid").length}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 font-medium">Draft</div>
          <div className="text-2xl font-bold text-slate-400 mt-1">{invoices.filter(i => i.status === "Draft").length}</div>
        </Card>
      </div>

      {/* A/R Aging Summary */}
      {aging && aging.aging && aging.aging.total > 0 && (
        <Card title="Accounts Receivable Aging">
          <div className="grid grid-cols-6 gap-4 text-center">
            {[
              { label: "Current", value: aging.aging.current },
              { label: "1-30 Days", value: aging.aging.thirtyDays },
              { label: "31-60 Days", value: aging.aging.sixtyDays },
              { label: "61-90 Days", value: aging.aging.ninetyDays },
              { label: "90+ Days", value: aging.aging.overNinety },
              { label: "Total", value: aging.aging.total },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-xs text-slate-500 font-medium">{item.label}</div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-40">
          <option value="all">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </Select>
      </div>

      {/* Invoice List */}
      <Card title="Invoice List">
        <div className="divide-y divide-slate-100">
          {loading && invoices.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No invoices found.</p>
          ) : (
            filtered.map((inv) => (
              <div key={inv.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">
                      {inv.customerName} &middot; Due {(() => {
                        const d = inv.dueDate?.toDate ? inv.dueDate.toDate() : new Date(inv.dueDate);
                        return format(d, "MMM dd, yyyy");
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-slate-900">${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    {inv.amountPaid > 0 && inv.status !== "Paid" && (
                      <div className="text-xs text-slate-500">Paid: ${inv.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    )}
                  </div>
                  <Badge variant={statusVariant(inv.status) as any}>{inv.status}</Badge>
                  <div className="flex gap-1">
                    {inv.status === "Draft" && (
                      <Button size="sm" variant="outline" onClick={() => handleSend(inv)}>
                        <Send className="w-3 h-3 mr-1" /> Send
                      </Button>
                    )}
                    {(inv.status === "Sent" || inv.status === "Overdue") && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedInvoice(inv); setPayAmount(String(inv.total - inv.amountPaid)); setIsPayOpen(true); }}>
                        <DollarSign className="w-3 h-3 mr-1" /> Pay
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      </>)}

      {/* Recurring Invoices Tab */}
      {activeTab === "recurring" && (
        <Card title="Recurring Invoice Templates">
          <div className="divide-y divide-slate-100">
            {recurringInvoices.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No recurring invoices configured.</p>
            ) : (
              recurringInvoices.map((rec: any) => (
                <div key={rec.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                      <Repeat className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{rec.customerName}</div>
                      <div className="text-xs text-slate-500">
                        {rec.frequency} &middot; ${rec.lineItems?.reduce((s: number, li: any) => s + li.quantity * li.unitPrice, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        &middot; Next: {(() => { const d = rec.nextDate?._seconds ? new Date(rec.nextDate._seconds * 1000) : rec.nextDate?.toDate ? rec.nextDate.toDate() : new Date(rec.nextDate); return format(d, "MMM dd, yyyy"); })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={rec.isActive ? "success" : "neutral"}>{rec.isActive ? "Active" : "Paused"}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleRecurring(rec.id)}>
                      {rec.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Create Invoice Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm(); }} title="Create Invoice">
        <form onSubmit={handleCreate} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">Select a customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Line Items</label>
              <Button type="button" size="sm" variant="ghost" onClick={addLineItem}>
                <Plus className="w-3 h-3 mr-1" /> Add Line
              </Button>
            </div>
            {lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {i === 0 && <label className="block text-xs text-slate-500 mb-1">Description</label>}
                  <Input value={li.description} onChange={(e) => updateLineItem(i, "description", e.target.value)} placeholder="Item description" required />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-slate-500 mb-1">Qty</label>}
                  <Input type="number" min="1" value={li.quantity} onChange={(e) => updateLineItem(i, "quantity", parseInt(e.target.value) || 1)} required />
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="block text-xs text-slate-500 mb-1">Price</label>}
                  <Input type="number" step="0.01" min="0" value={li.unitPrice || ""} onChange={(e) => updateLineItem(i, "unitPrice", parseFloat(e.target.value) || 0)} placeholder="0.00" required />
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">${(li.quantity * li.unitPrice).toFixed(2)}</span>
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => removeLineItem(i)} className="text-slate-400 hover:text-rose-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="text-right font-bold text-slate-900 pt-2 border-t">
              Subtotal: ${subtotal.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for the customer" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" disabled={loading || !customerId || subtotal <= 0}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              Create Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="Record Payment">
        <div className="space-y-4">
          {selectedInvoice && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-slate-500">Invoice {selectedInvoice.invoiceNumber}</div>
              <div className="font-bold text-slate-900">{selectedInvoice.customerName}</div>
              <div className="text-sm text-slate-500 mt-1">
                Total: ${selectedInvoice.total.toFixed(2)} &middot; Paid: ${selectedInvoice.amountPaid.toFixed(2)} &middot; Due: ${(selectedInvoice.total - selectedInvoice.amountPaid).toFixed(2)}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount</label>
            <Input type="number" step="0.01" min="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsPayOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={!payAmount || parseFloat(payAmount) <= 0}>
              <DollarSign className="w-4 h-4 mr-2" /> Record Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Recurring Invoice Modal */}
      <Modal isOpen={isRecurringOpen} onClose={() => setIsRecurringOpen(false)} title="Create Recurring Invoice">
        <form onSubmit={handleCreateRecurring} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
              <Select value={recCustomerId} onChange={(e) => setRecCustomerId(e.target.value)} required>
                <option value="">Select a customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
              <Select value={recFrequency} onChange={(e) => setRecFrequency(e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Invoice Date</label>
              <Input type="date" value={recNextDate} onChange={(e) => setRecNextDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Line Items</label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setRecLineItems([...recLineItems, { description: "", quantity: 1, unitPrice: 0 }])}>
                <Plus className="w-3 h-3 mr-1" /> Add Line
              </Button>
            </div>
            {recLineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {i === 0 && <label className="block text-xs text-slate-500 mb-1">Description</label>}
                  <Input value={li.description} onChange={(e) => { const u = [...recLineItems]; u[i].description = e.target.value; setRecLineItems(u); }} placeholder="Item description" required />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-slate-500 mb-1">Qty</label>}
                  <Input type="number" min="1" value={li.quantity} onChange={(e) => { const u = [...recLineItems]; u[i].quantity = parseInt(e.target.value) || 1; setRecLineItems(u); }} required />
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="block text-xs text-slate-500 mb-1">Price</label>}
                  <Input type="number" step="0.01" min="0" value={li.unitPrice || ""} onChange={(e) => { const u = [...recLineItems]; u[i].unitPrice = parseFloat(e.target.value) || 0; setRecLineItems(u); }} placeholder="0.00" required />
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">${(li.quantity * li.unitPrice).toFixed(2)}</span>
                  {recLineItems.length > 1 && (
                    <button type="button" onClick={() => setRecLineItems(recLineItems.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="text-right font-bold text-slate-900 pt-2 border-t">
              Amount per invoice: ${recSubtotal.toFixed(2)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <Input value={recNotes} onChange={(e) => setRecNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsRecurringOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !recCustomerId || recSubtotal <= 0}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Repeat className="w-4 h-4 mr-2" />}
              Create Recurring
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
