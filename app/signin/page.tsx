"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Provider, Session } from "@supabase/supabase-js";
import { supabase } from "../../utils/supabase";

export default function SignInPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState("");
  const [showXSetupHelp, setShowXSetupHelp] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) router.replace("/dashboard");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) router.replace("/dashboard");
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function signIn(provider: Provider) {
    setError("");
    setShowXSetupHelp(false);
    setLoadingProvider(provider);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: new URL("/dashboard", window.location.origin).toString() },
    });
    if (authError) {
      if (provider === "x" && /provider|enabled|unsupported/i.test(authError.message)) {
        setError("X sign-in is not enabled in this Supabase project yet. Enable X / Twitter (OAuth 2.0) and add its Client ID and Secret under Authentication → Sign In / Providers.");
        setShowXSetupHelp(true);
      } else {
        setError(authError.message);
      }
      setLoadingProvider(null);
    }
  }

  async function signOut() {
    setError("");
    const { error: authError } = await supabase.auth.signOut();
    if (authError) setError(authError.message);
  }

  return (
    <main className="min-h-screen px-5 py-12 text-zinc-100 sm:px-8">
      <section className="mx-auto max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl shadow-purple-950/20 sm:p-10">
        <Link href="/marketplace" className="text-sm text-purple-300 hover:text-purple-200">← Marketplace</Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Synthsynd World</p>
        <h1 className="mt-3 text-3xl font-bold">{session ? "Your account" : "Sign in or create an account"}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {session
            ? "You are signed in. Use the same account across your marketplace activity."
            : "Use your Google or X account to continue. Your provider credentials stay with Supabase Auth."}
        </p>

        {session ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-black/40 p-5">
            <p className="text-sm text-zinc-400">Signed in as</p>
            <p className="mt-1 break-all font-medium">{session.user.email || session.user.user_metadata?.user_name || session.user.id}</p>
            <button onClick={signOut} className="mt-6 rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900">Sign out</button>
          </div>
        ) : (
          <div className="mt-8 grid gap-3">
            <button
              onClick={() => signIn("google")}
              disabled={loadingProvider !== null}
              className="flex min-h-12 items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-60"
            >
              <span aria-hidden="true" className="text-lg">G</span>
              {loadingProvider === "google" ? "Redirecting to Google…" : "Continue with Google"}
            </button>
            <button
              onClick={() => signIn("x")}
              disabled={loadingProvider !== null}
              className="flex min-h-12 items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-semibold transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
            >
              <span aria-hidden="true" className="text-lg">𝕏</span>
              {loadingProvider === "x" ? "Redirecting to X…" : "Continue with X"}
            </button>
          </div>
        )}

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm leading-6 text-rose-200">{showXSetupHelp ? error : `Sign-in failed: ${error}`}</p>}
        {showXSetupHelp && <a className="mt-3 inline-flex text-sm text-cyan-200 underline underline-offset-4 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" href="https://supabase.com/docs/guides/auth/social-login/auth-twitter" target="_blank" rel="noreferrer">Open Supabase’s X sign-in setup guide ↗</a>}

        {!session && <p className="mt-6 text-xs leading-5 text-zinc-500">
          Google and X must be enabled in Supabase Authentication, and this site URL must be on the Supabase redirect allow list.
        </p>}
      </section>
    </main>
  );
}
