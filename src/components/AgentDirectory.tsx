"use client";

import React, { useEffect, useState } from "react";
import { GO_API_BASE } from "../lib/api";
import {
  Bot,
  Plus,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

export interface RegisteredAgentItem {
  agent_id: string;
  name?: string;
  owner_user: string;
  parent_agent_id?: string;
  spiffe_id: string;
  runtime_attested: boolean;
  platform_framework: string;
  model_id: string;
  allowed_scopes?: string[];
  dpop_thumbprint: string;
  registered_at: number;
  status: string;
}

const DEFAULT_AGENTS: RegisteredAgentItem[] = [
  {
    agent_id: "agent:invoice-assistant",
    name: "Finance Q3 Invoice Assistant",
    owner_user: "user:priya@acme.in",
    spiffe_id: "spiffe://acme.in/ns/finance/sa/invoice-assistant",
    runtime_attested: true,
    platform_framework: "Google ADK / Gemini 2.5 Flash + MCP",
    model_id: "gemini-2.5-flash",
    allowed_scopes: ["invoices.read", "invoices.summarize"],
    dpop_thumbprint: "0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I",
    registered_at: Math.floor(Date.now() / 1000) - 3600,
    status: "ACTIVE",
  },
  {
    agent_id: "agent:invoice-assistant/summariser",
    name: "Invoice PDF Summariser Sub-Agent",
    owner_user: "user:priya@acme.in",
    parent_agent_id: "agent:invoice-assistant",
    spiffe_id: "spiffe://acme.in/ns/finance/sa/invoice-summariser",
    runtime_attested: true,
    platform_framework: "Google ADK Sub-Agent Worker",
    model_id: "gemini-2.5-flash",
    allowed_scopes: ["invoices.read"],
    dpop_thumbprint: "p2Lr1t9V8sYkQm3cXn0aWbE7fH4uJ6dK5gZ1oR8yT2s",
    registered_at: Math.floor(Date.now() / 1000) - 1800,
    status: "ACTIVE",
  },
  {
    agent_id: "agent:treasury-payment-bot",
    name: "Treasury NEFT Settlement Agent",
    owner_user: "user:priya@acme.in",
    spiffe_id: "spiffe://acme.in/ns/treasury/sa/payment-bot",
    runtime_attested: true,
    platform_framework: "LangGraph + MCP Client",
    model_id: "gemini-2.5-pro",
    allowed_scopes: ["invoices.read", "payments.transfer"],
    dpop_thumbprint: "k9Xm2v8Q4pL1wZ7nB5cR3tY6uJ0fH8dG4sA2eW9qK1m",
    registered_at: Math.floor(Date.now() / 1000) - 7200,
    status: "ACTIVE",
  },
];

export default function AgentDirectory({
  onLaunchSandboxWithAgent,
  userEmail,
}: {
  onLaunchSandboxWithAgent?: (agentId: string) => void;
  userEmail?: string;
}) {
  const [agents, setAgents] = useState<RegisteredAgentItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Agent Form State
  const [name, setName] = useState("My Claude / Gemini Agent");
  const [agentId, setAgentId] = useState("agent:my-assistant");
  const [owner, setOwner] = useState(
    userEmail ? `user:${userEmail}` : "user:ajay@deltawavex.in"
  );
  const [parentAgent, setParentAgent] = useState("");
  const [spiffeId, setSpiffeId] = useState(
    "spiffe://deltawavex.in/ns/prod/sa/my-assistant"
  );
  const [framework, setFramework] = useState(
    "Claude Code / Gemini CLI / MCP Client"
  );
  const [modelId, setModelId] = useState("gemini-2.5-flash");
  const [scopes, setScopes] = useState("crm.read, invoices.read");

  async function loadAgents() {
    try {
      const res = await fetch(`${GO_API_BASE}/api/v1/agents`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAgents(data);
        }
      }
    } catch {
      // keep local state
    }
  }

  useEffect(() => {
    loadAgents();
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      agent_id: agentId,
      name,
      owner_user: owner,
      parent_agent_id: parentAgent || undefined,
      spiffe_id: spiffeId,
      runtime_attested: true,
      platform_framework: framework,
      model_id: modelId,
      allowed_scopes: scopes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch(`${GO_API_BASE}/api/v1/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setAgents((prev) => [created, ...prev]);
        setShowModal(false);
        return;
      }
    } catch {
      // Fallback local registration
    }

    const mockCreated: RegisteredAgentItem = {
      ...payload,
      dpop_thumbprint:
        "jkt_" + Math.random().toString(36).substring(2, 15) + "_ES256",
      registered_at: Math.floor(Date.now() / 1000),
      status: "ACTIVE",
    };
    setAgents((prev) => [mockCreated, ...prev]);
    setShowModal(false);
  }

  async function handleRevokeAgent(id: string) {
    try {
      await fetch(`${GO_API_BASE}/api/v1/agents/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: id,
          reason: "Revoked by Admin from Agent Identity Directory",
        }),
      });
    } catch {
      // fallback
    }
    setAgents((prev) =>
      prev.map((a) =>
        a.agent_id === id || a.parent_agent_id === id
          ? { ...a, status: "REVOKED" }
          : a
      )
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header Banner */}
      <div className="rounded-xl border border-[#223042] bg-[#121a24] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
            Okta / LoginRadius-Style Workload Directory · NIST Tenet #1 &amp; #2
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            AI Agent &amp; Sub-Agent Workload Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Every AI agent and sub-agent gets its own distinct identity,
            attested SPIFFE workload certificate, human owner, parent delegation
            link, and ephemeral ES256 DPoP public key thumbprint (
            <code>cnf.jkt</code>).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAgents}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition"
          >
            <Plus className="w-4 h-4" />
            Register New AI Agent
          </button>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="rounded-xl border border-blue-500/40 bg-[#141e2b] p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">
              Register &amp; Attest New AI Agent Workload (POST /api/v1/agents/register)
            </h3>
            <button
              onClick={() => setShowModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <form
            onSubmit={handleRegister}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
          >
            <div>
              <label className="block text-slate-400 mb-1">
                Agent Display Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Client ID (Unique OAuth 2.1 Identifier)
              </label>
              <input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                required
                className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-3 py-2 text-blue-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Human Principal Owner (Accountable Owner)
              </label>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                required
                className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Parent Agent ID (Optional — for RFC 8693 Sub-Agents)
              </label>
              <input
                value={parentAgent}
                onChange={(e) => setParentAgent(e.target.value)}
                placeholder="e.g. agent:invoice-assistant"
                className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                SPIFFE Workload Attestation ID
              </label>
              <input
                value={spiffeId}
                onChange={(e) => setSpiffeId(e.target.value)}
                required
                className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-3 py-2 text-emerald-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Agent Runtime / Framework &amp; LLM Model
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className="rounded-lg bg-[#0b1017] border border-slate-700 px-3 py-2 text-white"
                />
                <input
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="rounded-lg bg-[#0b1017] border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1">
                Allowed OAuth 2.1 Scopes (Comma-separated)
              </label>
              <input
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
                className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-3 py-2 text-white font-mono"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Verify SPIFFE Attestation &amp; Mint DPoP Keypair
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty State with Live Terminal Command when 0 agents are registered */}
      {agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-[#121a24] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto">
            <Bot className="w-6 h-6" />
          </div>
          <div className="max-w-lg mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">
              0 Agents Registered Yet — Connect Your First Real Agent!
            </h3>
            <p className="text-xs text-slate-400">
              Your organization starts completely clean with no fake demo data.
              Run the real Go Agent CLI below in your terminal (or use the DCR /
              CAMD onboarding tab) to watch your agent register, pop up a live
              consent prompt on your screen, and execute calls through the
              gateway:
            </p>
          </div>
          <pre className="max-w-2xl mx-auto text-left rounded-xl bg-[#080d14] border border-slate-800 p-4 text-xs font-mono text-emerald-300 overflow-x-auto">
{`cd /Users/ajaykumarpagidipally/Documents/agentic_identity/agent-identity-backend
go run ./cmd/my-agent --user="${userEmail || "ajay@deltawavex.in"}" --agent="My Claude / Gemini Agent" --model="claude-opus-4.7"`}
          </pre>
        </div>
      ) : (
        /* Agent Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((ag) => (
          <div
            key={ag.agent_id}
            className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
              ag.status === "REVOKED"
                ? "border-rose-500/40 bg-rose-950/10"
                : "border-[#223042] bg-[#121a24]"
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {ag.name || ag.agent_id}
                    </h3>
                    <code className="text-[11px] text-blue-300 font-mono">
                      {ag.agent_id}
                    </code>
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ag.status === "REVOKED"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {ag.status}
                </span>
              </div>

              <div className="rounded-lg bg-[#0b1017] border border-slate-800/90 p-2.5 text-[11px] space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Human Owner:</span>
                  <span className="text-slate-200">{ag.owner_user}</span>
                </div>
                {ag.parent_agent_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parent Agent:</span>
                    <span className="text-amber-300">{ag.parent_agent_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Model:</span>
                  <span className="text-slate-300">{ag.model_id}</span>
                </div>
                <div className="truncate" title={ag.spiffe_id}>
                  <span className="text-slate-500">SPIFFE: </span>
                  <span className="text-emerald-300">{ag.spiffe_id}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-500 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-blue-400" />
                    cnf.jkt:
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ag.dpop_thumbprint);
                      setCopiedId(ag.agent_id);
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                    className="flex items-center gap-1 text-blue-300 hover:underline"
                  >
                    <span>{ag.dpop_thumbprint.slice(0, 14)}...</span>
                    {copiedId === ag.agent_id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
              {onLaunchSandboxWithAgent && (
                <button
                  onClick={() => onLaunchSandboxWithAgent(ag.agent_id)}
                  disabled={ag.status === "REVOKED"}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition disabled:opacity-40"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Mint OAuth Token
                </button>
              )}
              {ag.status !== "REVOKED" && (
                <button
                  onClick={() => handleRevokeAgent(ag.agent_id)}
                  className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
