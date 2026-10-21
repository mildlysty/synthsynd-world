import { createPublicKey, verify } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const TOKEN_PROGRAMS = [
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
];

/** Requires a fresh signature from the wallet whose token balances are checked. */
export async function hasHolderAccess(request: Request, listingId: string, mintAddress: string) {
  const wallet = request.headers.get("x-holder-wallet") ?? "";
  const signatureText = request.headers.get("x-holder-signature") ?? "";
  const message = request.headers.get("x-holder-message") ?? "";
  let publicKey: PublicKey;
  try { publicKey = new PublicKey(wallet); new PublicKey(mintAddress); } catch { return false; }

  const match = /^synthsynd-holder-access:([^:]+):([^:]+):(\d{13}):([a-f0-9]{32})$/.exec(message);
  if (!match || match[1] !== listingId || match[2] !== mintAddress) return false;
  const signedAt = Number(match[3]);
  if (!Number.isSafeInteger(signedAt) || Math.abs(Date.now() - signedAt) > 5 * 60_000) return false;

  try {
    const signature = Buffer.from(signatureText, "base64");
    if (signature.length !== 64 || signature.toString("base64") !== signatureText) return false;
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKey.toBytes())]), format: "der", type: "spki" });
    if (!verify(null, Buffer.from(message), key, signature)) return false;
  } catch { return false; }

  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  try {
    const results = await Promise.all(TOKEN_PROGRAMS.map(async (programId, index) => {
      const response = await fetch(rpcUrl, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({ jsonrpc: "2.0", id: index + 1, method: "getTokenAccountsByOwner", params: [wallet, { programId }, { encoding: "jsonParsed", commitment: "confirmed" }] }),
      });
      if (!response.ok) throw new Error("Solana RPC request failed");
      const body = await response.json() as { result?: { value?: Array<{ account?: { data?: { parsed?: { info?: { mint?: string; tokenAmount?: { amount?: string } } } } } }> } };
      return body.result?.value ?? [];
    }));
    return results.flat().some((item) => {
      const info = item.account?.data?.parsed?.info;
      return info?.mint === mintAddress && /^\d+$/.test(info.tokenAmount?.amount ?? "") && BigInt(info.tokenAmount!.amount!) > BigInt(0);
    });
  } catch (error) {
    console.error("Solana holder check failed", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}
