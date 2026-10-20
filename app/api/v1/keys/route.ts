import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getUserClient(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return null;

  return {
    token,
    client: createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

async function authenticatedClient(request: Request) {
  const auth = getUserClient(request);
  if (!auth) return null;
  const { data, error } = await auth.client.auth.getUser(auth.token);
  if (error || !data.user) return null;
  return { client: auth.client, user: data.user };
}

export async function GET(request: Request) {
  const auth = await authenticatedClient(request);
  if (!auth) return NextResponse.json({ error: "Sign in to manage API keys." }, { status: 401 });

  const { data, error } = await auth.client
    .from("marketplace_api_keys")
    .select("id,label,key_prefix,created_at,last_used_at,revoked_at")
    .eq("owner_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Could not load API keys." }, { status: 500 });
  const { data: subscription } = await auth.client.from("marketplace_subscriptions").select("plan_code,status")
    .eq("owner_id", auth.user.id).in("status", ["active", "trialing"]).maybeSingle();
  const plan = subscription?.plan_code === "premium" ? "premium" : subscription?.plan_code === "pro" ? "pro" : "free";
  const { data: limits } = await auth.client.from("marketplace_api_plan_limits").select("requests_per_minute,requests_per_month").eq("plan_code", plan).maybeSingle();
  return NextResponse.json({ keys: data ?? [], plan, limits: limits ? { perMinute: limits.requests_per_minute, perMonth: limits.requests_per_month } : null });
}

export async function POST(request: Request) {
  const auth = await authenticatedClient(request);
  if (!auth) return NextResponse.json({ error: "Sign in to create an API key." }, { status: 401 });

  let label = "Default key";
  try {
    const body = await request.json();
    if (typeof body.label === "string" && body.label.trim()) label = body.label.trim().slice(0, 80);
  } catch {
    // An omitted request body is allowed.
  }

  const secret = `ssw_${randomBytes(32).toString("base64url")}`;
  const keyHash = createHash("sha256").update(secret).digest("hex");
  const { data, error } = await auth.client
    .from("marketplace_api_keys")
    .insert({ owner_id: auth.user.id, label, key_prefix: secret.slice(0, 12), key_hash: keyHash })
    .select("id,label,key_prefix,created_at")
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not create API key." }, { status: 500 });
  return NextResponse.json({ key: data, secret }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await authenticatedClient(request);
  if (!auth) return NextResponse.json({ error: "Sign in to revoke an API key." }, { status: 401 });

  let id: string | undefined;
  try {
    const body = await request.json();
    if (typeof body.id === "string") id = body.id;
  } catch {
    return NextResponse.json({ error: "A key id is required." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "A key id is required." }, { status: 400 });

  const { data, error } = await auth.client
    .from("marketplace_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", auth.user.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not revoke API key." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Active API key not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
