import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateEmailVerificationToken(): string {
  return uuidv4();
}

export function generateVerificationLink(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/verify-email?token=${token}`;
}
