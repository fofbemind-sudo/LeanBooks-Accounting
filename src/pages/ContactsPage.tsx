import React, { useState, useEffect } from "react";
import {
  UserCircle,
  Plus,
  Loader2,
  Mail,
  Phone,
  Building,
  Search,
} from "lucide-react";
import { Card, Button, Badge, Input, Select, Modal } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { Contact, ContactType } from "../types";

export const ContactsPage = () => {
  const { business } = useAppContext();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Form state
  const [form, setForm] = useState({
    type: "Customer" as ContactType,
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    paymentTerms: "30",
    notes: "",
  });

  useEffect(() => {
    if (!business) return;
    fetchContacts();
  }, [business, filterType]);

  const fetchContacts = async () => {
    if (!business) return;
    setLoading(true);
    try {
      const data = await api.getContacts(
        business.id,
        filterType === "all" ? undefined : filterType
      );
      setContacts(data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setLoading(true);
    try {
      await api.createContact({
        businessId: business.id,
        ...form,
        paymentTerms: parseInt(form.paymentTerms),
      });
      await fetchContacts();
      setIsModalOpen(false);
      setForm({ type: "Customer", name: "", email: "", phone: "", address: "", city: "", state: "", zip: "", paymentTerms: "30", notes: "" });
    } catch (error) {
      console.error("Error creating contact:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const customers = contacts.filter(c => c.type === "Customer");
  const vendors = contacts.filter(c => c.type === "Vendor");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-500">Manage your customers and vendors</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Contact
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <UserCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{contacts.length}</div>
              <div className="text-xs text-slate-500">Total Contacts</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <UserCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{customers.length}</div>
              <div className="text-xs text-slate-500">Customers</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{vendors.length}</div>
              <div className="text-xs text-slate-500">Vendors</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-40">
          <option value="all">All Types</option>
          <option value="Customer">Customers</option>
          <option value="Vendor">Vendors</option>
        </Select>
      </div>

      {/* Contact List */}
      <Card title="Contact List">
        <div className="divide-y divide-slate-100">
          {loading && contacts.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No contacts found.</p>
          ) : (
            filtered.map((contact) => (
              <div key={contact.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                    <UserCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{contact.name}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {contact.phone}
                        </span>
                      )}
                      <span>Net {contact.paymentTerms}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={contact.type === "Customer" ? "indigo" : "warning"}>
                  {contact.type}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Contact">
        <form onSubmit={handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })}>
                <option value="Customer">Customer</option>
                <option value="Vendor">Vendor</option>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contact name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ZIP</label>
                <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms (days)</label>
              <Select value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
                <option value="0">Due on Receipt</option>
                <option value="15">Net 15</option>
                <option value="30">Net 30</option>
                <option value="45">Net 45</option>
                <option value="60">Net 60</option>
                <option value="90">Net 90</option>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
