import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function apiKeyFromRequest(request: Request) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(ssw_[\w-]+)$/i)?.[1] ?? null;
}

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function validateAndRecordApiKey(request: Request, method: string, endpoint: string, statusCode = 200) {
  const rawKey = apiKeyFromRequest(request);
  const supabase = getPublicClient();
  if (!rawKey || !supabase) return false;
  const { data } = await supabase.rpc("record_marketplace_api_usage", {
    p_key_hash: createHash("sha256").update(rawKey).digest("hex"),
    p_method: method,
    p_endpoint: endpoint,
    p_status_code: statusCode,
  });
  return data === true;
}

export async function recordApiKeyUsage(request: Request, method: string, endpoint: string, statusCode = 200) {
  const rawKey = apiKeyFromRequest(request);
  const supabase = getPublicClient();
  if (!rawKey || !supabase) return;
  await supabase.rpc("record_marketplace_api_usage", {
    p_key_hash: createHash("sha256").update(rawKey).digest("hex"),
    p_method: method,
    p_endpoint: endpoint,
    p_status_code: statusCode,
  });
}
