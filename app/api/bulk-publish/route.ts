import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "../_lib/auth";

type GitHubRepo = { name: string; full_name: string; html_url: string; description: string | null; default_branch: string; owner: { login: string; avatar_url: string } };
type GitTree = { tree?: Array<{ path: string; type: string; url: string; size?: number }> };

async function githubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "Synthsynd-World-Publisher" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(response.status === 404 ? "Repository not found or not public." : `GitHub request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in to bulk publish repositories." }, { status: 401 });
  let body: { repositories?: unknown; isFree?: unknown; priceInr?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const urls = Array.isArray(body.repositories) ? body.repositories : [];
  if (!urls.length || urls.length > 10) return NextResponse.json({ error: "Provide between 1 and 10 public GitHub repository URLs." }, { status: 400 });
  const isFree = body.isFree !== false;
  const price = isFree ? 0 : Number(body.priceInr);
  if (!isFree && (!Number.isFinite(price) || price <= 0)) return NextResponse.json({ error: "Set a positive price for paid imports." }, { status: 400 });

  const results: Array<{ repo: string; id?: string; error?: string }> = [];
  for (const rawUrl of urls) {
    const submitted = typeof rawUrl === "string" ? rawUrl.trim() : "";
    let parsed: URL;
    try { parsed = new URL(submitted); } catch { results.push({ repo: submitted, error: "Enter a valid GitHub repository URL." }); continue; }
    const parts = parsed.pathname.replace(/\.git\/?$/, "").split("/").filter(Boolean);
    if (parsed.hostname !== "github.com" || parts.length !== 2 || !/^[A-Za-z0-9_.-]+$/.test(parts[0]) || !/^[A-Za-z0-9_.-]+$/.test(parts[1])) {
      results.push({ repo: submitted, error: "Only public github.com/owner/repository URLs are supported." }); continue;
    }
    const [owner, repoName] = parts;
    try {
      const repo = await githubJson<GitHubRepo>(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`);
      const tree = await githubJson<GitTree>(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`);
      const candidates = (tree.tree ?? []).filter((file) => file.type === "blob" && (file.size ?? 0) <= 80_000 && /\.(py|ts|tsx|js|jsx|md)$/i.test(file.path))
        .sort((a, b) => Number(/(^|\/)(main|agent|swarm|index)\./i.test(b.path)) - Number(/(^|\/)(main|agent|swarm|index)\./i.test(a.path)));
      const selected = candidates.slice(0, 5);
      const codeParts: string[] = [];
      for (const file of selected) {
        const fileResponse = await fetch(file.url, { headers: { Accept: "application/vnd.github.raw+json", "User-Agent": "Synthsynd-World-Publisher" }, signal: AbortSignal.timeout(12_000) });
        if (!fileResponse.ok) continue;
        const source = (await fileResponse.text()).slice(0, 20_000);
        if (source) codeParts.push(`# File: ${file.path}\n${source}`);
      }
      if (!codeParts.length) throw new Error("No supported source or Markdown files were found in the repository.");
      const listingName = text(repo.name, 120);
      const repository = `https://github.com/${repo.full_name}`;
      const { data: listing, error } = await auth.supabase.from("agents").insert({
        id: crypto.randomUUID(), owner_id: auth.user.id, user_id: auth.user.id,
        name: listingName, description: text(repo.description, 4000) || `Imported public repository ${repo.full_name}.`,
        image_url: repo.owner.avatar_url, statusType: "agent", is_free: isFree, price_inr: price,
        created_at: new Date().toISOString(), category: "Developer", language: "Python / JavaScript / TypeScript",
        tags: ["github", "repository"], agent_code: codeParts.join("\n\n"),
        links: [{ name: "GitHub repository", url: repository }],
      }).select("id").single();
      if (error || !listing) throw new Error(error?.message || "Database insert failed.");
      results.push({ repo: repository, id: listing.id });
    } catch (error) {
      results.push({ repo: submitted, error: error instanceof Error ? error.message : "Import failed." });
    }
  }
  const succeeded = results.filter((entry) => entry.id).length;
  return NextResponse.json({ success: succeeded > 0, results }, { status: succeeded === results.length ? 201 : succeeded ? 207 : 400 });
}

function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
