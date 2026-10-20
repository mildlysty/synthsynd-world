import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Sidebar from "./components/Sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "Synthsynd World", description: "Web3 AI Marketplace" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 ml-0 lg:ml-64">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
