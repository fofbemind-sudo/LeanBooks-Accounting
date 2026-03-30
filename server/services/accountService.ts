import { db, Timestamp } from "../lib/firestore";
import { Account } from "../types/accounting";
import { InternalServerError } from "../lib/errors";

export class AccountService {
  static async initializeBusiness(businessId: string) {
    try {
      const defaultAccounts = [
        // Assets
        { code: "1000", name: "Cash", type: "Asset", subtype: "Bank", isSystem: true },
        { code: "1010", name: "Bank Checking", type: "Asset", subtype: "Bank", isSystem: true },
        { code: "1100", name: "Accounts Receivable", type: "Asset", subtype: "Receivable", isSystem: true },
        { code: "1200", name: "Stripe Clearing", type: "Asset", subtype: "Bank", isSystem: true },
        
        // Liabilities
        { code: "2000", name: "Accounts Payable", type: "Liability", subtype: "Payable", isSystem: true },
        { code: "2100", name: "Payroll Taxes Payable", type: "Liability", subtype: "Current Liability", isSystem: true },
        
        // Equity
        { code: "3000", name: "Owner's Equity", type: "Equity", subtype: "Equity", isSystem: true },
        { code: "3100", name: "Retained Earnings", type: "Equity", subtype: "Equity", isSystem: true },
        
        // Revenue
        { code: "4000", name: "Sales Revenue", type: "Revenue", subtype: "Operating Revenue", isSystem: true },
        
        // Expenses
        { code: "5000", name: "Stripe Fees", type: "Expense", subtype: "Operating Expense", isSystem: true },
        { code: "5100", name: "Payroll Expense", type: "Expense", subtype: "Operating Expense", isSystem: true },
        { code: "5200", name: "Rent Expense", type: "Expense", subtype: "Operating Expense", isSystem: true },
        { code: "5300", name: "Software Expense", type: "Expense", subtype: "Operating Expense", isSystem: true },
        { code: "5400", name: "Equipment Expense", type: "Expense", subtype: "Operating Expense", isSystem: true },
        { code: "5500", name: "Bank Fees", type: "Expense", subtype: "Operating Expense", isSystem: true },
        { code: "5999", name: "Misc Expense", type: "Expense", subtype: "Operating Expense", isSystem: true },
      ];

      const existingAccountsSnapshot = await db.collection("accounts")
        .where("businessId", "==", businessId)
        .get();
      
      const existingCodes = new Set(existingAccountsSnapshot.docs.map(doc => doc.data().code));
      const batch = db.batch();
      const results: any[] = [];

      for (const acc of defaultAccounts) {
        if (existingCodes.has(acc.code)) continue;

        const ref = db.collection("accounts").doc();
        const account: Partial<Account> = {
          ...acc,
          id: ref.id,
          businessId,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        } as any;
        batch.set(ref, account);
        results.push(account);
      }

      if (results.length > 0) {
        await batch.commit();
      }
      
      return results;
    } catch (error: any) {
      console.error("Error in initializeBusiness:", error);
      throw new InternalServerError("Failed to initialize business accounts");
    }
  }
}
