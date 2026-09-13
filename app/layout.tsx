import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Frame } from "@/components/Frame";
import { Sidebar } from "@/components/Sidebar";
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
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <Frame>{children}</Frame>
          </main>
        </div>
        <div id="portal" />
      </body>
    </html>
  );
}
