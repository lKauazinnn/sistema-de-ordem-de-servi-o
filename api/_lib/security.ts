import { z } from "zod";

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export function checkRateLimit(key: string, max = 20, intervalMs = 60_000) {
  const now = Date.now();
  const current = rateLimitMap.get(key);

  if (!current || now - current.timestamp > intervalMs) {
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return true;
  }

  if (current.count >= max) {
    return false;
  }

  current.count += 1;
  return true;
}

export function sanitizeString(value: string) {
  return value.replace(/[<>]/g, "").trim();
}

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  return schema.parse(body);
}
