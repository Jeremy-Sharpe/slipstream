import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slipstream",
  description: "Drop the recording. Slipstream files it, drafts the follow-up, and finds companies like the one you just spoke to.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        <Shell>{children}</Shell>
        <div id="portal" />
      </body>
    </html>
  );
}
