import { randomCharacters } from "./crypto";
import env from "./env";

export function transformToSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function transformToId(
  text: string,
  randomAmount = env.uuidLength
): string {
  const uuid = getRandomId(randomAmount);
  if (env.readableUuids) {
    const slug = transformToSlug(text);
    const cappedSlug = slug.slice(0, 15);
    return `${cappedSlug}-${uuid}`;
  }
  return uuid;
}

export function getRandomId(randomAmount = env.uuidLength): string {
  const random = randomCharacters(randomAmount).toLowerCase();
  return random;
}

export const toBase64 = (text: string): string => {
  return Buffer.from(text, "utf-8").toString("base64");
};

export const fromBase64 = (text: string): string => {
  return Buffer.from(text, "base64").toString("utf-8");
};

export const trimSlashes = (path: string): string => {
  return path.replace(/^\/*/, "").replace(/\/*$/, "");
};

export const withTrailingSlash = (path: string): string => {
  return path.replace(/\/*$/, "/");
};

export const withLeadingSlash = (path: string): string => {
  return path.replace(/^\/*/, "/");
};
