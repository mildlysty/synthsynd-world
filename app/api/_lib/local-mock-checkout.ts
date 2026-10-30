import { createHmac, timingSafeEqual } from "node:crypto";

export const LOCAL_MOCK_COOKIE = "ssw_local_mock_checkout";
const GRANT_TTL_SECONDS = 30 * 60;

export function localMockCheckoutEnabled() {
  return process.env.NODE_ENV === "development"
    && process.env.LOCAL_MOCK_CHECKOUT_ENABLED === "true"
    && Boolean(process.env.LOCAL_MOCK_CHECKOUT_SECRET && process.env.LOCAL_MOCK_CHECKOUT_SECRET.length >= 32);
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function verifyLocalMockGrant(request: Request, userId: string, listingId: string) {
  if (!localMockCheckoutEnabled()) return false;
  const secret = process.env.LOCAL_MOCK_CHECKOUT_SECRET!;
  const rawCookie = request.headers.get("cookie") ?? "";
  const encoded = rawCookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${LOCAL_MOCK_COOKIE}=`))?.slice(LOCAL_MOCK_COOKIE.length + 1);
  if (!encoded) return false;
  const [payload, suppliedSignature] = decodeURIComponent(encoded).split(".");
  if (!payload || !suppliedSignature) return false;
  const expected = signature(payload, secret);
  const actualBytes = Buffer.from(suppliedSignature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return false;
  try {
    const grant = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; listing?: string; exp?: number };
    return grant.sub === userId && grant.listing === listingId && Number(grant.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function createLocalMockGrantCookie(userId: string, listingId: string) {
  const secret = process.env.LOCAL_MOCK_CHECKOUT_SECRET!;
  const payload = Buffer.from(JSON.stringify({ sub: userId, listing: listingId, exp: Math.floor(Date.now() / 1000) + GRANT_TTL_SECONDS })).toString("base64url");
  const value = `${payload}.${signature(payload, secret)}`;
  return `${LOCAL_MOCK_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${GRANT_TTL_SECONDS}`;
}
