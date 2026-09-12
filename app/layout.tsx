import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slipstream",
  description: "Every call, written into HubSpot and turned into the next lead.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-[1040px] px-8 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
