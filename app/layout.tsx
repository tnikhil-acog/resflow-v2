import React from "react";
import type { Metadata } from "next";

import Link from "next/link";
import "./globals.css";

import {
  Libre_Baskerville as V0_Font_Libre_Baskerville,
  IBM_Plex_Mono as V0_Font_IBM_Plex_Mono,
  Lora as V0_Font_Lora,
} from "next/font/google";

// Initialize fonts
const _libreBaskerville = V0_Font_Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
});
const _ibmPlexMono = V0_Font_IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});
const _lora = V0_Font_Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Work Management System",
  description: "Enterprise platform for work management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link
                href="/tasks"
                className="text-xl font-serif font-bold text-primary"
              >
                WMS
              </Link>
              <div className="flex gap-8">
                <Link
                  href="/tasks"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Tasks
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/projects"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Projects
                </Link>
                <Link
                  href="/employees"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Employees
                </Link>
                <Link
                  href="/logs"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Logs
                </Link>
                <Link
                  href="/reports"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Reports
                </Link>
                <Link
                  href="/skills"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Skills
                </Link>
                <Link
                  href="/approvals"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Approvals
                </Link>
                <Link
                  href="/demands"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Demands
                </Link>
                <Link
                  href="/audit"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Audit
                </Link>
                <Link
                  href="/allocations"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Allocations
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
