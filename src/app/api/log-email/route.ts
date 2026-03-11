import { NextResponse } from "next/server";

// Deprecated: user creation is now handled by /api/auth
export async function POST() {
  return NextResponse.json({ ok: true });
}
