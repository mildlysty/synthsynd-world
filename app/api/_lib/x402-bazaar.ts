import { createCdpJwt } from "./cdp-auth";

export async function searchCdpBazaar(query: string, network?: string) {
  const apiKeyId = process.env.CDP_API_KEY_ID;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;
  if (!apiKeyId || !apiKeySecret) throw new Error("CDP_NOT_CONFIGURED");
  const path = "/platform/v2/x402/discovery/search";
  const params = new URLSearchParams({ query: query.slice(0, 400), limit: "20" });
  if (network) params.set("network", network);
  const token = createCdpJwt(apiKeyId, apiKeySecret, "GET", path);
  const response = await fetch(`https://api.cdp.coinbase.com${path}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("CDP_BAZAAR_UNAVAILABLE");
  const body = await response.json();
  if (!body || typeof body !== "object" || !Array.isArray((body as { resources?: unknown }).resources)) throw new Error("CDP_BAZAAR_INVALID_RESPONSE");
  return body as { resources: Array<Record<string, unknown>>; partialResults?: boolean; searchMethod?: string; x402Version?: number };
}
