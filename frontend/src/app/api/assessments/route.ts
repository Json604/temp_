import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = authenticate(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const assessments = await prisma.assessment.findMany({
    where: { user_email: user.email.toLowerCase() },
    orderBy: { created_at: "desc" },
    select: { id: true, inputs: true, results: true, created_at: true },
  });

  return NextResponse.json({ assessments });
}
