import { db, Timestamp } from "../lib/firestore";

export interface AuditLogEntry {
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  resource: string;
  resourceId: string;
  timestamp: any;
  previousData?: any;
  newData?: any;
  businessId: string;
}

export class AuditService {
  static async log(entry: Omit<AuditLogEntry, "timestamp">) {
    try {
      await db.collection("audit_log").add({
        ...entry,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error("Failed to log audit entry:", error);
      // We don't throw here to avoid breaking the main operation
    }
  }

  static async getLogs(businessId: string, limit = 50) {
    const snapshot = await db.collection("audit_log")
      .where("businessId", "==", businessId)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
