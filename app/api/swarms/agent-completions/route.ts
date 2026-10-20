import { runMarketplaceInference } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runMarketplaceInference(request, "agent");
}
