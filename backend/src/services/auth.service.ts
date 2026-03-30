import bcrypt from "bcryptjs";
import { prisma } from "../config/db";

const SALT_ROUNDS = 12;

export async function signup(email: string, password: string) {
  const normalisedEmail = email.toLowerCase().trim();
  const domain = normalisedEmail.split("@")[1] ?? "unknown";

  const existing = await prisma.user.findUnique({
    where: { email: normalisedEmail },
  });

  if (existing) {
    throw { status: 409, message: "An account with this email already exists. Please sign in." };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: normalisedEmail,
      password_hash: passwordHash,
      company_domain: domain,
    },
  });

  return { id: user.id, email: user.email, company_domain: user.company_domain };
}

export async function login(email: string, password: string) {
  const normalisedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalisedEmail },
  });

  if (!user) {
    throw { status: 404, message: "No account found with this email. Please sign up." };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw { status: 401, message: "Incorrect password." };
  }

  return { id: user.id, email: user.email, company_domain: user.company_domain };
}
