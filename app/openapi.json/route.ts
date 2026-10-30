import { NextResponse } from "next/server";

const schema = {
  openapi: "3.1.0",
  info: { title: "Synthsynd World Marketplace API", version: "1.0.0", description: "Marketplace discovery, publishing, portfolio, reviews, API-key-backed agent and swarm inference, and MCP APIs. Inference is charged to the API key owner's credit balance." },
  servers: [{ url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000" }],
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "Synthsynd API key created in the API Keys page." } } },
  paths: {
    "/api/get-agents": { get: { summary: "List agents", parameters: ["name", "tag", "category", "language", "is_free", "min_price", "max_price", "page", "limit"].map((name) => ({ in: "query", name, schema: { type: name === "page" || name === "limit" ? "integer" : "string" } })), responses: { "200": { description: "Paginated agent listings." } } } },
    "/api/get-agents/{id}": { get: { summary: "Get an agent", parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }], responses: { "200": { description: "Agent metadata; free source is included." } } } },
    "/api/get-prompts": { get: { summary: "List prompts", responses: { "200": { description: "Paginated prompt listings." } } } },
    "/api/get-prompts/{id}": { get: { summary: "Get a prompt", responses: { "200": { description: "Prompt metadata; free body is included." } } } },
    "/api/get-tools": { get: { summary: "List tools", responses: { "200": { description: "Paginated tool listings." } } } },
    "/api/get-tools/{id}": { get: { summary: "Get a tool", responses: { "200": { description: "Tool metadata; free source is included." } } } },
    "/api/add-agent": { post: { summary: "Publish an agent", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "description", "agent"], properties: { name: { type: "string" }, description: { type: "string" }, agent: { type: "string" }, is_free: { type: "boolean" }, price_inr: { type: "number", description: "Listing price in Indian rupees" }, category: { type: "string" }, tags: { type: "array", items: { type: "string" } }, mcp_url: { type: "string" }, x402_url: { type: "string" } } } } } }, responses: { "201": { description: "Listing created." }, "401": { description: "Invalid API key." } } } },
    "/api/add-prompt": { post: { summary: "Publish a prompt", security: [{ bearerAuth: [] }], responses: { "201": { description: "Prompt created." } } } },
    "/api/edit-agent": { post: { summary: "Edit an owned agent", security: [{ bearerAuth: [] }], responses: { "200": { description: "Agent updated." } } } },
    "/api/edit-prompt": { post: { summary: "Edit an owned prompt", security: [{ bearerAuth: [] }], responses: { "200": { description: "Prompt updated." } } } },
    "/api/reviews": { get: { summary: "List reviews", responses: { "200": { description: "Review list and rating summary." } } }, post: { summary: "Create or update a review", security: [{ bearerAuth: [] }], responses: { "200": { description: "Review saved." } } } },
    "/api/search": { get: { summary: "Search marketplace listings", responses: { "200": { description: "Search results and access status." } } } },
    "/api/prompt-raw/{id}": { get: { summary: "Get a prompt as Markdown", security: [{ bearerAuth: [] }], responses: { "200": { description: "Prompt body for a free or entitled prompt." } } } },
    "/api/user-products": { post: { summary: "List products owned by the API key", security: [{ bearerAuth: [] }], responses: { "200": { description: "Owner listings." } } } },
    "/api/product/list": { get: { summary: "List products owned by the API key", security: [{ bearerAuth: [] }], responses: { "200": { description: "Owner listings." } } } },
    "/api/get-tokenized-products": { get: { summary: "List tokenized products", responses: { "200": { description: "Tokenized listings; market data depends on an indexer." } } } },
    "/api/update-token-address": { post: { summary: "Attach a Solana token to an owned listing", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["id", "tokenAddress"], properties: { id: { type: "string", format: "uuid" }, tokenAddress: { type: "string" }, tokenSymbol: { type: "string" } } } } } }, responses: { "200": { description: "Token metadata attached." }, "401": { description: "Invalid API key." }, "409": { description: "Listing already has a token address." } } } },
    "/api/swarms/agent-completions": { post: { summary: "Run one configured agent task", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["agent_config", "task"], properties: { agent_config: { type: "object" }, task: { type: "string", maxLength: 12000 }, history: { type: "array", items: { type: "object" } } } } } } }, responses: { "200": { description: "Agent output and credit usage." }, "402": { description: "Insufficient account credits." }, "429": { description: "API key quota reached." } } } },
    "/api/swarms/swarm-completions": { post: { summary: "Run 2–5 configured agents and synthesize their results", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["swarm_config", "task"], properties: { swarm_config: { type: "object", required: ["agents"], properties: { agents: { type: "array", minItems: 2, maxItems: 5, items: { type: "object" } } } }, task: { type: "string", maxLength: 12000 } } } } } }, responses: { "200": { description: "Synthesized result, individual agent outputs, and credit usage." }, "402": { description: "Insufficient account credits." }, "429": { description: "API key quota reached." } } } },
    "/api/v1/publish/bundle": { post: { summary: "Publish a bundle", security: [{ bearerAuth: [] }], responses: { "201": { description: "Bundle created." } } } },
    "/mcp": { post: { summary: "MCP JSON-RPC endpoint", security: [{ bearerAuth: [] }], responses: { "200": { description: "MCP JSON-RPC response." } } } },
  },
};

export async function GET() {
  return NextResponse.json(schema, { headers: { "Cache-Control": "public, max-age=300" } });
}
