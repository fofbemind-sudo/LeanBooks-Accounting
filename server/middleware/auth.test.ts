import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import { authMiddleware, AuthenticatedRequest } from "./auth";

// Mock firebase-admin
vi.mock("firebase-admin", () => {
  const verifyIdToken = vi.fn();
  return {
    default: {
      auth: () => ({ verifyIdToken }),
      apps: [{}], // pretend already initialized
    },
    __verifyIdToken: verifyIdToken,
  };
});

import admin from "firebase-admin";
const verifyIdToken = (admin as any).__verifyIdToken || admin.auth().verifyIdToken;

function createMockReq(authHeader?: string): AuthenticatedRequest {
  return {
    headers: { authorization: authHeader },
  } as any;
}

function createMockRes(): Response & { _status: number; _json: any } {
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

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when authorization header is missing", async () => {
    const req = createMockReq(undefined);
    const res = createMockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error).toMatch(/missing/i);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization header does not start with Bearer", async () => {
    const req = createMockReq("Basic abc123");
    const res = createMockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token verification fails", async () => {
    verifyIdToken.mockRejectedValue(new Error("Invalid token"));

    const req = createMockReq("Bearer bad_token");
    const res = createMockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error).toBe("Unauthorized");
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches decoded token to req.user and calls next on valid token", async () => {
    const decoded = { uid: "user_123", email: "test@test.com" };
    verifyIdToken.mockResolvedValue(decoded);

    const req = createMockReq("Bearer valid_token");
    const res = createMockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toEqual(decoded);
    expect(next).toHaveBeenCalled();
    expect(res._status).toBe(0); // status() was not called
  });
});
