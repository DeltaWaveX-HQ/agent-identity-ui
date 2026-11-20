import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Identity — Authorization & Enforcement Gateway",
  description:
    "Enterprise AI Agent Identity, OAuth 2.1 + PKCE + DPoP Authorization, RFC 8693 Parent→Child Delegation, and Layer 2 Enforcement Gateway.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
