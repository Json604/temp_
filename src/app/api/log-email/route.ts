import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, domain } = await request.json();

    if (!email || !domain) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const normalisedEmail = email.toLowerCase();
    const companyDomain = domain.toLowerCase();

    // Upsert user: create if new, skip if existing
    try {
      await prisma.user.upsert({
        where: { email: normalisedEmail },
        update: {},
        create: {
          email: normalisedEmail,
          company_domain: companyDomain,
        },
      });
    } catch (dbError) {
      // Database unavailable — log silently, do not block the user
      console.error("Database upsert failed (non-blocking):", dbError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to log email:", error);
    return NextResponse.json({ ok: true });
  }
}
