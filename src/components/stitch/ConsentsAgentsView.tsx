"use client";

import React, { useMemo, useState } from "react";
import {
  FolderOpen,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Trash2,
  Code2,
  Bot,
  ArrowRight,
  GitBranch,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { AuthenticatedOrg, AuthenticatedUser } from "../AuthScreen";
import { TelemetryEvent } from "../../lib/types";
import { AuditEntry, NavTab, RegisteredAgentItem } from "./types";

interface ConsentsAgentsViewProps {
  currentUser: AuthenticatedUser;
  activeOrg: AuthenticatedOrg;
  agents: RegisteredAgentItem[];
  auditLogs: AuditEntry[];
  latestEvent: TelemetryEvent | null;
  onRevokeAgent: (agentId: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export default function ConsentsAgentsView({
  currentUser,
  activeOrg,
  agents,
  auditLogs,
  latestEvent,
  onRevokeAgent,
  onNavigate,
}: ConsentsAgentsViewProps) {
  // Build Root Human Users list dynamically from currentUser + any owner_user in registered agents
  const usersList = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        code: string;
        name: string;
        email: string;
        agents: RegisteredAgentItem[];
      }
    >();

    const primaryKey = `user:${currentUser.email}`;
    map.set(primaryKey, {
      key: primaryKey,
      code: "U1",
      name: currentUser.name,
      email: currentUser.email,
      agents: [],
    });

    agents.forEach((ag) => {
      const ownerKey = ag.owner_user || primaryKey;
      if (!map.has(ownerKey)) {
        const cleanEmail = ownerKey.replace(/^user:/, "");
        const displayName =
          cleanEmail.split("@")[0].replace(/[._-]/g, " ") || "Tenant User";
        map.set(ownerKey, {
          key: ownerKey,
          code: `U${map.size + 1}`,
          name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
          email: cleanEmail,
          agents: [],
        });
      }
      map.get(ownerKey)!.agents.push(ag);
    });

    return Array.from(map.values());
  }, [currentUser, agents]);

  const [selectedUserKey, setSelectedUserKey] = useState<string>(
    `user:${currentUser.email}`
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showHierarchyJSON, setShowHierarchyJSON] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);

  const selectedUser =
    usersList.find((u) => u.key === selectedUserKey) || usersList[0];

  // Separate parent agents and child sub-agents for the selected user
  const parentAgents = useMemo(() => {
    const list = selectedUser?.agents || [];
    const parents = list.filter((a) => !a.parent_agent_id);
    return parents.length > 0 ? parents : list;
  }, [selectedUser]);

  const selectedAgent =
    parentAgents.find((a) => a.agent_id === selectedAgentId) ||
    parentAgents[0] ||
    null;

  // Find child sub-agents for any parent agent (from agents list OR audit logs RFC8693_TOKEN_EXCHANGE)
  function getChildrenForAgent(parentId: string) {
    const direct = (selectedUser?.agents || []).filter(
      (a) => a.parent_agent_id === parentId
    );
    const fromLogs = auditLogs
      .filter(
        (l) =>
          l.parent_agent === parentId &&
          l.agent_id &&
          l.agent_id !== parentId &&
          !direct.some((d) => d.agent_id === l.agent_id)
      )
      .reduce<Array<{ agent_id: string; family_id?: string }>>((acc, l) => {
        if (!acc.some((x) => x.agent_id === l.agent_id)) {
          acc.push({ agent_id: l.agent_id, family_id: l.family_id });
        }
        return acc;
      }, []);

    return [
      ...direct.map((d) => ({ agent_id: d.agent_id, family_id: undefined })),
      ...fromLogs,
    ];
  }

  // Resources / folders accessed by the selected agent (and its children)
  const agentResourceLogs = useMemo(() => {
    if (!selectedAgent) return [];
    return auditLogs
      .filter(
        (l) =>
          l.agent_id === selectedAgent.agent_id ||
          l.parent_agent === selectedAgent.agent_id ||
          (l.agent_id || "").startsWith(selectedAgent.agent_id + "/")
      )
      .slice(0, 8);
  }, [auditLogs, selectedAgent]);

  const activeFamilyId =
    agentResourceLogs.find((l) => l.family_id)?.family_id ||
    latestEvent?.token_claims?.family_id ||
    "dag_fam_active";

  const hierarchyJSON = useMemo(() => {
    if (latestEvent?.token_claims?.user_agent_hierarchy) {
      return latestEvent.token_claims.user_agent_hierarchy;
    }
    return {
      user: {
        id: selectedUser?.key || `user:${currentUser.email}`,
        name: selectedUser?.name || currentUser.name,
        organization: activeOrg.name,
        agent: selectedAgent
          ? {
              id: selectedAgent.agent_id,
              name: selectedAgent.name,
              model: selectedAgent.model_id,
              spiffe_id: selectedAgent.spiffe_id,
              status: selectedAgent.status,
              allowed_scopes: selectedAgent.allowed_scopes || [
                "crm.read",
                "invoices.read",
              ],
              dpop_cnf_jkt: selectedAgent.dpop_thumbprint,
              family_dag_id: activeFamilyId,
              children: getChildrenForAgent(selectedAgent.agent_id).map(
                (c) => c.agent_id
              ),
            }
          : null,
      },
    };
  }, [
    latestEvent,
    selectedUser,
    currentUser,
    activeOrg,
    selectedAgent,
    activeFamilyId,
  ]);

  function handleCopyJSON() {
    navigator.clipboard.writeText(JSON.stringify(hierarchyJSON, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 1500);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Consents &amp; Agents
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-semibold">
              RFC 8693 Token Exchange Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Click a human user below to trace their delegated parent &amp; child
            AI agents, accessed folders, RAR scopes, and cryptographic DPoP
            bindings.
          </p>
        </div>
      </div>

      {/* SECTION 1: Root Delegators (Human Identities — U1, U2, U3...) */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Root Delegators (Human Identities)
            </h2>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Select a user to inspect downstream AI agents
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {usersList.map((u) => {
            const isSelected = u.key === selectedUser?.key;
            const activeCount = u.agents.filter(
              (a) => a.status === "ACTIVE"
            ).length;
            return (
              <button
                key={u.key}
                type="button"
                onClick={() => {
                  setSelectedUserKey(u.key);
                  setSelectedAgentId(null);
                }}
                className={`text-left relative rounded-xl p-4 transition-all ${
                  isSelected
                    ? "bg-white border-2 border-blue-600 shadow-sm ring-4 ring-blue-500/10"
                    : "bg-white border border-slate-200 hover:border-slate-300"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-blue-600" />
                )}
                <div className="flex items-center gap-3 mb-2.5">
                  <div
                    className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {u.code}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">
                      {u.code} · {u.name}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 truncate">
                      {u.email}
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      activeCount > 0
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {activeCount} Active Agent{activeCount === 1 ? "" : "s"}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[110px]">
                    {u.key}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Interactive 12-Col Workspace (Left 7 cols Tree, Right 5 cols Inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Delegation Topology Graph (U1 -> Agent 1, Agent 2, ...) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Delegation Topology Graph
                </h3>
                <p className="text-xs text-slate-500">
                  Live RFC 8693 Token Delegation hierarchy for{" "}
                  <span className="font-mono text-slate-800 font-medium">
                    {selectedUser?.code} ({selectedUser?.email})
                  </span>
                </p>
              </div>
              <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">
                Top-Down DAG
              </span>
            </div>

            <div className="pt-6 pb-2 flex flex-col items-center">
              {/* Root Human Identity Node (U1) */}
              <div className="w-full max-w-sm bg-white border-2 border-slate-900 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {selectedUser?.code || "U1"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {selectedUser?.name} (Human Identity)
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        sub: {selectedUser?.key}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold shrink-0">
                    OIDC Valid
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Org: {activeOrg.name}</span>
                  <span>Role: {currentUser.role}</span>
                </div>
              </div>

              {/* Tree Branch Connectors */}
              {parentAgents.length > 0 && (
                <div className="w-full flex justify-center py-1">
                  <svg
                    className="w-full max-w-[480px] h-11 overflow-visible"
                    fill="none"
                    viewBox="0 0 480 44"
                  >
                    <path d="M240 0 V18" stroke="#94A3B8" strokeWidth="2" />
                    {parentAgents.length > 1 && (
                      <path
                        d="M80 18 H400"
                        stroke="#94A3B8"
                        strokeWidth="2"
                      />
                    )}
                    {parentAgents.slice(0, 3).map((ag, idx) => {
                      const count = Math.min(parentAgents.length, 3);
                      const x =
                        count === 1
                          ? 240
                          : count === 2
                          ? idx === 0
                            ? 120
                            : 360
                          : idx === 0
                          ? 80
                          : idx === 1
                          ? 240
                          : 400;
                      const active = ag.agent_id === selectedAgent?.agent_id;
                      return (
                        <path
                          key={ag.agent_id}
                          d={`M${x} 18 V44`}
                          stroke={active ? "#2563EB" : "#CBD5E1"}
                          strokeWidth={active ? "2.5" : "2"}
                          strokeDasharray={active ? undefined : "4 2"}
                        />
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* Agent Nodes Grid */}
              {parentAgents.length === 0 ? (
                <div className="mt-6 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-2.5">
                  <Bot className="w-7 h-7 text-slate-400 mx-auto" />
                  <div className="text-sm font-semibold text-slate-800">
                    No AI Agents delegated under {selectedUser?.email} yet
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Connect MCPJam (`http://localhost:8090/sse`), Claude, or run
                    a quick DCR registration in Setup Flow to watch Agent 1 and
                    its Child Sub-Agents appear in this live tree.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate("setup-flow")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Connect an Agent in Setup Flow
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  className={`grid gap-3 w-full mt-1 ${
                    parentAgents.length === 1
                      ? "grid-cols-1 max-w-sm"
                      : parentAgents.length === 2
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                  }`}
                >
                  {parentAgents.map((ag, idx) => {
                    const isSelected = ag.agent_id === selectedAgent?.agent_id;
                    const isRevoked = ag.status !== "ACTIVE";
                    const children = getChildrenForAgent(ag.agent_id);

                    return (
                      <div
                        key={ag.agent_id}
                        onClick={() => setSelectedAgentId(ag.agent_id)}
                        className={`relative rounded-xl p-3.5 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-white border-2 border-blue-600 shadow-md ring-4 ring-blue-500/10"
                            : isRevoked
                            ? "bg-rose-50/40 border border-rose-200 hover:border-rose-300"
                            : "bg-white border border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider">
                            Selected
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-2 mt-0.5">
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isRevoked
                                ? "bg-rose-100 text-rose-700"
                                : isSelected
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            Agent {idx + 1}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isRevoked
                                ? "bg-rose-100 text-rose-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isRevoked ? "REVOKED" : "ACTIVE"}
                          </span>
                        </div>
                        <div
                          className={`font-semibold text-xs leading-snug ${
                            isRevoked
                              ? "line-through text-slate-500"
                              : "text-slate-900"
                          }`}
                        >
                          {ag.name || ag.agent_id}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 truncate mt-1">
                          {ag.agent_id}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>Model</span>
                          <span className="text-slate-700 font-medium truncate max-w-[110px]">
                            {ag.model_id}
                          </span>
                        </div>

                        {/* Nested Child Sub-Agents (RFC 8693) */}
                        {children.length > 0 ? (
                          <div className="mt-3 pt-2 border-t border-dashed border-blue-200 bg-blue-50/50 -mx-3.5 -mb-3.5 p-2.5 rounded-b-xl space-y-1">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-900">
                              <GitBranch className="w-3 h-3 text-blue-600" />
                              <span>
                                Child Sub-Agent{children.length > 1 ? "s" : ""}{" "}
                                (RFC 8693)
                              </span>
                            </div>
                            {children.map((ch) => (
                              <div
                                key={ch.agent_id}
                                className="font-mono text-[10px] text-blue-800 truncate"
                              >
                                ↳ {ch.agent_id.split("/").pop()}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                            No child sub-agents spawned yet
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedAgent && (
              <div className="mt-6 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>
                    Inspecting:{" "}
                    <strong className="text-slate-800">
                      {selectedAgent.name || selectedAgent.agent_id}
                    </strong>
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  Bound via RFC 9449 DPoP
                </span>
              </div>
            )}
          </div>

          {/* RFC 8693 Info Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-blue-600 font-mono font-bold text-xs shrink-0">
                RFC 8693
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Delegated Token Exchange Protocol Active
                </div>
                <p className="text-[11px] text-slate-500">
                  Every tool call carries both human{" "}
                  <code className="font-mono">sub</code> and distinct agent{" "}
                  <code className="font-mono">act</code> claims for
                  non-repudiation.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHierarchyJSON((v) => !v)}
              className="px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 shrink-0"
            >
              {showHierarchyJSON ? "Hide JSON" : "Inspect Claims"}
            </button>
          </div>
        </div>

        {/* RIGHT: Agent Detail Inspector Panel (Folders Accessed, Reason/Scope, DPoP, Revoke) */}
        <div className="lg:col-span-5">
          {!selectedAgent ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">
                Agent Inspector Ready
              </div>
              <p className="text-xs text-slate-500">
                Select any agent node from the delegation tree on the left to
                inspect accessed folders, scopes, DPoP keys, and revocation
                controls.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-5">
              {/* Inspector Header */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px] font-bold uppercase tracking-wider">
                    Agent Inspector
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      selectedAgent.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedAgent.status === "ACTIVE"
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-rose-500"
                      }`}
                    />
                    {selectedAgent.status === "ACTIVE"
                      ? "RFC 9449 Bound"
                      : "REVOKED"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  {selectedAgent.name || selectedAgent.agent_id}
                </h3>
                <div className="font-mono text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded p-2 mt-1.5 break-all">
                  {selectedAgent.spiffe_id}
                </div>
              </div>

              {/* CARD 1: Folders & Resources Accessed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 inline-flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                    Folders &amp; Resources Accessed
                  </h4>
                  <span className="font-mono text-[10px] text-slate-400">
                    {agentResourceLogs.length} events
                  </span>
                </div>

                {agentResourceLogs.length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                    No resource calls yet — invoke a tool from MCPJam or CLI to
                    see accessed folders &amp; policy verdicts here.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {agentResourceLogs.map((log) => {
                      const blocked =
                        log.verdict === "block_and_revoke" ||
                        log.verdict === "deny" ||
                        log.event_type.includes("BLOCK");
                      return (
                        <div
                          key={log.id}
                          className={`flex items-center justify-between p-2 rounded-lg border font-mono text-[11px] ${
                            blocked
                              ? "bg-rose-50/60 border-rose-200"
                              : "bg-slate-50 border-slate-200/80"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {blocked ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span
                              className={`truncate ${
                                blocked
                                  ? "text-rose-900 line-through"
                                  : "text-slate-700"
                              }`}
                            >
                              {log.resource}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ml-2 shrink-0 ${
                              blocked
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {blocked ? "Blocked" : "Granted"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CARD 2: Reason & Scope Authorization */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  Reason &amp; Scope Authorization (RFC 9396 RAR)
                </h4>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Consented Scopes
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(
                        selectedAgent.allowed_scopes || [
                          "crm.read",
                          "invoices.read",
                        ]
                      ).map((sc) => (
                        <span
                          key={sc}
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] font-medium"
                        >
                          {sc}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Approved by:{" "}
                      <strong className="text-slate-800">
                        {selectedUser?.email}
                      </strong>
                    </span>
                    <span className="font-mono text-slate-500">
                      OAuth 2.1 + PKCE
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 3: Cryptographic DPoP Binding */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 inline-flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                    Cryptographic DPoP Binding
                  </h4>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px]">
                    ES256 Verified
                  </span>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">cnf.jkt:</span>
                    <span className="text-blue-400 truncate max-w-[200px]">
                      {selectedAgent.dpop_thumbprint}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">token_family_dag:</span>
                    <span className="text-amber-400 truncate">
                      {activeFamilyId}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 pt-1.5 border-t border-slate-800">
                    <span className="text-slate-400">pass_ttl:</span>
                    <span className="text-emerald-400 font-semibold">
                      5m short-lived (Parent) / 3m (Child)
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Hierarchy JSON Drawer */}
              {showHierarchyJSON && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      User → Agent Hierarchy Claims (JSON)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyJSON}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      {copiedJSON ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedJSON ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-950 text-emerald-300 font-mono text-[10px] overflow-x-auto max-h-48">
                    {JSON.stringify(hierarchyJSON, null, 2)}
                  </pre>
                </div>
              )}

              {/* Action Controls */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  disabled={selectedAgent.status !== "ACTIVE"}
                  onClick={() => onRevokeAgent(selectedAgent.agent_id)}
                  className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {selectedAgent.status === "ACTIVE"
                    ? "Revoke Agent & Child Tokens (Instant DAG Invalidation)"
                    : "Agent Already Revoked"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowHierarchyJSON((v) => !v)}
                  className="w-full py-2 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  {showHierarchyJSON
                    ? "Hide OIDC Delegation Claims"
                    : "Inspect OIDC Delegation Claims (JSON)"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Live Gateway Enforcement Stream Strip */}
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Live Gateway Enforcement Stream
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("audit-logs")}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            View full audit trail →
          </button>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {auditLogs.slice(0, 4).map((log) => {
            const blocked =
              log.verdict === "block_and_revoke" ||
              log.verdict === "deny" ||
              log.event_type.includes("BLOCK");
            return (
              <div
                key={log.id}
                className={`p-2 rounded-md border flex items-center justify-between gap-3 ${
                  blocked
                    ? "bg-rose-50/60 border-rose-100"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-slate-400 text-[10px] shrink-0">
                    {log.timestamp?.slice(11, 19) || "LIVE"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[10px] shrink-0">
                    {log.actor_user.replace(/^user:/, "")}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span
                    className={`font-semibold truncate ${
                      blocked ? "text-rose-700" : "text-slate-800"
                    }`}
                  >
                    {log.agent_id}
                  </span>
                  <span className="text-slate-500 truncate hidden md:inline">
                    {log.resource}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    blocked
                      ? "bg-rose-100 text-rose-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {blocked ? "BLOCKED" : `ALLOWED · ${log.latency_us}µs`}
                </span>
              </div>
            );
          })}
          {auditLogs.length === 0 && (
            <div className="text-xs text-slate-400 py-2 text-center font-sans">
              Waiting for live agent tool calls...
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
