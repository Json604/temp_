import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, inputs, results } = await request.json();

    if (!email || !inputs || !results) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const assessment = await prisma.assessment.create({
      data: {
        user_email: email.toLowerCase(),
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
