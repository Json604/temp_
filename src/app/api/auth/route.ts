import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function POST(request: Request) {
  try {
    const { email, password, action } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalisedEmail = email.toLowerCase().trim();
    const domain = normalisedEmail.split("@")[1] ?? "unknown";

    if (action === "signup") {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: normalisedEmail },
      });

      if (existing) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await prisma.user.create({
        data: {
          email: normalisedEmail,
          password_hash: passwordHash,
          company_domain: domain,
        },
      });

      return NextResponse.json({
        ok: true,
        user: { id: user.id, email: user.email, company_domain: user.company_domain },
      });
    }

    if (action === "login") {
      const user = await prisma.user.findUnique({
        where: { email: normalisedEmail },
      });

      if (!user) {
        return NextResponse.json(
          { error: "No account found with this email. Please sign up." },
          { status: 404 }
        );
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return NextResponse.json(
          { error: "Incorrect password." },
          { status: 401 }
        );
      }

      return NextResponse.json({
        ok: true,
        user: { id: user.id, email: user.email, company_domain: user.company_domain },
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
