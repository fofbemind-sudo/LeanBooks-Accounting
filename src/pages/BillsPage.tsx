import React, { useState, useEffect } from "react";
import {
  FileCheck,
  Plus,
  Loader2,
  CheckCircle,
  DollarSign,
  Trash2,
} from "lucide-react";
import { Card, Button, Badge, Input, Select, Modal } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { Bill, Contact, Account } from "../types";
import { format, addDays } from "date-fns";

const statusVariant = (s: string) => {
  switch (s) {
    case "Paid": return "success";
    case "Received": return "indigo";
    case "Overdue": return "error";
    case "Draft": return "neutral";
    case "Cancelled": return "warning";
    default: return "neutral";
  }
};

export const BillsPage = () => {
  const { business } = useAppContext();
  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Aging
  const [aging, setAging] = useState<any>(null);

  // Create form
  const [vendorId, setVendorId] = useState("");
  const [billNumber, setBillNumber] = useState("");
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
      const [b, v, accts, agingData] = await Promise.all([
        api.getBills(business.id),
        api.getContacts(business.id, "Vendor"),
        api.getAccounts(business.id),
        api.getBillAging(business.id),
      ]);
      setBills(b);
      setVendors(v);
      setAccounts(accts);
      setAging(agingData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    setLoading(true);
    try {
      await api.createBill({
        businessId: business.id,
        vendorId,
        vendorName: vendor.name,
        billNumber: billNumber || undefined,
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
      console.error("Error creating bill:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bill: Bill) => {
    if (!business) return;
    const payableAcc = accounts.find(a => a.name === "Accounts Payable");
    const expenseAcc = accounts.find(a => a.name === "Misc Expense");
    if (!payableAcc || !expenseAcc) {
      alert("Please ensure 'Accounts Payable' and an expense account exist.");
      return;
    }

    try {
      await api.approveBill({
        businessId: business.id,
        billId: bill.id,
        payableAccountId: payableAcc.id,
        expenseAccountId: expenseAcc.id,
      });
      await fetchData();
    } catch (error) {
      console.error("Error approving bill:", error);
    }
  };

  const handleRecordPayment = async () => {
    if (!business || !selectedBill) return;
    const cashAcc = accounts.find(a => a.name === "Cash");
    const payableAcc = accounts.find(a => a.name === "Accounts Payable");
    if (!cashAcc || !payableAcc) {
      alert("Please ensure 'Cash' and 'Accounts Payable' accounts exist.");
      return;
    }

    try {
      await api.recordBillPayment({
        businessId: business.id,
        billId: selectedBill.id,
        amount: parseFloat(payAmount),
        cashAccountId: cashAcc.id,
        payableAccountId: payableAcc.id,
      });
      await fetchData();
      setIsPayOpen(false);
      setSelectedBill(null);
      setPayAmount("");
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  };

  const resetForm = () => {
    setVendorId("");
    setBillNumber("");
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

  const filtered = filterStatus === "all"
    ? bills
    : bills.filter(b => b.status === filterStatus);

  const totalOutstanding = bills
    .filter(b => b.status !== "Paid" && b.status !== "Cancelled" && b.status !== "Draft")
    .reduce((sum, b) => sum + (b.total - b.amountPaid), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bills</h1>
          <p className="text-slate-500">Track and pay vendor bills</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Bill
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs text-slate-500 font-medium">Total Bills</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{bills.length}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 font-medium">Outstanding</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 font-medium">Paid</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{bills.filter(b => b.status === "Paid").length}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 font-medium">Pending Approval</div>
          <div className="text-2xl font-bold text-slate-400 mt-1">{bills.filter(b => b.status === "Draft").length}</div>
        </Card>
      </div>

      {/* A/P Aging Summary */}
      {aging && aging.aging && aging.aging.total > 0 && (
        <Card title="Accounts Payable Aging">
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
          <option value="Received">Received</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </Select>
      </div>

      {/* Bill List */}
      <Card title="Bill List">
        <div className="divide-y divide-slate-100">
          {loading && bills.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No bills found.</p>
          ) : (
            filtered.map((bill) => (
              <div key={bill.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{bill.billNumber}</div>
                    <div className="text-xs text-slate-500">
                      {bill.vendorName} &middot; Due {(() => {
                        const d = bill.dueDate?.toDate ? bill.dueDate.toDate() : new Date(bill.dueDate);
                        return format(d, "MMM dd, yyyy");
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-slate-900">${bill.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    {bill.amountPaid > 0 && bill.status !== "Paid" && (
                      <div className="text-xs text-slate-500">Paid: ${bill.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    )}
                  </div>
                  <Badge variant={statusVariant(bill.status) as any}>{bill.status}</Badge>
                  <div className="flex gap-1">
                    {bill.status === "Draft" && (
                      <Button size="sm" variant="outline" onClick={() => handleApprove(bill)}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                    )}
                    {(bill.status === "Received" || bill.status === "Overdue") && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedBill(bill); setPayAmount(String(bill.total - bill.amountPaid)); setIsPayOpen(true); }}>
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

      {/* Create Bill Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Bill">
        <form onSubmit={handleCreate} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
              <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
                <option value="">Select a vendor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bill Number</label>
              <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} placeholder="Auto-generated if empty" />
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
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !vendorId}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileCheck className="w-4 h-4 mr-2" />}
              Create Bill
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="Record Payment">
        <div className="space-y-4">
          {selectedBill && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-slate-500">Bill {selectedBill.billNumber}</div>
              <div className="font-bold text-slate-900">{selectedBill.vendorName}</div>
              <div className="text-sm text-slate-500 mt-1">
                Total: ${selectedBill.total.toFixed(2)} &middot; Paid: ${selectedBill.amountPaid.toFixed(2)} &middot; Due: ${(selectedBill.total - selectedBill.amountPaid).toFixed(2)}
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
    </div>
  );
};
