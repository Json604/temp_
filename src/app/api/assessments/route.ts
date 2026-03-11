import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const assessments = await prisma.assessment.findMany({
      where: { user_email: email },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        inputs: true,
        results: true,
        created_at: true,
      },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Failed to fetch assessments:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
