import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

// Inter backs Open Runde (self-hosted in globals.css) for the product UI and
// is the legacy UI's sans; Geist Mono is only used by the legacy screens.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slipstream",
  description: "Drop the recording. Slipstream files it, drafts the follow-up, and finds companies like the one you just spoke to.",
};

// The root layout is deliberately bare: the product frame lives in
// app/(product)/layout.tsx and the previous UI's shell in app/legacy/layout.tsx.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
