import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/firestore", () => ({
  db: {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn(),
    batch: vi.fn(),
  },
  Timestamp: {
    now: vi.fn().mockReturnValue({ toDate: () => new Date() }),
  },
}));

import { AccountService } from "./accountService";
import { db } from "../lib/firestore";

describe("AccountService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initializeBusiness", () => {
    it("should create default accounts if they don't exist", async () => {
      const mockExistingAccountsSnapshot = {
        docs: [
          { data: () => ({ code: "1000" }) }, // Cash already exists
        ],
      };

      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue({}),
      };

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockExistingAccountsSnapshot),
        doc: vi.fn().mockReturnValue({ id: "new-acc-id" }),
      });

      (db.batch as any).mockReturnValue(mockBatch);

      const results = await AccountService.initializeBusiness("biz-1");

      // Total default accounts is 16. One exists, so 15 should be created.
      expect(results.length).toBe(15);
      expect(mockBatch.set).toHaveBeenCalledTimes(15);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should not create any accounts if all already exist", async () => {
      const mockExistingAccountsSnapshot = {
        docs: [
          { data: () => ({ code: "1000" }) },
          { data: () => ({ code: "1010" }) },
          { data: () => ({ code: "1100" }) },
          { data: () => ({ code: "1200" }) },
          { data: () => ({ code: "2000" }) },
          { data: () => ({ code: "2100" }) },
          { data: () => ({ code: "3000" }) },
          { data: () => ({ code: "3100" }) },
          { data: () => ({ code: "4000" }) },
          { data: () => ({ code: "5000" }) },
          { data: () => ({ code: "5100" }) },
          { data: () => ({ code: "5200" }) },
          { data: () => ({ code: "5300" }) },
          { data: () => ({ code: "5400" }) },
          { data: () => ({ code: "5500" }) },
          { data: () => ({ code: "5999" }) },
        ],
      };

      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue({}),
      };

      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockExistingAccountsSnapshot),
      });

      (db.batch as any).mockReturnValue(mockBatch);

      const results = await AccountService.initializeBusiness("biz-1");

      expect(results.length).toBe(0);
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    it("should throw InternalServerError if initializeBusiness fails", async () => {
      (db.collection as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(new Error("Firestore error")),
      });

      await expect(
        AccountService.initializeBusiness("biz-1")
      ).rejects.toThrow("Failed to initialize business accounts");
    });
  });
});
