import { prisma } from "../config/db";

export async function getAssessments(email: string) {
  const assessments = await prisma.assessment.findMany({
    where: { user_email: email.toLowerCase() },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      inputs: true,
      results: true,
      created_at: true,
    },
  });

  return assessments;
}

export async function getAssessmentById(id: string) {
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
    throw { status: 404, message: "Not found" };
  }

  return assessment;
}

export async function saveAssessment(email: string, inputs: unknown, results: unknown) {
  const normalisedEmail = email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalisedEmail },
  });

  if (!user) {
    throw { status: 401, message: "User not found" };
  }

  const assessment = await prisma.assessment.create({
    data: {
      user_email: normalisedEmail,
      inputs: inputs as any,
      results: results as any,
    },
  });

  return { id: assessment.id };
}
