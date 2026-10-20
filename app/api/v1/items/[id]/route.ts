import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordApiKeyUsage } from "../../record-key-usage";
import { getAdminSupabase, getAuthenticatedSupabase } from "../../../_lib/auth";
import { checkApiKeyQuota } from "../../../_lib/api-key-quota";

function publicFields(row: Record<string, unknown>) {
  const allowed = [
    "id", "name", "description", "image_url", "price_usd", "user_id", "is_free", "created_at",
    "statusType", "category", "tags", "language", "token_address", "token_symbol", "pool_address",
    "fee_selection", "vault_mode", "mcp_server_url", "x402_url", "use_cases", "requirements", "links",
  ];
  return Object.fromEntries(allowed.filter((key) => key in row).map((key) => [key, row[key]]));
}

function missingBundlesTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205"
    || /marketplace_bundles.*(does not exist|schema cache)/i.test(error?.message ?? "");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const quota = await checkApiKeyQuota(_request);
  if (quota.error) return quota.error;
  const { id } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Marketplace data is not configured." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not load marketplace item." }, { status: 500 });
  if (!data) {
    const { data: bundle, error: bundleError } = await supabase.from("marketplace_bundles")
      .select("id,name,description,image_url,price_usd,is_free,created_at,owner_id")
      .eq("id", id).eq("status", "published").maybeSingle();
    await recordApiKeyUsage(_request, "GET", "/api/v1/items/:id", bundleError && !missingBundlesTable(bundleError) ? 500 : bundle ? 200 : 404);
    if (bundleError && !missingBundlesTable(bundleError)) return NextResponse.json({ error: "Could not load marketplace item." }, { status: 500 });
    if (!bundle) return NextResponse.json({ error: "Item not found." }, { status: 404 });
    return NextResponse.json({ item: { id: bundle.id, name: bundle.name, description: bundle.description, image_url: bundle.image_url, price_usd: bundle.price_usd, is_free: bundle.is_free, created_at: bundle.created_at, user_id: bundle.owner_id, statusType: "bundle" } });
  }
  await recordApiKeyUsage(_request, "GET", "/api/v1/items/:id", 200);

  let content: string | null = null;
  const auth = await getAuthenticatedSupabase(_request);
  let canReadContent = Boolean(data.is_free);
  if (!data.is_free && auth) {
    if (data.owner_id === auth.user.id) canReadContent = true;
    else {
      const { data: purchase } = await auth.supabase.from("marketplace_purchases")
        .select("id").eq("buyer_id", auth.user.id).eq("listing_id", id).eq("status", "paid").maybeSingle();
      canReadContent = Boolean(purchase);
    }
  }
  if (!canReadContent) {
    const admin = getAdminSupabase();
    if (admin) {
      const { data: links } = await admin.from("marketplace_bundle_items").select("bundle_id").eq("item_id", id);
      const bundleIds = (links ?? []).map((link) => link.bundle_id);
      if (bundleIds.length) {
        const { data: freeBundles } = await admin.from("marketplace_bundles").select("id")
          .in("id", bundleIds).eq("status", "published").eq("is_free", true).limit(1);
        let paidBundles: Array<{ id: string }> = [];
        if (auth) {
          const { data } = await admin.from("marketplace_purchases").select("id")
            .eq("buyer_id", auth.user.id).eq("status", "paid").in("bundle_id", bundleIds).limit(1);
          paidBundles = data ?? [];
        }
        canReadContent = Boolean(freeBundles?.length || paidBundles.length);
      }
    }
  }
  if (canReadContent) {
    const contentColumn: Record<string, string> = {
      agent: "agent_code", prompt: "prompt_body", tool: "tool_code", skill: "skill_content",
    };
    const column = contentColumn[String(data.statusType || "agent").toLowerCase()];
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (column && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: body } = await admin.from("agents").select(column).eq("id", id).maybeSingle();
      if (body) content = (body as unknown as Record<string, string | null>)[column] ?? null;
    }
  }
  return NextResponse.json({ item: { ...publicFields(data as Record<string, unknown>), ...(content === null ? {} : { content }) } });
}
