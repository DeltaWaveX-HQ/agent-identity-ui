"use client";

import React, { useState } from "react";
import CommandCenter from "../components/CommandCenter";
import AgentDirectory from "../components/AgentDirectory";
import OAuthPlayground from "../components/OAuthPlayground";
import PolicyAndAuditConsole from "../components/PolicyAndAuditConsole";
import RedTeamBenchmark from "../components/RedTeamBenchmark";
import BlueprintExplorer from "../components/BlueprintExplorer";
import {
  Shield,
  Terminal,
  BarChart3,
  Layers,
  Code2,
  Bot,
  KeyRound,
  FileCheck2,
  UserCheck,
} from "lucide-react";

const PERSONAS = [
  {
    email: "priya@acme.in",
    name: "Priya Sharma",
    role: "Finance Manager (End-User Principal)",
    tenant: "Acme FinTech India Ltd.",
  },
  {
    email: "admin@acme.in",
    name: "Ajay Kumar",
    role: "CISO / Identity Admin",
    tenant: "Acme FinTech India Ltd.",
  },
  {
    email: "rahul@acme.in",
    name: "Rahul Verma",
    role: "AI Platform Engineer",
    tenant: "Acme FinTech India Ltd.",
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<
    | "command"
    | "directory"
    | "oauth_sandbox"
    | "policies"
    | "benchmark"
    | "architecture"
  >("command");
  const [activePersona, setActivePersona] = useState(PERSONAS[0]);
  const [sandboxAgentId, setSandboxAgentId] = useState<string>(
    "agent:invoice-assistant"
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Enterprise IAM Header */}
      <header className="border-b border-[#223042] bg-[#0e151f]/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-lg font-bold tracking-tight text-white">
                    Agent Identity Cloud
                  </h1>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    OAuth 2.1 · DPoP · Gateway · Risk IAM
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Tenant: <b className="text-slate-200">{activePersona.tenant}</b>{" "}
                  · Issuer: <code>https://auth.agentidentity.local</code>
                </p>
              </div>
            </div>

            {/* Active Authenticated Principal Switcher (Okta / LoginRadius Tenant Bar) */}
            <div className="flex items-center gap-2 bg-[#090d13] px-3 py-1.5 rounded-xl border border-[#223042]">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] text-slate-400">Signed in as:</span>
              <select
                value={activePersona.email}
                onChange={(e) => {
                  const found = PERSONAS.find(
                    (p) => p.email === e.target.value
                  );
                  if (found) setActivePersona(found);
                }}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                {PERSONAS.map((p) => (
                  <option
                    key={p.email}
                    value={p.email}
                    className="bg-[#0e151f] text-white"
                  >
                    {p.name} ({p.email}) — {p.role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 6-Module IAM Product Navigation Bar */}
          <nav className="flex flex-wrap items-center gap-1.5 bg-[#090d13] p-1 rounded-xl border border-[#223042]">
            <button
              onClick={() => setActiveTab("command")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "command"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Live Runtime Trace &amp; CIBA
            </button>

            <button
              onClick={() => setActiveTab("directory")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "directory"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              AI Agent Directory (SPIFFE)
            </button>

            <button
              onClick={() => setActiveTab("oauth_sandbox")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "oauth_sandbox"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              OAuth 2.1 + DPoP Server Sandbox
            </button>

            <button
              onClick={() => setActiveTab("policies")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "policies"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              Cedar Policies &amp; SIEM Audit Log
            </button>

            <button
              onClick={() => setActiveTab("benchmark")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "benchmark"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              25-Incident Red-Team Suite
            </button>

            <button
              onClick={() => setActiveTab("architecture")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "architecture"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              13-Node Blueprint &amp; NIST
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5">
        {activeTab === "command" && <CommandCenter />}
        {activeTab === "directory" && (
          <AgentDirectory
            onLaunchSandboxWithAgent={(id) => {
              setSandboxAgentId(id);
              setActiveTab("oauth_sandbox");
            }}
          />
        )}
        {activeTab === "oauth_sandbox" && (
          <OAuthPlayground initialAgentId={sandboxAgentId} />
        )}
        {activeTab === "policies" && <PolicyAndAuditConsole />}
        {activeTab === "benchmark" && <RedTeamBenchmark />}
        {activeTab === "architecture" && <BlueprintExplorer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#223042] bg-[#090d13] py-3 px-6 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>
              Agent Identity IAM Platform: <code>agent-identity-backend</code>{" "}
              (Go OIDC Discovery, ES256 JWKS, RFC 9449 DPoP, RFC 8693, RFC 9396
              RAR, RFC 7662 Introspection) + <code>agent-identity-ui</code>{" "}
              (Next.js)
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
