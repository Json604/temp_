import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, inputs, results } = await request.json();

    if (!email || !inputs || !results) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const normalisedEmail = email.toLowerCase();
    const domain = normalisedEmail.split("@")[1] ?? "unknown";

    // Verify user exists (must have signed up via /api/auth first)
    const user = await prisma.user.findUnique({
      where: { email: normalisedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const assessment = await prisma.assessment.create({
      data: {
        user_email: normalisedEmail,
        inputs,
        results,
      },
    });

    return NextResponse.json({ id: assessment.id });
  } catch (error) {
    // Save failed — log silently, do not block the user
    console.error("Failed to save assessment (non-blocking):", error);
    return NextResponse.json({ id: null });
  }
}
