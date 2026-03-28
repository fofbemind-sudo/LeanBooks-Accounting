import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, resetStore, seedDoc } from "../__mocks__/firestore";

vi.mock("../lib/firestore", () => ({
  db: mockDb,
}));

import { businessOwnershipMiddleware } from "./business";

function createMockReq(overrides: Record<string, any> = {}): any {
  return {
    headers: {},
    query: {},
    body: {},
    params: {},
    user: { uid: "user_1" },
    ...overrides,
  };
}

function createMockRes(): any {
  const res: any = {
    _status: 0,
    _json: null,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: any) {
      res._json = data;
      return res;
    },
  };
  return res;
}

describe("businessOwnershipMiddleware", () => {
  beforeEach(() => {
    resetStore();
  });

  it("returns 400 when businessId is missing", async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    await businessOwnershipMiddleware(req, res, next);

    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/businessId/i);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = createMockReq({ user: undefined, query: { businessId: "biz_1" } });
    const res = createMockRes();
    const next = vi.fn();

    await businessOwnershipMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 404 when business does not exist", async () => {
    const req = createMockReq({ query: { businessId: "nonexistent" } });
    const res = createMockRes();
    const next = vi.fn();

    await businessOwnershipMiddleware(req, res, next);

    expect(res._status).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user does not own the business", async () => {
    seedDoc("businesses", "biz_1", { ownerId: "other_user" });

    const req = createMockReq({ query: { businessId: "biz_1" } });
    const res = createMockRes();
    const next = vi.fn();

    await businessOwnershipMiddleware(req, res, next);

    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next and attaches business data when user owns the business", async () => {
    seedDoc("businesses", "biz_1", { ownerId: "user_1", name: "My Biz" });

    const req = createMockReq({ query: { businessId: "biz_1" } });
    const res = createMockRes();
    const next = vi.fn();

    await businessOwnershipMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.business).toBeDefined();
    expect(req.business.name).toBe("My Biz");
  });

  it("reads businessId from body when not in query", async () => {
    seedDoc("businesses", "biz_1", { ownerId: "user_1" });

    const req = createMockReq({ body: { businessId: "biz_1" } });
    const res = createMockRes();
    const next = vi.fn();

    await businessOwnershipMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("reads businessId from params when not in query or body", async () => {
    seedDoc("businesses", "biz_1", { ownerId: "user_1" });

    const req = createMockReq({ params: { businessId: "biz_1" } });
    const res = createMockRes();
    const next = vi.fn();

    await businessOwnershipMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("prefers query businessId over body and params", async () => {
    seedDoc("businesses", "biz_q", { ownerId: "user_1" });
    seedDoc("businesses", "biz_b", { ownerId: "other_user" });

    const req = createMockReq({
      query: { businessId: "biz_q" },
      body: { businessId: "biz_b" },
    });
    const res = createMockRes();
    const next = vi.fn();

    await businessOwnershipMiddleware(req, res, next);

    // Should use query (biz_q owned by user_1) → next() called
    expect(next).toHaveBeenCalled();
  });
});
