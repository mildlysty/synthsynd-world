# Swarms World feature map and Synthsynd status

This checklist is based on Swarms World's current public feature map at [swarms.world/llms.txt](https://swarms.world/llms.txt), its published [OpenAPI specification](https://swarms.world/openapi.json), and this repository's current source. Authenticated-only screens, private account flows, and changing on-chain behavior need live account access and provider configuration to verify. This project is an independent implementation using its own data, branding, and infrastructure.

## Implemented in the app

- Marketplace registry at `/` and `/platform/registry`: search, listing-type filters, cards, paging, bookmarks.
- Listing types: agents, prompts, tools, skills, MCP servers, and bundles.
- Account sign-in via Supabase OAuth providers (Google and X), creator profiles, profile editing, and owner-only publishing/editing.
- Free listing content, paid listing metadata, reviews, and prompt chat. Prompt runs call a server-only model provider and are limited to 10 per account per minute.
- API keys: create, reveal once, list, revoke, hash at rest; atomic per-key request quota enforcement by the account's active plan; configurable minute/month limits; usage page and public listing/leaderboard endpoints.
- Swarms-compatible REST routes for agent/prompt/tool discovery, publish/edit, reviews, prompt Markdown, owner product lists, tokenized-listing metadata, bundle publishing, and OpenAPI at `/openapi.json`.
- API-key-backed inference compatibility endpoints for one agent and a 2–5-agent parallel run with synthesis, provider-configured inference, usage accounting, and credit debits/refunds. These use the configured OpenAI-compatible chat model rather than executing the Swarms Python runtime.
- Admin listing moderation with server-side UUID allowlisting, public visibility controls, and an append-only audit log.
- API-key compatibility endpoint to attach a valid Solana token address to an owned listing, with owner checks and duplicate-token protection.
- Bulk import of up to 10 public GitHub repositories per request.
- Subscription Checkout and customer billing portal for Pro/Premium Stripe Price objects.
- API credit wallet, Stripe top-ups, append-only credit ledger, and prompt-run debits/refunds.
- Competition entry submission for creators' own tokenized listings, with indicative current 24-hour volume/market-cap rankings for entered tokens.
- Jupiter Studio token launch workflow for owners: unsigned transaction creation, presigned image/metadata upload, wallet signature, server submission, and listing token metadata update. The API key remains server-side.
- Read-only MCP server at `/mcp` with `search_marketplace` and `get_listing` tools.
- Stripe Connect seller onboarding, destination-charge Checkout sessions, 10% default marketplace fee, purchase records, and webhook-based fulfillment.
- x402 invocation for listings with a configured service URL: discovers HTTP 402 terms, requires explicit user confirmation, and signs EVM exact-scheme payments through the connected browser wallet.
- x402 Bazaar search through Coinbase CDP discovery: lists/searches indexed services, shows payment metadata and usage quality, and can invoke HTTP services with the wallet-confirmed x402 flow.
- Paid bundle Checkout with purchase records and bundle membership content entitlements.
- Competition records, leaderboard, Frenzy, token screener, agent economy, tokenization-pricing information, and bundle composition pages.
- Server-only content retrieval with purchase/owner checks; public clients receive listing metadata only.

## External setup still required

1. Configure Supabase URL and anon key, the server-only service role key, and the `ADMIN_USER_IDS` allowlist in local/deployment environment variables.
2. Apply migrations `202610200001_mcp_server_url.sql` through `202610200015_marketplace_moderation.sql` in order. Review migration 002's policy replacement for `public.agents` against any policies your project needs to retain. Migrations 004, 010 and 011 grant listing owners permission to store launch metadata.
3. Enable Google and X OAuth in Supabase Auth and configure the callback/redirect URLs for local and production domains.
4. Add an OpenAI API key and model name if you want prompt and API-key inference.
5. Create/approve a Stripe Connect platform, add test/live secret keys and Pro/Premium recurring Stripe Price IDs, and configure the Stripe webhook at `/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.expired`, `account.updated`, `customer.subscription.updated`, and `customer.subscription.deleted`. Set the webhook signing secret and configure the Billing Portal in Stripe. Connect onboarding depends on Stripe availability for each seller's country.
6. Set the production site URL/allowed redirect origins, `MARKETPLACE_FEE_PERCENT`, and `PROMPT_RUN_CREDITS` as appropriate for the platform's commercial terms.
7. Add a Jupiter Developer Platform API key as the server-only `JUPITER_API_KEY` for Studio and token-market endpoints. `JUPITER_STUDIO_API_KEY` remains a compatibility fallback. Token creators need a compatible connected Solana wallet with enough SOL for network/launch costs. Review the transaction and economics before signing; a successful external launch followed by a database update failure requires using the authenticated `/api/solana/launch/attach` recovery endpoint.
8. Create a Coinbase Developer Platform API key and set server-only `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` to enable x402 Bazaar discovery. Do not prefix either value with `NEXT_PUBLIC_`.

## Not yet equivalent to Swarms World

- Token launch, creator-fee claims, and current token market metrics use Jupiter with wallet signatures where required. Holder-gated vaults, refunds/disputes, historical competition-period market snapshots, and prize payouts are not implemented. Competition leaderboards are indicative current snapshots, not historical results. Token launch success depends on external API availability and the user's wallet signature; inspect the resulting transaction and do not assume pricing presets guarantee the provider's final on-chain fee values.
- Creator subscriptions, refunds/disputes, tax, and seller statements need separate product and ledger logic.
- x402 invocation currently supports EVM exact-scheme payment in a browser-injected wallet. Solana x402 payment schemes, a built-in payment facilitator, and CDP's own Bazaar MCP tool-call proxy are not included. Provider CORS policy controls whether direct browser invocation works. The public map also documents richer account and agent-usage endpoints, payout reporting, richer metadata write validation, and parity with Swarms' private API entitlement policies; these remain. Synthsynd's API quota defaults are configurable and are not claimed to match Swarms' private limits.
- The inference routes do not yet match the full public Swarms inference contract: there is no image input or streaming response, and swarm execution is a bounded parallel fan-out followed by a synthesis pass.
- Public product surfaces such as the Swarm Economy, Foundry program, support/policy pages, and internal micro-agent catalog still need Synthsynd-specific product equivalents.
- Competition entries and indicative current 24-hour volume/market-cap ranking are implemented; historical period scoring, judging, official winner records, and prize payout are not.
- Token market data is from Jupiter Tokens V2; marketplace sales analytics and creator volume are separate and need a marketplace activity indexer.
- The published Swarms API and pages informed the navigation/features, but this app does not copy Swarms' private data, source, credentials, or brand assets.

## Environment variables

Copy `.env.example` to `.env.local` and fill it with your own credentials. Never prefix service-role, Stripe, or model-provider secrets with `NEXT_PUBLIC_`.
