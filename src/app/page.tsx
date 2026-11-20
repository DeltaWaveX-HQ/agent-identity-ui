"use client";

import React, { useState } from "react";
import CommandCenter from "../components/CommandCenter";
import RedTeamBenchmark from "../components/RedTeamBenchmark";
import BlueprintExplorer from "../components/BlueprintExplorer";
import { Shield, Terminal, BarChart3, Layers, Code2 } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<
    "command" | "benchmark" | "architecture"
  >("command");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Global Navigation Header */}
      <header className="border-b border-[#223042] bg-[#0e151f]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold tracking-tight text-white">
                  Agent Identity
                </h1>
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Google Buildathon 2026
                </span>
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hidden sm:inline-block">
                  Go 1.23 + Next.js
                </span>
              </div>
              <p className="text-xs text-slate-400">
                3-Layer OAuth 2.1 + DPoP Identity · Inline MCP/Egress Gateway ·
                Two-Stage Live Behavioral Risk Engine
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 bg-[#090d13] p-1 rounded-xl border border-[#223042]">
            <button
              onClick={() => setActiveTab("command")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "command"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              1. Live Command Center
            </button>

            <button
              onClick={() => setActiveTab("benchmark")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "benchmark"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              2. 25-Incident Benchmark &amp; Market Matrix
            </button>

            <button
              onClick={() => setActiveTab("architecture")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "architecture"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              3. Architecture &amp; NIST/OIDF Compliance
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5">
        {activeTab === "command" && <CommandCenter />}
        {activeTab === "benchmark" && <RedTeamBenchmark />}
        {activeTab === "architecture" && <BlueprintExplorer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#223042] bg-[#090d13] py-3 px-6 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>
              Two-Repo Architecture: <code>agent-identity-backend</code> (Go
              ES256 JWKS, RFC 9449 DPoP, RFC 8693, RFC 9396 RAR, CIBA) +{" "}
              <code>agent-identity-ui</code> (Next.js App Router)
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            NIST 10 Tenets · OpenID AIIM · Okta Blueprint Aligned
          </div>
        </div>
      </footer>
    </div>
  );
}
