import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/firestore", () => ({
  db: {
    collection: vi.fn().mockReturnThis(),
    add: vi.fn().mockResolvedValue({ id: "mock-id" }),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      docs: [{ id: "log-1", data: () => ({ action: "CREATE" }) }]
    }),
  },
  Timestamp: {
    now: vi.fn().mockReturnValue("mock-timestamp"),
  },
}));

import { AuditService } from "./auditService";
import { db } from "../lib/firestore";

describe("AuditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("log", () => {
    it("should add a log entry to the audit_log collection", async () => {
      const entry = {
        userId: "user-1",
        businessId: "biz-1",
        action: "CREATE" as const,
        resource: "test",
        resourceId: "res-1",
        newData: { foo: "bar" }
      };

      await AuditService.log(entry);

      expect(db.collection).toHaveBeenCalledWith("audit_log");
      expect(db.collection("audit_log").add).toHaveBeenCalledWith({
        ...entry,
        timestamp: "mock-timestamp"
      });
    });

    it("should not throw if logging fails", async () => {
      (db.collection("audit_log").add as any).mockRejectedValueOnce(new Error("Firestore error"));
      
      await expect(AuditService.log({} as any)).resolves.not.toThrow();
    });
  });

  describe("getLogs", () => {
    it("should fetch logs for a business", async () => {
      const logs = await AuditService.getLogs("biz-1");
      
      expect(db.collection).toHaveBeenCalledWith("audit_log");
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe("log-1");
    });
  });
});
