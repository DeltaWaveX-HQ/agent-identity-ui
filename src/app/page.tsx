"use client";

import React, { useState, useEffect } from "react";
import AuthScreen, {
  AuthenticatedUser,
  AuthenticatedOrg,
} from "../components/AuthScreen";
import CiampControlGallery from "../components/CiampControlGallery";
import CommandCenter from "../components/CommandCenter";
import AgentDirectory from "../components/AgentDirectory";
import OAuthPlayground from "../components/OAuthPlayground";
import PolicyAndAuditConsole from "../components/PolicyAndAuditConsole";
import RedTeamBenchmark from "../components/RedTeamBenchmark";
import BlueprintExplorer from "../components/BlueprintExplorer";
import { GO_API_BASE } from "../lib/api";
import { PhonePrompt, TelemetryEvent } from "../lib/types";
import {
  Rocket,
  Layers,
  Lock,
  KeyRound,
  Shield,
  Workflow,
  BookOpen,
  User,
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  CheckCircle2,
  LogOut,
  Trash2,
  BellRing,
  XCircle,
} from "lucide-react";

type NavView =
  | "getting_started"
  | "applications"
  | "camd_dcr_crm"
  | "oauth_sandbox"
  | "attack_protection"
  | "policies_siem"
  | "runtime_trace"
  | "benchmark"
  | "architecture";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(
    null
  );
  const [orgs, setOrgs] = useState<AuthenticatedOrg[]>([]);
  const [activeOrg, setActiveOrg] = useState<AuthenticatedOrg | null>(null);
  const [activeView, setActiveView] = useState<NavView>("attack_protection");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentCount, setAgentCount] = useState<number>(0);
  const [sandboxAgentId, setSandboxAgentId] = useState<string>(
    "agent:my-assistant"
  );

  // Global Real-Time Consent / CIBA Notification Modal (pops up on ANY tab when an external Claude/Gemini agent connects!)
  const [globalPrompt, setGlobalPrompt] = useState<PhonePrompt | null>(null);

  // Accordion groups matching screenshot
  const [securityOpen, setSecurityOpen] = useState(true);
  const [authzOpen, setAuthzOpen] = useState(true);
  const [orchOpen, setOrchOpen] = useState(true);

  async function refreshAgentCount() {
    try {
      const res = await fetch(`${GO_API_BASE}/api/v1/agents`, {
        signal: AbortSignal.timeout(1200),
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) setAgentCount(list.length);
      }
    } catch {
      // ignore
    }
  }

  // Restore session from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem("agent_identity_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.user && parsed.org) {
          setCurrentUser(parsed.user);
          setActiveOrg(parsed.org);
          setOrgs([parsed.org]);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Global SSE Listener so when the user runs `go run ./cmd/my-agent` in their terminal,
  // the agent count updates and the Live Consent Approval Modal pops up immediately on their screen!
  useEffect(() => {
    if (!currentUser) return;
    refreshAgentCount();

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${GO_API_BASE}/api/v1/events/stream`);
      es.onmessage = (msg) => {
        try {
          const ev: TelemetryEvent = JSON.parse(msg.data);
          refreshAgentCount();
          if (ev.phone_prompt) {
            setGlobalPrompt(
              ev.phone_prompt.type === "dismiss" ? null : ev.phone_prompt
            );
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

  async function handleGlobalApproveConsent(consentId: string) {
    setGlobalPrompt(null);
    await fetch(`${GO_API_BASE}/api/v1/oauth/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consent_id: consentId,
        actions: globalPrompt?.requested_actions || ["read"],
      }),
    });
    refreshAgentCount();
  }

  async function handleGlobalDenyConsent(consentId: string) {
    setGlobalPrompt(null);
    await fetch(`${GO_API_BASE}/api/v1/consents/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent_id: consentId }),
    });
  }

  async function handleGlobalResolveCiba(authReqId: string, approved: boolean) {
    setGlobalPrompt(null);
    await fetch(`${GO_API_BASE}/api/v1/oauth/ciba-resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_req_id: authReqId, approved }),
    });
  }

  async function handleCreateOrganization(orgName: string, domain: string) {
    try {
      const res = await fetch(`${GO_API_BASE}/api/v1/orgs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_email: currentUser?.email || "",
          org_name: orgName,
          org_domain: domain,
        }),
      });
      if (res.ok) {
        const created: AuthenticatedOrg = await res.json();
        setOrgs((prev) => [created, ...prev]);
        setActiveOrg(created);
        setAgentCount(0);
        return;
      }
    } catch {
      // fallback
    }
    const slug = orgName.toLowerCase().replace(/\s+/g, "-");
    const created: AuthenticatedOrg = {
      id: "org_" + slug,
      name: orgName,
      slug,
      domain,
      owner_email: currentUser?.email || "",
    };
    setOrgs((prev) => [created, ...prev]);
    setActiveOrg(created);
    setAgentCount(0);
  }

  async function handleClearWorkspace() {
    try {
      await fetch(`${GO_API_BASE}/api/v1/workspace/reset`, { method: "POST" });
    } catch {
      // ignore
    }
    setAgentCount(0);
    setGlobalPrompt(null);
  }

  function handleLogout() {
    localStorage.removeItem("agent_identity_session");
    setCurrentUser(null);
    setActiveOrg(null);
  }

  // 1. If not logged in, show the Real Login / Create Organization Screen!
  if (!currentUser || !activeOrg) {
    return (
      <AuthScreen
        onSuccess={(user, org, token) => {
          setCurrentUser(user);
          setActiveOrg(org);
          setOrgs([org]);
          setAgentCount(0);
          localStorage.setItem(
            "agent_identity_session",
            JSON.stringify({ user, org, token })
          );
        }}
      />
    );
  }

  const isLightGalleryView =
    activeView === "attack_protection" ||
    activeView === "camd_dcr_crm" ||
    activeView === "getting_started";

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 font-sans">
      {/* GLOBAL REAL-TIME CONSENT / CIBA POPUP OVERLAY (Fires whenever your terminal/Claude/Gemini agent calls /oauth/authorize) */}
      {globalPrompt && globalPrompt.type !== "dismiss" && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-blue-500 bg-white text-slate-900 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <BellRing className="w-5 h-5 animate-bounce" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">
                  {globalPrompt.type === "rar_consent"
                    ? "Incoming Live Agent Consent Request (RFC 9396 RAR)"
                    : "Incoming OpenID CIBA Step-Up Push"}
                </span>
              </div>
              <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-semibold">
                Risk: {globalPrompt.risk_score?.toFixed(2) || "0.12"}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Agent <code className="text-blue-600">{globalPrompt.agent_id}</code>{" "}
                is requesting access
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Accountable Principal: <b>{currentUser.email}</b> · Organization:{" "}
                <b>{activeOrg.name}</b>
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs space-y-2">
              <div>
                <span className="text-slate-500 font-medium">Stated Task:</span>{" "}
                <span className="text-slate-900 font-semibold">
                  &ldquo;{globalPrompt.task_description}&rdquo;
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">
                  Target Resource:
                </span>{" "}
                <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                  {globalPrompt.requested_resource}
                </code>
              </div>
              <div>
                <span className="text-slate-500 font-medium">
                  Requested Actions:
                </span>{" "}
                <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                  {globalPrompt.requested_actions?.join(", ") || "read"}
                </code>
              </div>
              <div>
                <span className="text-slate-500 font-medium">
                  Token Binding:
                </span>{" "}
                <span className="text-slate-800">
                  {globalPrompt.ttl_display || "5 minutes · ES256 DPoP Bound"}
                </span>
              </div>
            </div>

            {globalPrompt.type === "rar_consent" ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() =>
                    handleGlobalDenyConsent(globalPrompt.prompt_id || "")
                  }
                  className="py-2.5 px-4 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <XCircle className="w-4 h-4" />
                  Deny Request
                </button>
                <button
                  onClick={() =>
                    handleGlobalApproveConsent(globalPrompt.prompt_id || "")
                  }
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Pass
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() =>
                    handleGlobalResolveCiba(globalPrompt.prompt_id || "", false)
                  }
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <XCircle className="w-4 h-4" />
                  Deny &amp; Revoke
                </button>
                <button
                  onClick={() =>
                    handleGlobalResolveCiba(globalPrompt.prompt_id || "", true)
                  }
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve CIBA Step-Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR — Exact Match to Uploaded CIAM Platform Screenshot */}
      <aside
        className={`${
          sidebarCollapsed ? "w-16" : "w-64"
        } shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between transition-all duration-200 sticky top-0 h-screen z-30 select-none`}
      >
        <div className="p-3.5 space-y-3 overflow-y-auto">
          {/* Top Organization Switcher Header */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                <Building2 className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && (
                <select
                  value={activeOrg.id}
                  onChange={(e) => {
                    const found = orgs.find((o) => o.id === e.target.value);
                    if (found) setActiveOrg(found);
                  }}
                  className="font-semibold text-sm text-slate-900 bg-transparent focus:outline-none cursor-pointer truncate pr-2"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.slug || o.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={() => setActiveView("getting_started")}
                title="Organization Settings"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Box (`Search ⌘K`) */}
          {!sidebarCollapsed && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search flows, DCR, CAMD..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-8 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                ⌘K
              </span>
            </div>
          )}

          {/* Primary Navigation Tree */}
          <nav className="space-y-1 text-[13px]">
            <button
              onClick={() => setActiveView("getting_started")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition ${
                activeView === "getting_started"
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Rocket className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Getting Started</span>}
            </button>

            <button
              onClick={() => setActiveView("applications")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition ${
                activeView === "applications"
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>Applications &amp; Agents</span>}
              </span>
              {!sidebarCollapsed && (
                <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200">
                  {agentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveView("camd_dcr_crm")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition ${
                activeView === "camd_dcr_crm"
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>Authentication (DCR/CAMD)</span>}
              </span>
              {!sidebarCollapsed && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Authorization Group */}
            <div>
              <button
                onClick={() => setAuthzOpen(!authzOpen)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Authorization</span>}
                </span>
                {!sidebarCollapsed &&
                  (authzOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  ))}
              </button>
              {authzOpen && !sidebarCollapsed && (
                <div className="ml-4 pl-3 border-l-2 border-slate-200 space-y-1 mt-1">
                  <button
                    onClick={() => setActiveView("oauth_sandbox")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition ${
                      activeView === "oauth_sandbox"
                        ? "text-blue-600 font-semibold bg-blue-50/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    OAuth 2.1 + DPoP Sandbox
                  </button>
                  <button
                    onClick={() => setActiveView("policies_siem")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition ${
                      activeView === "policies_siem"
                        ? "text-blue-600 font-semibold bg-blue-50/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cedar Policies &amp; RAR
                  </button>
                </div>
              )}
            </div>

            {/* Security Group */}
            <div>
              <button
                onClick={() => setSecurityOpen(!securityOpen)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold transition ${
                  activeView === "attack_protection" ||
                  activeView === "benchmark"
                    ? "bg-blue-50/80 text-blue-600"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 shrink-0 text-blue-600" />
                  {!sidebarCollapsed && <span>Security</span>}
                </span>
                {!sidebarCollapsed &&
                  (securityOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  ))}
              </button>

              {securityOpen && !sidebarCollapsed && (
                <div className="ml-4 pl-3 border-l-2 border-blue-600 space-y-1 mt-1">
                  <button
                    onClick={() => setActiveView("attack_protection")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition ${
                      activeView === "attack_protection"
                        ? "text-blue-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Attack Protection &amp; DCR
                  </button>
                  <button
                    onClick={() => setActiveView("camd_dcr_crm")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition ${
                      activeView === "camd_dcr_crm"
                        ? "text-blue-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    CAMD &amp; CRM Agent Flows
                  </button>
                  <button
                    onClick={() => setActiveView("runtime_trace")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition ${
                      activeView === "runtime_trace"
                        ? "text-blue-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Live Agent Telemetry Trace
                  </button>
                  <button
                    onClick={() => setActiveView("policies_siem")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition ${
                      activeView === "policies_siem"
                        ? "text-blue-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Privacy, RAR &amp; Audit Log
                  </button>
                  <button
                    onClick={() => setActiveView("benchmark")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition ${
                      activeView === "benchmark"
                        ? "text-blue-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    2026 Incident Red-Team
                  </button>
                </div>
              )}
            </div>

            {/* Orchestration Group */}
            <div>
              <button
                onClick={() => setOrchOpen(!orchOpen)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <Workflow className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Orchestration</span>}
                </span>
                {!sidebarCollapsed &&
                  (orchOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  ))}
              </button>
              {orchOpen && !sidebarCollapsed && (
                <div className="ml-4 pl-3 border-l-2 border-slate-200 space-y-1 mt-1">
                  <button
                    onClick={() => setActiveView("runtime_trace")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition ${
                      activeView === "runtime_trace"
                        ? "text-blue-600 font-semibold bg-blue-50/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Live Agent Trace &amp; CIBA
                  </button>
                  <button
                    onClick={() => setActiveView("architecture")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition ${
                      activeView === "architecture"
                        ? "text-blue-600 font-semibold bg-blue-50/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    13-Node Blueprint &amp; NIST
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Bottom Docs / Authenticated User Profile / Sign Out */}
        <div className="p-3.5 border-t border-slate-200 space-y-2 text-xs text-slate-600">
          <a
            href={`${GO_API_BASE}/.well-known/openid-configuration`}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-500" />
              {!sidebarCollapsed && <span>OIDC Discovery Docs</span>}
            </span>
            {!sidebarCollapsed && <span className="text-slate-400">↗</span>}
          </a>

          {!sidebarCollapsed && (
            <div className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900 truncate">
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{currentUser.name}</span>
                </span>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="text-rose-600 hover:text-rose-800 p-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate">
                {currentUser.email}
              </div>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span>← Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Breadcrumb Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-900">
              {activeOrg.slug || activeOrg.name}
            </span>
            <span>/</span>
            <span className="font-mono text-slate-500">{activeOrg.domain}</span>
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Listening for Your Live Agents (:8080)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearWorkspace}
              title="Wipe all agents & logs for a fresh test"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Workspace (0 Agents)
            </button>
            <button
              onClick={() => setActiveView("attack_protection")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeView === "attack_protection"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              CIAM Flows &amp; DCR
            </button>
            <button
              onClick={() => setActiveView("applications")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeView === "applications"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              My Agents ({agentCount})
            </button>
            <button
              onClick={() => setActiveView("runtime_trace")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeView === "runtime_trace"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Live Agent Trace
            </button>
          </div>
        </header>

        {/* Body Container */}
        <main
          className={`flex-1 p-6 sm:p-8 ${
            isLightGalleryView
              ? "bg-[#F8FAFC] text-slate-900"
              : "bg-[#0b1017] text-[#e5ecf4]"
          }`}
        >
          <div className="max-w-6xl mx-auto">
            {(activeView === "attack_protection" ||
              activeView === "camd_dcr_crm" ||
              activeView === "getting_started") && (
              <CiampControlGallery
                activeSection={activeView}
                organizationName={activeOrg.slug || activeOrg.name}
                userEmail={currentUser.email}
                onCreateOrganization={handleCreateOrganization}
                agentCount={agentCount}
                onAgentAutoRegistered={() => {
                  refreshAgentCount();
                }}
              />
            )}

            {activeView === "applications" && (
              <AgentDirectory
                userEmail={currentUser.email}
                onLaunchSandboxWithAgent={(id) => {
                  setSandboxAgentId(id);
                  setActiveView("oauth_sandbox");
                }}
              />
            )}

            {activeView === "oauth_sandbox" && (
              <OAuthPlayground initialAgentId={sandboxAgentId} />
            )}

            {activeView === "policies_siem" && <PolicyAndAuditConsole />}

            {activeView === "runtime_trace" && <CommandCenter />}

            {activeView === "benchmark" && <RedTeamBenchmark />}

            {activeView === "architecture" && <BlueprintExplorer />}
          </div>
        </main>
      </div>
    </div>
  );
}
