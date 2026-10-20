import { NextResponse } from "next/server";
import { getAdminSupabase, getAuthenticatedSupabase } from "./auth";

export async function requireMarketplaceAdmin(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return { response: NextResponse.json({ error: "Sign in to access administration." }, { status: 401 }) };
  const adminIds = new Set((process.env.ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean));
  if (!adminIds.has(auth.user.id)) return { response: NextResponse.json({ error: "Administrator access is not enabled for this account." }, { status: 403 }) };
  const admin = getAdminSupabase();
  if (!admin) return { response: NextResponse.json({ error: "Admin tools require the server-side Supabase service role key." }, { status: 503 }) };
  return { actorId: auth.user.id, admin };
}
