"use client";

import React, { useEffect, useState } from "react";
import AuthScreen, {
  AuthenticatedOrg,
  AuthenticatedUser,
} from "../components/AuthScreen";
import LandingPage from "../components/LandingPage";
import DashboardView from "../components/stitch/DashboardView";
import ConsentsAgentsView from "../components/stitch/ConsentsAgentsView";
import SetupFlowView from "../components/stitch/SetupFlowView";
import {
  AuditLogsView,
  GatewayPoliciesView,
  SettingsView,
} from "../components/stitch/GovernanceViews";
import {
  AuditEntry,
  NavTab,
  OrgFlowConfig,
  RegisteredAgentItem,
} from "../components/stitch/types";
import { GO_API_BASE } from "../lib/api";
import { PhonePrompt, TelemetryEvent } from "../lib/types";
import {
  Shield,
  LayoutDashboard,
  ShieldCheck,
  GitFork,
  FileText,
  Lock,
  Settings,
  ChevronRight,
  Search,
  Plus,
  Bell,
  LogOut,
  CheckCircle2,
  XCircle,
  BellRing,
  ChevronsUpDown,
} from "lucide-react";

const TAB_LABELS: Record<NavTab, string> = {
  dashboard: "Dashboard",
  "consents-agents": "Consents & Agents",
  "setup-flow": "Setup Flow",
  "audit-logs": "Audit Logs",
  "gateway-policies": "Gateway Policies",
  settings: "Settings",
};

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(
    null
  );
  const [activeOrg, setActiveOrg] = useState<AuthenticatedOrg | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>("consents-agents");

  // Live backend state (:8080)
  const [agents, setAgents] = useState<RegisteredAgentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [latestEvent, setLatestEvent] = useState<TelemetryEvent | null>(null);
  const [globalPrompt, setGlobalPrompt] = useState<PhonePrompt | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");

  const [flows, setFlows] = useState<OrgFlowConfig>({
    dcr: true,
    camd: true,
    dpop: true,
    egress: true,
    ciba: true,
    tokenExchange: true,
  });

  // Restore saved session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("agent_identity_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.user && parsed?.org) {
          setCurrentUser(parsed.user);
          setActiveOrg(parsed.org);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  async function refreshServerState() {
    try {
      const [agRes, audRes] = await Promise.all([
        fetch(`${GO_API_BASE}/api/v1/agents`),
        fetch(`${GO_API_BASE}/api/v1/audit-logs`),
      ]);
      if (agRes.ok) {
        const agData = await agRes.json();
        setAgents(Array.isArray(agData) ? agData : []);
      }
      if (audRes.ok) {
        const audData = await audRes.json();
        setAuditLogs(Array.isArray(audData) ? audData : []);
      }
    } catch {
      // ignore if backend temporarily restarting
    }
  }

  // Subscribe to real-time Go Server SSE stream once logged in
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
    const actions = globalPrompt?.requested_actions || ["read"];
    setGlobalPrompt(null);
    await fetch(`${GO_API_BASE}/api/v1/oauth/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consent_id: consentId,
        actions,
      }),
    });
    refreshServerState();
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
  }

  async function handleRevokeAgent(agentId: string) {
    await fetch(`${GO_API_BASE}/api/v1/agents/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: agentId,
        reason: "Revoked by Organization Admin via Agent Inspector",
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
  }

  function handleLogout() {
    localStorage.removeItem("agent_identity_session");
    setCurrentUser(null);
    setActiveOrg(null);
    setShowSignIn(false);
  }

  function handleToggleFlow(key: keyof OrgFlowConfig) {
    setFlows((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!currentUser || !activeOrg) {
    if (!showSignIn) {
      return <LandingPage onTryNow={() => setShowSignIn(true)} />;
    }
    return (
      <AuthScreen
        onBackToHome={() => setShowSignIn(false)}
        onSuccess={(user, org, token) => {
          setCurrentUser(user);
          setActiveOrg(org);
          setShowSignIn(false);
          localStorage.setItem(
            "agent_identity_session",
            JSON.stringify({ user, org, token })
          );
        }}
      />
    );
  }

  const activeAgentCount = agents.filter((a) => a.status === "ACTIVE").length;
  const initials = currentUser.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex">
      {/* =====================================================================
          LIVE RFC 9396 RAR CONSENT / OPENID CIBA STEP-UP MODAL
          ===================================================================== */}
      {globalPrompt && globalPrompt.type !== "dismiss" && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    {globalPrompt.type === "rar_consent"
                      ? "RFC 9396 RAR Consent Request"
                      : "OpenID CIBA Step-Up Challenge"}
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">
                    {globalPrompt.title || "Live Agent Authorization Request"}
                  </h2>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[10px] font-semibold">
                LIVE
              </span>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Agent:</span>
                <span className="font-mono font-semibold text-slate-900 text-right break-all">
                  {globalPrompt.agent_id}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Task:</span>
                <span className="text-slate-800 font-medium text-right">
                  {globalPrompt.task_description}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Resource:</span>
                <span className="font-mono text-blue-700 text-right break-all">
                  {globalPrompt.requested_resource}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Pass TTL:</span>
                <span className="font-mono text-emerald-700 font-medium">
                  5m (ES256 DPoP Bound)
                </span>
              </div>
            </div>

            {globalPrompt.type === "rar_consent" ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDenyConsent(globalPrompt.prompt_id || "")}
                  className="py-2.5 px-4 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Deny
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApproveConsent(globalPrompt.prompt_id || "")
                  }
                  className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Pass
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleResolveCiba(globalPrompt.prompt_id || "", false)
                  }
                  className="py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Deny &amp; Revoke
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleResolveCiba(globalPrompt.prompt_id || "", true)
                  }
                  className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5"
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
          LEFT SIDEBAR (260px Fixed — Stitch Enterprise Shell)
          ===================================================================== */}
      <aside className="w-[260px] bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Organization Switcher */}
          <div className="p-3.5 border-b border-slate-200">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-900 truncate leading-tight">
                    {activeOrg.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      PROD · LIVE
                    </span>
                  </div>
                </div>
              </div>
              <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </div>

          {/* Navigation Groups */}
          <nav className="p-3 space-y-5">
            <div className="space-y-1">
              <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Core Gateway
              </div>
              {[
                {
                  id: "dashboard" as NavTab,
                  label: "Dashboard",
                  icon: LayoutDashboard,
                  badge: String(activeAgentCount),
                },
                {
                  id: "consents-agents" as NavTab,
                  label: "Consents & Agents",
                  icon: ShieldCheck,
                  liveDot: true,
                },
                {
                  id: "setup-flow" as NavTab,
                  label: "Setup Flow",
                  icon: GitFork,
                  badge: "2-step",
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-all ${
                      active
                        ? "bg-blue-50 text-blue-700 font-semibold border-l-[3px] border-blue-600 pl-2"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? "text-blue-600" : "text-slate-400"
                        }`}
                      />
                      {item.label}
                    </span>
                    {item.liveDot && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                      </span>
                    )}
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                          active
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Governance &amp; Trust
              </div>
              {[
                {
                  id: "audit-logs" as NavTab,
                  label: "Audit Logs",
                  icon: FileText,
                },
                {
                  id: "gateway-policies" as NavTab,
                  label: "Gateway Policies",
                  icon: Lock,
                },
                {
                  id: "settings" as NavTab,
                  label: "Settings",
                  icon: Settings,
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-all ${
                      active
                        ? "bg-blue-50 text-blue-700 font-semibold border-l-[3px] border-blue-600 pl-2"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? "text-blue-600" : "text-slate-400"
                        }`}
                      />
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer: Gateway Status + User Profile */}
        <div className="p-3 border-t border-slate-200 space-y-2.5 bg-white">
          <div className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Gateway Online
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              &lt;1ms :8080
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {initials || "AD"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1">
                  {currentUser.name}
                </div>
                <div className="font-mono text-[10px] text-slate-500 truncate">
                  {currentUser.email}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT SHELL
          ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <span className="hidden sm:inline">Organization</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
            <span className="truncate">{activeOrg.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-semibold text-slate-900 truncate">
              {TAB_LABELS[activeTab]}
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && globalSearch.trim()) {
                    setActiveTab("audit-logs");
                  }
                }}
                placeholder="Search agents, scopes, traces..."
                className="w-full h-8 pl-8 pr-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("setup-flow")}
              className="h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Agent</span>
            </button>

            <button
              type="button"
              onClick={() => refreshServerState()}
              title="Live Consent Notifications"
              className="relative w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600"
            >
              <Bell className="w-4 h-4" />
              {globalPrompt && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Active View Canvas */}
        <main className="flex-1 px-6 lg:px-8 py-6 max-w-[1600px] w-full mx-auto">
          {activeTab === "dashboard" && (
            <DashboardView
              orgName={activeOrg.name}
              agents={agents}
              auditLogs={auditLogs}
              onRefresh={refreshServerState}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "consents-agents" && (
            <ConsentsAgentsView
              currentUser={currentUser}
              activeOrg={activeOrg}
              agents={agents}
              auditLogs={auditLogs}
              latestEvent={latestEvent}
              onRevokeAgent={handleRevokeAgent}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "setup-flow" && (
            <SetupFlowView
              currentUser={currentUser}
              flows={flows}
              onToggleFlow={handleToggleFlow}
              onRefreshState={refreshServerState}
            />
          )}

          {activeTab === "audit-logs" && (
            <AuditLogsView auditLogs={auditLogs} />
          )}

          {activeTab === "gateway-policies" && <GatewayPoliciesView />}

          {activeTab === "settings" && (
            <SettingsView
              currentUser={currentUser}
              activeOrg={activeOrg}
              onResetWorkspace={handleResetWorkspace}
            />
          )}
        </main>
      </div>
    </div>
  );
}
