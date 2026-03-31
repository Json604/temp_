import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = authenticate(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      email: true,
      company_domain: true,
      created_at: true,
      _count: { select: { assessments: true } },
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: dbUser.id,
    email: dbUser.email,
    company_domain: dbUser.company_domain,
    created_at: dbUser.created_at,
    assessment_count: dbUser._count.assessments,
  });
}
