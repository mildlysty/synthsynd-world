import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "../../_lib/auth";

export async function GET(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ isAdmin: false }, { status: 401 });
  const adminIds = new Set((process.env.ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean));
  return NextResponse.json({ isAdmin: adminIds.has(auth.user.id) });
}
