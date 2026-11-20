import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Identity · 3-Layer Agentic Authorization & Runtime Security",
  description:
    "Google Buildathon 2026 Prototype: OAuth 2.1 + DPoP Identity, Inline Enforcement Gateway, and Two-Stage Live Behavioral Risk Engine for AI Agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0b1017] text-[#e5ecf4] antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
