"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  name: string;
  task?: string | null;
  steps?: unknown;
  result?: string | null;
};

export default function AgentDemo({ name, task, steps, result }: Props) {
  const [copied, setCopied] = useState(false);
  const sampleSteps = Array.isArray(steps)
    ? steps.filter((step): step is string => typeof step === "string" && step.trim().length > 0).slice(0, 8)
    : [];

  if (!task?.trim() || !result?.trim() || sampleSteps.length === 0) return null;

  async function copyTask() {
    try {
      await navigator.clipboard.writeText(task || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby="agent-demo-title" className="mt-8 rounded-2xl border border-cyan-900/60 bg-gradient-to-br from-cyan-950/20 via-zinc-950 to-purple-950/20 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Creator example · not a live run</p>
          <h2 id="agent-demo-title" className="mt-2 text-xl font-bold text-zinc-100">Build with {name}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">See one way this agent can be used, then adapt the idea to your own work.</p>
        </div>
        <button type="button" onClick={copyTask} className="min-h-10 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-100 hover:border-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
          {copied ? "Task copied" : "Copy sample task"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">Sample task</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{task}</p>
          <h3 className="mt-5 text-sm font-semibold text-zinc-200">Example workflow</h3>
          <ol className="mt-2 space-y-2">
            {sampleSteps.map((step, index) => <li key={`${index}-${step}`} className="flex gap-3 text-sm leading-6 text-zinc-300"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-cyan-900 bg-cyan-950/50 text-xs text-cyan-200">{index + 1}</span><span>{step}</span></li>)}
          </ol>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">Example result</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{result}</p>
          <p className="mt-4 border-t border-zinc-800 pt-3 text-xs leading-5 text-zinc-500">This example was provided by the creator. It is a walkthrough, not an execution of the agent, and results may differ for your use case.</p>
          <Link href="/create?type=agent" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300">Publish your own agent <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
      </div>
    </section>
  );
}
