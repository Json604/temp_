import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        inputs: true,
        results: true,
        created_at: true,
        user_email: true,
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Failed to fetch assessment:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
