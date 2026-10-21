# Synthsynd World

An independent AI marketplace built with Next.js, Supabase, Stripe, and Solana wallet tools. It borrows public product patterns from Swarms World but uses its own brand, data, and integrations.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the services you want to enable.
3. Apply every SQL file in `supabase/migrations` in filename order.
4. Start the app with `npm run dev` and open `http://localhost:3000`.

## Service setup

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL` must be the project base URL (`https://<project-ref>.supabase.co`), without `/rest/v1`. Configure the anon key, Google/X OAuth credentials, and local/production redirect URLs. Set the server-only service role key for secure purchase writes, paid-content delivery, holder-gated descriptions, API-key quota checks, inference credits, and moderation. Set `ADMIN_USER_IDS` to comma-separated Supabase Auth UUIDs allowed to moderate listings. Apply migrations through `202610200017_holder_gated_descriptions.sql` before using all marketplace features. API request quotas are configurable in `marketplace_api_plan_limits` (default free/pro/premium: 60/120/300 per minute and 10k/100k/1m per month).
- **x402 Bazaar:** set server-only `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` to enable live Coinbase catalog discovery at `/x402-bazaar`. Never expose these values with `NEXT_PUBLIC_` variables.
- **Creator fees and gated access:** set `JUPITER_API_KEY` for launch, market data, and creator-fee claims. Holder-gated access checks both SPL Token programs through mainnet RPC; set `SOLANA_RPC_URL` to a reliable endpoint if the public RPC is rate-limited.
- **Competition scoring:** set Vercel's `CRON_SECRET` (or `COMPETITION_CRON_SECRET`) and deploy. The included `vercel.json` schedules `/api/cron/competitions` daily at 00:00 UTC, which is compatible with Hobby. Pro projects can change the schedule to `*/5 * * * *` for five-minute samples. Scores estimate competition-period trading from samples of Jupiter's rolling 24-hour volume; only periods sampled after setup can be scored.
- **OpenAI:** Set `OPENAI_API_KEY` and `OPENAI_MODEL` to enable prompt execution and API-key inference. Prompt chat uses `PROMPT_RUN_CREDITS`; agent and swarm calls use `API_INFERENCE_CREDITS` (defaults to the prompt-run cost) and `API_INFERENCE_MAX_TOKENS` caps each generated response.
- **Stripe:** Set the secret and webhook keys, configure the Pro/Premium recurring Price IDs, enable the customer portal, and point Stripe events to `/api/stripe/webhook`.
- **Jupiter:** Set the server-only `JUPITER_API_KEY` for launch, creator-fee, and market-data APIs. The older `JUPITER_STUDIO_API_KEY` remains a fallback. The Token API keyless mode is rate-limited; a production key also covers Studio. A user signs launch and fee-claim transactions with their own connected Solana wallet; never store wallet private keys on the server.

Keep `.env.local`, service-role credentials, Stripe secrets, AI provider keys, and Jupiter keys out of source control and client-side `NEXT_PUBLIC_` variables.

The full public feature comparison and remaining parity gaps are in [docs/swarms-world-parity.md](docs/swarms-world-parity.md).
