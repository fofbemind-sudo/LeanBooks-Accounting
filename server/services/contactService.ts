import { db, Timestamp } from "../lib/firestore";
import { Contact, ContactType } from "../types/contacts";

export class ContactService {
  static async create(businessId: string, data: Partial<Contact>): Promise<Contact> {
    const ref = db.collection("contacts").doc();
    const contact: Contact = {
      id: ref.id,
      businessId,
      type: data.type || "Customer",
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || "",
      taxId: data.taxId || "",
      paymentTerms: data.paymentTerms ?? 30,
      notes: data.notes || "",
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await ref.set(contact);
    return contact;
  }

  static async list(businessId: string, type?: ContactType): Promise<Contact[]> {
    let query: FirebaseFirestore.Query = db.collection("contacts")
      .where("businessId", "==", businessId);
    if (type) {
      query = query.where("type", "==", type);
    }
    const snapshot = await query.orderBy("name", "asc").get();
    return snapshot.docs.map(doc => doc.data() as Contact);
  }

  static async getById(businessId: string, contactId: string): Promise<Contact | null> {
    const doc = await db.collection("contacts").doc(contactId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Contact;
    if (data.businessId !== businessId) return null;
    return data;
  }

  static async update(businessId: string, contactId: string, data: Partial<Contact>): Promise<Contact | null> {
    const ref = db.collection("contacts").doc(contactId);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const existing = doc.data() as Contact;
    if (existing.businessId !== businessId) return null;

    const allowedFields = ["name", "email", "phone", "address", "city", "state", "zip", "taxId", "paymentTerms", "notes", "isActive"];
    const changes: Record<string, any> = { updatedAt: Timestamp.now() };
    for (const field of allowedFields) {
      if (field in data) {
        changes[field] = (data as any)[field];
      }
    }

    const updated = { ...existing, ...changes, id: contactId, businessId };
    await ref.update(changes);
    return updated;
  }
}
