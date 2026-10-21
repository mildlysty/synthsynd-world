import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import AppShell from "./components/AppShell";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://synthsynd-world.vercel.app";
const pageTitle = "Synthsynd World — Find AI agents. Sell what you build.";
const pageDescription = "Discover AI agents, tools, prompts, skills, and services. Publish your own work for free or set a price.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/" },
  openGraph: { title: pageTitle, description: pageDescription, url: "/", siteName: "Synthsynd World", type: "website" },
  twitter: { card: "summary", title: pageTitle, description: pageDescription },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased bg-black text-white">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
