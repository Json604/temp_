import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = authenticate(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const { inputs, results } = await req.json();
    const normalisedEmail = user.email.toLowerCase();

    const dbUser = await prisma.user.findUnique({ where: { email: normalisedEmail } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const assessment = await prisma.assessment.create({
      data: {
        user_email: normalisedEmail,
        inputs: inputs as any,
        results: results as any,
      },
    });

    return NextResponse.json({ id: assessment.id });
  } catch (err: any) {
    console.error("Save assessment error:", err);
    return NextResponse.json({ id: null }, { status: 500 });
  }
}
