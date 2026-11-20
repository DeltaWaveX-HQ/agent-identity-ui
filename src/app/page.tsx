"use client";

import React, { useState, useEffect } from "react";
import CiampControlGallery from "../components/CiampControlGallery";
import CommandCenter from "../components/CommandCenter";
import AgentDirectory from "../components/AgentDirectory";
import OAuthPlayground from "../components/OAuthPlayground";
import PolicyAndAuditConsole from "../components/PolicyAndAuditConsole";
import RedTeamBenchmark from "../components/RedTeamBenchmark";
import BlueprintExplorer from "../components/BlueprintExplorer";
import { GO_API_BASE } from "../lib/api";
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
} from "lucide-react";

interface OrgTenant {
  id: string;
  name: string;
  domain: string;
  env: string;
}

const INITIAL_ORGS: OrgTenant[] = [
  {
    id: "org_ajay_test",
    name: "ajay-test",
    domain: "ajay-test.agentidentity.in",
    env: "Production",
  },
  {
    id: "org_acme_fintech",
    name: "acme-fintech-india",
    domain: "acme.in",
    env: "Production",
  },
  {
    id: "org_deltawavex",
    name: "deltawavex-hq",
    domain: "deltawavex.io",
    env: "Staging",
  },
];

const PERSONAS = [
  {
    email: "priya@acme.in",
    name: "Priya Sharma",
    role: "Finance Manager",
  },
  {
    email: "admin@acme.in",
    name: "Ajay Kumar (Org Owner)",
    role: "CISO / IAM Architect",
  },
  {
    email: "rahul@acme.in",
    name: "Rahul Verma",
    role: "AI Platform Engineer",
  },
];

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
  const [orgs, setOrgs] = useState<OrgTenant[]>(INITIAL_ORGS);
  const [activeOrg, setActiveOrg] = useState<OrgTenant>(INITIAL_ORGS[0]);
  const [activePersona, setActivePersona] = useState(PERSONAS[1]);
  const [activeView, setActiveView] = useState<NavView>("attack_protection");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentCount, setAgentCount] = useState<number>(3);
  const [sandboxAgentId, setSandboxAgentId] = useState<string>(
    "agent:invoice-assistant"
  );

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
      // keep count
    }
  }

  useEffect(() => {
    refreshAgentCount();
  }, []);

  function handleCreateOrganization(orgName: string, domain: string) {
    const slug = orgName.toLowerCase().replace(/\s+/g, "-");
    const created: OrgTenant = {
      id: "org_" + slug,
      name: slug,
      domain,
      env: "Production",
    };
    setOrgs((prev) => [created, ...prev]);
    setActiveOrg(created);
  }

  // Determine whether the active view is one of the light-mode CIAM views or the dark-mode technical instrument views
  const isLightGalleryView =
    activeView === "attack_protection" ||
    activeView === "camd_dcr_crm" ||
    activeView === "getting_started";

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 font-sans">
      {/* LEFT SIDEBAR — Exact Match to Uploaded CIAM Platform Screenshot */}
      <aside
        className={`${
          sidebarCollapsed ? "w-16" : "w-64"
        } shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between transition-all duration-200 sticky top-0 h-screen z-30 select-none`}
      >
        <div className="p-3.5 space-y-3 overflow-y-auto">
          {/* Top Organization Switcher Header (`ajay-test` + gear icon) */}
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
                      {o.name}
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
            {/* Getting Started */}
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

            {/* Applications (AI Agent Directory) */}
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

            {/* Authentication (DCR & CAMD Auto-Registration) */}
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

            {/* Security Group (Highlighted with Blue Accent Line exactly like Screenshot!) */}
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
                    Risk-Based Authentication
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
                    Live 17-Step Agent Trace
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

        {/* Bottom Docs / Profile / Collapse Section (Matches Screenshot Footer) */}
        <div className="p-3.5 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
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
            <div className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Profile Principal</span>
              </div>
              <select
                value={activePersona.email}
                onChange={(e) => {
                  const found = PERSONAS.find(
                    (p) => p.email === e.target.value
                  );
                  if (found) setActivePersona(found);
                }}
                className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none"
              >
                {PERSONAS.map((p) => (
                  <option key={p.email} value={p.email}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
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
            <span className="font-semibold text-slate-800">
              {activeOrg.name}
            </span>
            <span>/</span>
            <span className="font-mono text-slate-500">{activeOrg.domain}</span>
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Go Auth Server + DPoP Gateway Live
            </span>
          </div>

          <div className="flex items-center gap-2">
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
              onClick={() => setActiveView("runtime_trace")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeView === "runtime_trace"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Live 17-Step Trace
            </button>
            <button
              onClick={() => setActiveView("oauth_sandbox")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeView === "oauth_sandbox"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              OAuth 2.1 Sandbox
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
                organizationName={activeOrg.name}
                onCreateOrganization={handleCreateOrganization}
                agentCount={agentCount}
                onAgentAutoRegistered={() => {
                  setAgentCount((c) => c + 1);
                  refreshAgentCount();
                }}
              />
            )}

            {activeView === "applications" && (
              <AgentDirectory
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
