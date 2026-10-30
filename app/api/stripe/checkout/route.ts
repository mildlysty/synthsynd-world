import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "../../_lib/auth";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in before purchasing." }, { status: 401 });
  return NextResponse.json({ error: "INR marketplace checkout is not enabled. No payment was created or charged." }, { status: 503 });
}
