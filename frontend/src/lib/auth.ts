import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface AuthPayload {
  userId: string;
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "lemnisca-dev-secret-change-in-production";

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

/**
 * Extract and verify the Bearer token from a request.
 * Returns the payload or null if invalid/missing.
 */
export function authenticate(req: NextRequest): AuthPayload | null {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;

  try {
    return verifyToken(header.slice(7));
  } catch {
    return null;
  }
}
