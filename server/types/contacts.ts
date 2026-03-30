export type ContactType = "Customer" | "Vendor";

export interface Contact {
  id: string;
  businessId: string;
  type: ContactType;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  taxId?: string;
  paymentTerms: number; // days, e.g. 30 for Net 30
  notes?: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  issueDate: any;
  dueDate: any;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export type BillStatus = "Draft" | "Received" | "Paid" | "Overdue" | "Cancelled";

export interface BillLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  accountId?: string;
}

export interface Bill {
  id: string;
  businessId: string;
  vendorId: string;
  vendorName: string;
  billNumber: string;
  issueDate: any;
  dueDate: any;
  lineItems: BillLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  status: BillStatus;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}
