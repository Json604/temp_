import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";

const SALT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  try {
    const { email, password, action } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalisedEmail = email.toLowerCase().trim();

    if (action === "signup") {
      const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } });
      if (existing) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 409 },
        );
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const domain = normalisedEmail.split("@")[1] ?? "unknown";

      const user = await prisma.user.create({
        data: { email: normalisedEmail, password_hash: passwordHash, company_domain: domain },
      });

      const token = signToken({ userId: user.id, email: user.email });
      return NextResponse.json({
        ok: true,
        user: { id: user.id, email: user.email, company_domain: user.company_domain, token },
      });
    }

    // login
    const user = await prisma.user.findUnique({ where: { email: normalisedEmail } });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email. Please sign up." },
        { status: 404 },
      );
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const token = signToken({ userId: user.id, email: user.email });
    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, company_domain: user.company_domain, token },
    });
  } catch (err: any) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
