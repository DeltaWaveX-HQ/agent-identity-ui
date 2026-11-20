"use client";

import React, { useState } from "react";
import {
  Shield,
  Network,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  Sparkles,
  Bot,
  Plug,
} from "lucide-react";
import { GO_API_BASE } from "../../lib/api";
import { AuthenticatedUser } from "../AuthScreen";
import { OrgFlowConfig } from "./types";

interface SetupFlowViewProps {
  currentUser: AuthenticatedUser;
  flows: OrgFlowConfig;
  onToggleFlow: (key: keyof OrgFlowConfig) => void;
  onRefreshState: () => void;
}

export default function SetupFlowView({
  currentUser,
  flows,
  onToggleFlow,
  onRefreshState,
}: SetupFlowViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clientTab, setClientTab] = useState<
    "mcpjam" | "claude_cursor" | "cli" | "live_llm" | "dcr_camd"
  >("mcpjam");

  // Live LLM state
  const [llmProvider, setLlmProvider] = useState<"gemini" | "claude">("gemini");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("gemini-2.5-flash");
  const [llmPrompt, setLlmPrompt] = useState(
    "Read our Q3 customer CRM records and summarize the invoices"
  );
  const [llmStatus, setLlmStatus] = useState<string | null>(null);

  // Quick DCR / CAMD test inputs
  const [dcrName, setDcrName] = useState("Salesforce CRM Assistant");
  const [camdUrl, setCamdUrl] = useState(
    "https://crm-agent.deltawavex.in/.well-known/oauth-client-metadata.json"
  );
  const [dcrFeedback, setDcrFeedback] = useState<string | null>(null);

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleRunLiveLLM(e: React.FormEvent) {
    e.preventDefault();
    setLlmStatus(
      `Calling real ${llmProvider.toUpperCase()} (${llmModel})... Watch for the live RAR Consent Popup!`
    );
    try {
      const res = await fetch(`${GO_API_BASE}/api/v1/live-llm/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: llmProvider,
          api_key: llmApiKey,
          model: llmModel,
          user_email: currentUser.email,
          prompt: llmPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLlmStatus("Error: " + (data.error || "API call failed"));
        return;
      }
      setLlmStatus("Success: " + data.message);
      onRefreshState();
    } catch {
      setLlmStatus("Error: Cannot reach Go server at http://localhost:8080");
    }
  }

  async function handleQuickDCR() {
    setDcrFeedback(null);
    const res = await fetch(`${GO_API_BASE}/oauth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: dcrName,
        owner_user: "user:" + currentUser.email,
        model_id: "claude-sonnet-4",
        scope: "crm.read invoices.read",
      }),
    });
    const data = await res.json();
    setDcrFeedback(`Registered via RFC 7591 DCR: ${data.client_id}`);
    onRefreshState();
  }

  async function handleQuickCAMD() {
    setDcrFeedback(null);
    const res = await fetch(`${GO_API_BASE}/oauth/cimd-discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata_url: camdUrl,
        owner_user: "user:" + currentUser.email,
        crm_target: "Enterprise CRM Flow",
      }),
    });
    const data = await res.json();
    setDcrFeedback(`Discovered via CIMD/CAMD: ${data.client_id || camdUrl}`);
    onRefreshState();
  }

  const enabledCount = Object.values(flows).filter(Boolean).length;

  const mcpJsonConfig = JSON.stringify(
    {
      mcpServers: {
        "agent-identity-gateway": {
          url: "http://localhost:8090/sse",
        },
      },
    },
    null,
    2
  );

  const claudeCliCmd = `claude mcp add agent-identity-gateway -- /Users/ajaykumarpagidipally/Documents/agentic_identity/agent-identity-backend/mcp-gateway --server="http://127.0.0.1:8080" --user="${currentUser.email}" --agent="Claude Code Agent"`;
  const goCliAllowCmd = `cd /Users/ajaykumarpagidipally/Documents/agentic_identity/agent-identity-backend && go run ./cmd/my-agent --user="${currentUser.email}" --agent="Finance Audit Bot" --model="gemini-2.5-pro"`;
  const goCliBlockCmd = `cd /Users/ajaykumarpagidipally/Documents/agentic_identity/agent-identity-backend && go run ./cmd/my-agent --user="${currentUser.email}" --agent="Rogue Exfil Agent" --host="evil-exfil.example" --action="export_all"`;

  const policyCards: Array<{
    key: keyof OrgFlowConfig;
    rfc: string;
    title: string;
    desc: string;
    metaLabel: string;
    metaVal: string;
    statusLabel: string;
  }> = [
    {
      key: "dcr",
      rfc: "RFC 7591",
      title: "Dynamic Client Registration (DCR)",
      desc: "Automatically register incoming ephemeral agent instances with signed client credentials and human owner binding.",
      metaLabel: "Token Lifetime",
      metaVal: "5 min (ephemeral)",
      statusLabel: "ENFORCED",
    },
    {
      key: "camd",
      rfc: "CAMD / CIMD",
      title: "Agent Identity Discovery",
      desc: "Client/Agent Metadata Document inspection for verified agent provenance before granting access.",
      metaLabel: "Discovery Path",
      metaVal: "/.well-known/oauth-protected-resource",
      statusLabel: "ACTIVE",
    },
    {
      key: "dpop",
      rfc: "RFC 9449",
      title: "DPoP Cryptographic Binding",
      desc: "Require ES256 private key possession proofs (cnf.jkt) on every request to prevent bearer token theft.",
      metaLabel: "Signing Curve",
      metaVal: "ES256 (P-256)",
      statusLabel: "REQUIRED",
    },
    {
      key: "egress",
      rfc: "RFC 9396 RAR",
      title: "Egress & Resource Allowlists",
      desc: "Block outbound agent network calls not explicitly allowlisted or declared in consented RAR tokens.",
      metaLabel: "Default Posture",
      metaVal: "*.acme.local allowlist",
      statusLabel: "STRICT FIREWALL",
    },
    {
      key: "ciba",
      rfc: "OIDC CIBA",
      title: "Human Step-Up Verification",
      desc: "Trigger real-time out-of-band approval popup when an agent attempts high-risk payment or destructive actions.",
      metaLabel: "Privileged Actions",
      metaVal: "transfer, delete, export",
      statusLabel: "PUSH ACTIVE",
    },
    {
      key: "tokenExchange",
      rfc: "RFC 8693",
      title: "Parent → Child Token Exchange",
      desc: "Mint attenuated child worker tokens carrying distinct actor claims (act) linked to the human delegator (sub).",
      metaLabel: "Cascade Revoke",
      metaVal: "< 1 ms Family DAG",
      statusLabel: "VERIFIED",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              WIZARD · RFC POSTURE
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              2-Step Connection Flow
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Agent Gateway Setup &amp; Connection Wizard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure RFC-compliant security flows and connect MCPJam, Claude,
            Gemini, or custom AI agents to your local enforcement gateway.
          </p>
        </div>
      </div>

      {/* 2-Step Progress Stepper */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            1
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Configuration
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-semibold">
                {enabledCount}/6 Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              RFC 7591 DCR, CAMD, DPoP binding, egress firewall, CIBA step-up.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-blue-50/50 border border-blue-200">
          <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
            2
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Connecting Agent
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-[10px] font-semibold">
                READY :8090
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              MCPJam SSE URL, Claude/Cursor config, CLI simulator, or live LLM
              API key.
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: Security & Protocol Configuration */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Step 1: Security &amp; Protocol Configuration
            </h2>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            OAuth 2.1 / Zero-Trust Agent IAM
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {policyCards.map((c) => {
            const on = flows[c.key];
            return (
              <div
                key={c.key}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase text-blue-600">
                        {c.rfc}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                        {c.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleFlow(c.key)}
                      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                        on ? "bg-blue-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                          on ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {c.desc}
                  </p>
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                    <span className="text-slate-400">{c.metaLabel}:</span>
                    <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[165px]">
                      {c.metaVal}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between font-mono text-[10px]">
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${
                      on ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        on ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    {on ? c.statusLabel : "DISABLED"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* STEP 2: Connect AI Agents & MCP Clients */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Step 2: Connect AI Agents &amp; MCP Clients
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            MCP Gateway Online :8090
          </span>
        </div>

        {/* Live Gateway Endpoints Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Gateway Connection Endpoints
              </h3>
              <p className="text-xs text-slate-500">
                Point MCPJam, Claude, Cursor, or any MCP 2025-11-25 OAuth client
                directly to these endpoints.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ready for OAuth + SSE Handshake
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                id: "ep-sse",
                label: "MCP Gateway SSE Endpoint (for MCPJam / Cursor)",
                value: "http://localhost:8090/sse",
              },
              {
                id: "ep-as",
                label: "OAuth 2.1 Authorization Server Discovery (RFC 8414)",
                value:
                  "http://localhost:8080/.well-known/oauth-authorization-server",
              },
            ].map((ep) => (
              <div
                key={ep.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {ep.label}
                  </div>
                  <div className="font-mono text-xs font-medium text-slate-900 truncate mt-0.5">
                    {ep.value}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(ep.id, ep.value)}
                  className="p-1.5 rounded-md hover:bg-slate-200/70 text-slate-500 hover:text-slate-900 shrink-0"
                  title="Copy URL"
                >
                  {copiedId === ep.id ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Client Integration Tabs */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-2 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1.5">
            {[
              { id: "mcpjam", label: "MCPJam Inspector", icon: Plug },
              { id: "claude_cursor", label: "Claude & Cursor", icon: Bot },
              { id: "cli", label: "CLI Agent Simulator", icon: Terminal },
              { id: "live_llm", label: "Live Gemini / Claude API", icon: Sparkles },
              { id: "dcr_camd", label: "Quick DCR / CAMD Test", icon: Shield },
            ].map((t) => {
              const Icon = t.icon;
              const active = clientTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setClientTab(t.id as typeof clientTab)
                  }
                  className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-all ${
                    active
                      ? "bg-white text-blue-700 shadow-xs border border-slate-200 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {clientTab === "mcpjam" && (
              <div className="space-y-4">
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-900">
                    Connect MCPJam Inspector (SSE + Full OAuth 2.1 Debugger)
                  </p>
                  <p>
                    1. Open MCPJam Inspector (
                    <code className="font-mono bg-slate-100 px-1 rounded">
                      npx @mcpjam/inspector@latest
                    </code>
                    ) and choose <strong>SSE</strong> transport.
                  </p>
                  <p>
                    2. Enter URL{" "}
                    <code className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                      http://localhost:8090/sse
                    </code>{" "}
                    and click <strong>Connect</strong> (or run the OAuth
                    Debugger).
                  </p>
                  <p>
                    3. Call{" "}
                    <code className="font-mono bg-slate-100 px-1 rounded">
                      read_q3_invoices
                    </code>{" "}
                    or{" "}
                    <code className="font-mono bg-rose-50 text-rose-700 px-1 rounded">
                      http_egress_fetch
                    </code>{" "}
                    — approve the live consent popup right here in your
                    dashboard!
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs flex items-center justify-between gap-3">
                  <span className="truncate">
                    npx @mcpjam/inspector@latest
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText("cmd-mcpjam", "npx @mcpjam/inspector@latest")
                    }
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] inline-flex items-center gap-1 shrink-0"
                  >
                    {copiedId === "cmd-mcpjam" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copy
                  </button>
                </div>
              </div>
            )}

            {clientTab === "claude_cursor" && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-800">
                      Claude Code (1-line CLI command)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText("cmd-claude", claudeCliCmd)}
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {copiedId === "cmd-claude" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copy
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                    {claudeCliCmd}
                  </pre>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-800">
                      Cursor / Claude Desktop / Windsurf JSON
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText("json-mcp", mcpJsonConfig)}
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {copiedId === "json-mcp" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copy JSON
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-lg bg-slate-900 text-blue-300 font-mono text-[11px] overflow-x-auto">
                    {mcpJsonConfig}
                  </pre>
                </div>
              </div>
            )}

            {clientTab === "cli" && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-emerald-700">
                      Legitimate Agent (Allowed via Gateway)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText("cli-allow", goCliAllowCmd)}
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {copiedId === "cli-allow" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copy
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                    {goCliAllowCmd}
                  </pre>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-rose-700">
                      Rogue Exfiltration Agent (Blocked + Cascading Revoke)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText("cli-block", goCliBlockCmd)}
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {copiedId === "cli-block" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copy
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-lg bg-slate-900 text-rose-300 font-mono text-[11px] overflow-x-auto">
                    {goCliBlockCmd}
                  </pre>
                </div>
              </div>
            )}

            {clientTab === "live_llm" && (
              <form onSubmit={handleRunLiveLLM} className="space-y-3.5 max-w-xl">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      LLM Provider
                    </label>
                    <select
                      value={llmProvider}
                      onChange={(e) => {
                        const v = e.target.value as "gemini" | "claude";
                        setLlmProvider(v);
                        setLlmModel(
                          v === "gemini"
                            ? "gemini-2.5-flash"
                            : "claude-3-5-sonnet-latest"
                        );
                      }}
                      className="w-full h-9 px-3 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="gemini">Google Gemini API</option>
                      <option value="claude">Anthropic Claude API</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-slate-300 font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    placeholder="Paste your Gemini or Anthropic API key..."
                    className="w-full h-9 px-3 rounded-md border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Agent Task Prompt
                  </label>
                  <input
                    type="text"
                    value={llmPrompt}
                    onChange={(e) => setLlmPrompt(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-slate-300 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Run Live Agent Through Gateway
                </button>
                {llmStatus && (
                  <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    {llmStatus}
                  </div>
                )}
              </form>
            )}

            {clientTab === "dcr_camd" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-900">
                    Test RFC 7591 Dynamic Client Registration (DCR)
                  </div>
                  <input
                    type="text"
                    value={dcrName}
                    onChange={(e) => setDcrName(e.target.value)}
                    className="w-full h-8 px-3 rounded-md border border-slate-300 bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleQuickDCR}
                    className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Register Agent via DCR
                  </button>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-900">
                    Test IETF CIMD / CAMD Discovery
                  </div>
                  <input
                    type="text"
                    value={camdUrl}
                    onChange={(e) => setCamdUrl(e.target.value)}
                    className="w-full h-8 px-3 rounded-md border border-slate-300 bg-white font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCAMD}
                    className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    Discover &amp; Onboard via CAMD
                  </button>
                </div>

                {dcrFeedback && (
                  <div className="md:col-span-2 p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs">
                    {dcrFeedback}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
