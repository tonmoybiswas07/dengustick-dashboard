import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import ThemeProvider from "@/components/dashboard/providers/ThemeProvider";

const geistSans = localFont({
  variable: "--font-geist-sans",
  src: "../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  weight: "100 900",
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: "../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "DengueStick | Surveillance Dashboard",
  description:
    "AI-powered mosquito larvae detection and surveillance platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={<main aria-busy="true" className="p-6">Loading…</main>}>
            {children}
          </Suspense>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}