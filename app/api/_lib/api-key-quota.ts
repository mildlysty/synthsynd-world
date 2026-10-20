import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Quota = {
  valid: boolean;
  allowed: boolean;
  owner_id?: string;
  plan?: string;
  minute_limit?: number;
  minute_remaining?: number;
  minute_reset?: string;
  month_limit?: number;
  month_remaining?: number;
  month_reset?: string;
  reason?: string;
};

function secretFrom(request: Request) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(ssw_[\w-]+)$/i)?.[1] ?? null;
}

export async function checkApiKeyQuota(request: Request): Promise<{ quota: Quota | null; error: Response | null }> {
  const secret = secretFrom(request);
  if (!secret) return { quota: null, error: null };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { quota: null, error: NextResponse.json({ error: "API key validation is not configured." }, { status: 503 }) };

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const keyHash = createHash("sha256").update(secret).digest("hex");
  const { data, error } = await admin.rpc("consume_marketplace_api_key", { p_key_hash: keyHash });
  if (error) return { quota: null, error: NextResponse.json({ error: "API key quota service is unavailable." }, { status: 503 }) };
  const quota = data as Quota | null;
  if (!quota?.valid) return { quota: null, error: NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 }) };
  if (!quota.allowed) {
    const minuteReset = quota.minute_reset ? Math.ceil((Date.parse(quota.minute_reset) - Date.now()) / 1000) : 60;
    const monthReset = quota.month_reset ? Math.ceil((Date.parse(quota.month_reset) - Date.now()) / 1000) : minuteReset;
    const retryAfter = Math.max(1, Math.min(minuteReset, monthReset));
    return {
      quota,
      error: NextResponse.json({ error: "API request limit reached.", plan: quota.plan, limits: { per_minute: quota.minute_limit, per_month: quota.month_limit }, resets_at: { minute: quota.minute_reset, month: quota.month_reset } }, {
        status: 429,
        headers: { "Retry-After": String(retryAfter), "X-RateLimit-Limit": String(quota.minute_limit ?? ""), "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(Math.floor(Date.parse(quota.minute_reset ?? "") / 1000) || "") },
      }),
    };
  }
  return { quota, error: null };
}

export function quotaHeaders(quota: Quota | null) {
  if (!quota?.allowed) return {};
  return {
    "X-RateLimit-Limit": String(quota.minute_limit ?? ""),
    "X-RateLimit-Remaining": String(quota.minute_remaining ?? ""),
    "X-RateLimit-Reset": String(Math.floor(Date.parse(quota.minute_reset ?? "") / 1000) || ""),
    "X-MonthlyRateLimit-Limit": String(quota.month_limit ?? ""),
    "X-MonthlyRateLimit-Remaining": String(quota.month_remaining ?? ""),
  };
}
