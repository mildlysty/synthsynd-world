"use client";

import { useState } from "react";
import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type Requirement = {
  scheme?: string;
  network?: string;
  amount?: string;
  asset?: string;
  payTo?: string;
  maxAmountRequired?: string;
};

function formatPayment(requirements: Requirement[]) {
  return requirements.map((item) => {
    const amount = item.amount ?? item.maxAmountRequired ?? "unknown amount";
    return `${amount} ${item.asset || "units"} on ${item.network || "unknown network"} (${item.scheme || "payment"})`;
  }).join("\n");
}

export default function X402Invoke({ endpoint, initialMethod = "GET", initialInput }: { endpoint: string; initialMethod?: string; initialInput?: Record<string, unknown> }) {
  const normalizedMethod = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].includes(initialMethod.toUpperCase()) ? initialMethod.toUpperCase() : "GET";
  const [method, setMethod] = useState(normalizedMethod);
  const [body, setBody] = useState(initialInput ? JSON.stringify(initialInput, null, 2) : "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function invoke() {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const url = new URL(endpoint);
      if (url.protocol !== "https:" || url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local") || url.hostname === "127.0.0.1" || url.hostname === "::1") throw new Error("Paid service URLs must use a public HTTPS host.");
      let requestBody: string | undefined;
      if (body.trim()) {
        const input = JSON.parse(body);
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Input must be a JSON object.");
        if (method === "GET" || method === "HEAD") {
          for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
            if (value === null || ["string", "number", "boolean"].includes(typeof value)) url.searchParams.set(key, String(value));
          }
        } else requestBody = body;
      }
      const init: RequestInit = {
        method,
        ...(requestBody ? { body: requestBody, headers: { "content-type": "application/json" } } : {}),
        credentials: "omit",
      };

      // Discover the provider's 402 terms first. The payment-capable retry only starts
      // after the user explicitly confirms the amount and network below.
      const preview = await fetch(url, init);
      if (preview.status !== 402) {
        const text = await preview.text();
        setResult(`HTTP ${preview.status}\n${text.slice(0, 12000)}`);
        return;
      }

      const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
      if (!provider) throw new Error("Install or unlock an EVM wallet to pay for this x402 service.");

      const paymentRequiredHeader = preview.headers.get("PAYMENT-REQUIRED") || preview.headers.get("X-PAYMENT-REQUIRED");
      let requirements: Requirement[] = [];
      if (paymentRequiredHeader) {
        try {
          const encoded = paymentRequiredHeader.replace(/-/g, "+").replace(/_/g, "/");
          const parsed = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
          requirements = Array.isArray(parsed.accepts) ? parsed.accepts : [];
        } catch { /* Some servers expose only protocol metadata; SDK will parse it on retry. */ }
      }
      if (requirements.length && !requirements.some((item) => item.network?.startsWith("eip155:"))) {
        throw new Error(`This service requires a payment network not supported by this connected EVM wallet.\n${formatPayment(requirements)}`);
      }
      const terms = requirements.length ? formatPayment(requirements) : "The service returned HTTP 402. The wallet will show the exact authorization before signing.";
      if (!window.confirm(`This request may authorize a payment to the service. Review the wallet prompt carefully.\n\n${terms}\n\nContinue?`)) return;

      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      const address = accounts?.[0];
      if (!address) throw new Error("No EVM account is connected.");

      const signer = {
        address: address as `0x${string}`,
        signTypedData: async (typedData: { domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }) =>
          await provider.request({ method: "eth_signTypedData_v4", params: [address, JSON.stringify(typedData)] }) as `0x${string}`,
      };
      const client = new x402Client().register("eip155:*", new ExactEvmScheme(signer));
      const paidFetch = wrapFetchWithPayment(fetch, client);
      const response = await paidFetch(url, init);
      const responseText = await response.text();
      setResult(`HTTP ${response.status}${response.ok ? " · payment accepted" : ""}\n${responseText.slice(0, 12000)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not invoke the x402 service.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-8 rounded-2xl border border-cyan-900/70 bg-zinc-950 p-5">
    <h2 className="text-lg font-semibold text-cyan-200">Paid API · x402</h2>
    <p className="mt-1 break-all text-xs text-zinc-500">{endpoint}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-[130px_1fr]">
      <select value={method} onChange={(event) => setMethod(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
        <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
      </select>
      <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={method === "GET" || method === "HEAD" ? 'Optional query parameters as JSON, e.g. {"city":"Paris"}' : 'Optional JSON body, e.g. {"input":"..."}'} className="min-h-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs sm:col-span-2" />
    </div>
    <button disabled={busy} onClick={invoke} className="mt-3 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium hover:bg-cyan-600 disabled:opacity-50">{busy ? "Connecting…" : "Invoke service"}</button>
    <p className="mt-2 text-xs text-zinc-500">The first request checks the payment terms. Your wallet is asked to sign only after you confirm. Network fees may apply; service availability and CORS are controlled by the provider.</p>
    {error && <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-rose-900 bg-rose-950/30 p-3 text-xs text-rose-200">{error}</pre>}
    {result && <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-300">{result}</pre>}
  </section>;
}
