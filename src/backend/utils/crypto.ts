import bcrypt from "bcryptjs";
import crypto from "crypto";

export function randomCharacters(amount: number): string {
  return crypto
    .randomBytes(Math.ceil(amount / 2))
    .toString("hex")
    .slice(0, amount);
}

export async function hashPassword(password: string): Promise<string> {
  const hashed = await bcrypt.hash(password, 10);
  return hashed;
}

export async function checkPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const matches = await bcrypt.compare(password, hashedPassword);
  return matches;
}

export function md5(text: string): string {
  return crypto.createHash("md5").update(text).digest("hex");
}
