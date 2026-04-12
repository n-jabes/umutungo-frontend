import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { resolveApiBaseForClientInjection } from "@/lib/api-base-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Umutungo — Asset & lease intelligence",
  description: "Manage your assets. Grow your wealth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiBase = resolveApiBaseForClientInjection();
  const apiBootstrap = `window.__UMUTUNGO_API_BASE__=${JSON.stringify(apiBase)};`;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: apiBootstrap }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
