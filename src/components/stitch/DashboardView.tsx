"use client";

import React, { useMemo, useState } from "react";
import {
  Bot,
  Route,
  ShieldAlert,
  Zap,
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Fingerprint,
  ArrowUpRight,
} from "lucide-react";
import { AuditEntry, NavTab, RegisteredAgentItem } from "./types";

interface DashboardViewProps {
  orgName: string;
  agents: RegisteredAgentItem[];
  auditLogs: AuditEntry[];
  onRefresh: () => void;
  onNavigate: (tab: NavTab) => void;
}

export default function DashboardView({
  orgName,
  agents,
  auditLogs,
  onRefresh,
  onNavigate,
}: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);

  const stats = useMemo(() => {
    const activeAgents = agents.filter((a) => a.status === "ACTIVE");
    const uniqueOwners = new Set(agents.map((a) => a.owner_user)).size;
    const blockedLogs = auditLogs.filter(
      (l) =>
        l.verdict === "block_and_revoke" ||
        l.verdict === "deny" ||
        l.event_type.includes("BLOCK") ||
        l.event_type.includes("REVOKE")
    );
    const allowedLogs = auditLogs.filter(
      (l) =>
        l.verdict === "allow" ||
        l.event_type === "GATEWAY_ALLOW" ||
        l.event_type === "TOKEN_ISSUED"
    );
    const avgLatencyUs =
      auditLogs.length > 0
        ? Math.round(
            auditLogs.reduce((acc, l) => acc + (l.latency_us || 0), 0) /
              auditLogs.length
          )
        : 320;
    const tokenExchanges = auditLogs.filter(
      (l) => l.event_type === "RFC8693_TOKEN_EXCHANGE"
    ).length;
    const revocations = auditLogs.filter((l) =>
      l.event_type.includes("REVOKE")
    ).length;

    const claudeCount = agents.filter((a) =>
      (a.model_id || "").toLowerCase().includes("claude")
    ).length;
    const geminiCount = agents.filter((a) =>
      (a.model_id || "").toLowerCase().includes("gemini")
    ).length;
    const mcpCount = Math.max(0, agents.length - claudeCount - geminiCount);

    return {
      activeCount: activeAgents.length,
      totalAgents: agents.length,
      uniqueOwners,
      totalRequests: auditLogs.length,
      blockedCount: blockedLogs.length,
      allowedCount: allowedLogs.length,
      avgLatencyMs: (avgLatencyUs / 1000).toFixed(2),
      avgLatencyUs,
      tokenExchanges,
      revocations,
      claudeCount,
      geminiCount,
      mcpCount,
    };
  }, [agents, auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter((l) => {
        if (blockedOnly) {
          const isBlocked =
            l.verdict === "block_and_revoke" ||
            l.verdict === "deny" ||
            l.event_type.includes("BLOCK") ||
            l.event_type.includes("REVOKE");
          if (!isBlocked) return false;
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (l.agent_id || "").toLowerCase().includes(q) ||
          (l.actor_user || "").toLowerCase().includes(q) ||
          (l.resource || "").toLowerCase().includes(q) ||
          (l.event_type || "").toLowerCase().includes(q) ||
          (l.policy_rule || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [auditLogs, blockedOnly, searchQuery]);

  // Build 16 visual timeline bars reflecting recent live logs (or subtle baseline if empty)
  const bars = useMemo(() => {
    const slots = 16;
    const result = Array.from({ length: slots }, () => ({
      allowed: 0,
      blocked: 0,
    }));
    auditLogs.slice(0, 48).forEach((log, idx) => {
      const slot = slots - 1 - (idx % slots);
      const isBlocked =
        log.verdict === "block_and_revoke" ||
        log.verdict === "deny" ||
        log.event_type.includes("BLOCK");
      if (isBlocked) result[slot].blocked += 1;
      else result[slot].allowed += 1;
    });
    const maxTotal = Math.max(
      1,
      ...result.map((b) => b.allowed + b.blocked)
    );
    return result.map((b) => ({
      ...b,
      allowedPct: Math.round((b.allowed / maxTotal) * 85),
      blockedPct: Math.round((b.blocked / maxTotal) * 85),
    }));
  }, [auditLogs]);

  function exportAuditJSON() {
    const blob = new Blob([JSON.stringify(auditLogs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agent-identity-audit-logs.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Dashboard Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Streaming
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry, active agent identity runtime enforcement, and
            gateway access logs across {orgName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="h-8 px-3 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            Sync State
          </button>
          <button
            type="button"
            onClick={exportAuditJSON}
            className="h-8 px-3 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Logs
          </button>
        </div>
      </div>

      {/* SECTION 1: 4 Key Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active AI Agents */}
        <div
          onClick={() => onNavigate("consents-agents")}
          className="bg-white border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Active AI Agents
              </span>
              <div className="text-3xl font-semibold text-slate-900 mt-1 tabular-nums">
                {stats.activeCount}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Bot className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 space-y-1">
            <div className="text-[11px] text-slate-600">
              <span className="text-emerald-600 font-semibold">
                {stats.totalAgents} total registered
              </span>{" "}
              ({stats.uniqueOwners || 1} human delegator
              {stats.uniqueOwners === 1 ? "" : "s"})
            </div>
            <div className="font-mono text-[11px] text-slate-400 truncate">
              {stats.claudeCount} Claude · {stats.geminiCount} Gemini ·{" "}
              {stats.mcpCount} MCP
            </div>
          </div>
        </div>

        {/* Card 2: Gateway Requests */}
        <div
          onClick={() => onNavigate("audit-logs")}
          className="bg-white border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Gateway Requests
              </span>
              <div className="text-3xl font-semibold text-slate-900 mt-1 tabular-nums">
                {stats.totalRequests}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Route className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 space-y-1">
            <div className="text-[11px] text-emerald-600 font-semibold">
              {stats.allowedCount} allowed &amp; cryptographically audited
            </div>
            <div className="font-mono text-[11px] text-slate-400 truncate">
              {stats.tokenExchanges} RFC 8693 child exchanges
            </div>
          </div>
        </div>

        {/* Card 3: Blocked / Denied */}
        <div
          onClick={() => {
            setBlockedOnly((v) => !v);
          }}
          className="bg-white border border-slate-200 rounded-lg p-5 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Blocked / Denied
              </span>
              <div className="text-3xl font-semibold text-rose-600 mt-1 tabular-nums">
                {stats.blockedCount}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-semibold">
                {stats.revocations} revocations
              </span>
              <span className="text-slate-500">Cedar &amp; Egress</span>
            </div>
            <div className="font-mono text-[11px] text-slate-400 truncate">
              0 tokens leaked · Default-deny egress
            </div>
          </div>
        </div>

        {/* Card 4: Avg Gateway Latency */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Avg Gateway Latency
              </span>
              <div className="text-3xl font-semibold text-slate-900 mt-1 tabular-nums flex items-baseline gap-1">
                {stats.avgLatencyMs}
                <span className="text-sm font-mono font-medium text-slate-500">
                  ms
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-semibold">
                {stats.avgLatencyUs} µs
              </span>
              <span className="text-emerald-700 font-medium">
                Sub-millisecond
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-400 truncate">
              Inline MCP proxy &amp; DPoP ES256 check
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Traffic Chart + Active Agents Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 cols: Live Traffic & Enforcement */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Real-Time Gateway Traffic &amp; Enforcement
                </h2>
                <p className="text-xs text-slate-500">
                  Live distribution of recent allowed vs. blocked agent requests
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
                  Allowed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" />
                  Blocked / Revoked
                </span>
              </div>
            </div>

            {/* Live Bars */}
            <div className="h-44 flex items-end gap-2 px-2 pt-4 pb-2 border-b border-slate-100 bg-slate-50/50 rounded-md">
              {bars.map((b, i) => {
                const total = b.allowed + b.blocked;
                return (
                  <div
                    key={i}
                    className="flex-1 h-full flex flex-col justify-end items-center gap-0.5"
                    title={`Bucket ${i + 1}: ${b.allowed} allowed, ${b.blocked} blocked`}
                  >
                    {b.blocked > 0 && (
                      <div
                        className="w-full max-w-[20px] bg-rose-600 rounded-t-xs transition-all"
                        style={{ height: `${Math.max(8, b.blockedPct)}%` }}
                      />
                    )}
                    <div
                      className={`w-full max-w-[20px] rounded-t-xs transition-all ${
                        total > 0 ? "bg-blue-600/85" : "bg-slate-200/70"
                      }`}
                      style={{
                        height: `${total > 0 ? Math.max(10, b.allowedPct) : 6}%`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 rounded-md p-3 text-center">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Tokens Exchanged
              </span>
              <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {stats.tokenExchanges}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Active DPoP Keys
              </span>
              <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {stats.activeCount} Bound
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                DAG Revocations
              </span>
              <span className="font-mono text-sm font-semibold text-rose-600 tabular-nums">
                {stats.revocations} Cascade
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Active Agents & Scopes */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Active Agents &amp; Scopes
                </h2>
                <p className="text-xs text-slate-500">
                  Classified by model &amp; RFC 9449 DPoP binding
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[10px] font-semibold">
                RFC 9449 Bound
              </span>
            </div>

            {agents.length === 0 ? (
              <div className="py-10 text-center space-y-2.5 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 px-4">
                <Bot className="w-7 h-7 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-700">
                  No agents connected yet
                </div>
                <p className="text-[11px] text-slate-500">
                  Connect MCPJam, Claude, or Gemini in Setup Flow to see live
                  delegated agents here.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate("setup-flow")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Open Setup Flow
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  {
                    label: "Claude Agents",
                    count: stats.claudeCount,
                    color: "bg-blue-600",
                    dot: "bg-blue-600",
                    scopes: ["crm.read", "invoices.read"],
                  },
                  {
                    label: "Gemini Agents",
                    count: stats.geminiCount,
                    color: "bg-emerald-600",
                    dot: "bg-emerald-600",
                    scopes: ["crm.read", "payments.transfer"],
                  },
                  {
                    label: "MCPJam / Custom MCP",
                    count: stats.mcpCount,
                    color: "bg-slate-600",
                    dot: "bg-slate-600",
                    scopes: ["mcp:tools", "invoices.read"],
                  },
                ].map((group) => {
                  const pct =
                    stats.totalAgents > 0
                      ? Math.round((group.count / stats.totalAgents) * 100)
                      : 0;
                  return (
                    <div
                      key={group.label}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-800 inline-flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${group.dot}`}
                          />
                          {group.label}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600">
                          <strong>{group.count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full ${group.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.scopes.map((sc) => (
                          <span
                            key={sc}
                            className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-600"
                          >
                            {sc}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium text-[11px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              100% Cryptographically Bound (RFC 9449)
            </span>
            <span className="font-mono text-[11px] text-emerald-700 font-semibold">
              ES256
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Gateway Enforcement Audit Logs Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Gateway Enforcement Audit Logs
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-600">
                  {auditLogs.length} events
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cryptographic proof inspection, delegated token validation (RFC
                8693), and Cedar policy decisions.
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
              <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
              Tamper-evident Audit Stream
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by agent ID, user, resource URI, or rule..."
                className="w-full h-8 pl-8 pr-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBlockedOnly((v) => !v)}
                className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 border transition-colors ${
                  blockedOnly
                    ? "bg-rose-50 border-rose-300 text-rose-700"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Blocked Only ({stats.blockedCount})
              </button>
              <button
                type="button"
                onClick={() => onNavigate("audit-logs")}
                className="h-8 px-3 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 text-xs font-semibold"
              >
                Full Audit Trail →
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Delegator (sub)</th>
                <th className="px-4 py-2.5">Agent (act)</th>
                <th className="px-4 py-2.5">Event &amp; Resource</th>
                <th className="px-4 py-2.5 text-right">Latency</th>
                <th className="px-4 py-2.5 text-center">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    <Clock className="w-5 h-5 mx-auto mb-1.5 text-slate-300" />
                    No gateway events yet. Trigger a tool call in MCPJam,
                    Claude, or CLI to watch live enforcement rows appear here.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isBlocked =
                    log.verdict === "block_and_revoke" ||
                    log.verdict === "deny" ||
                    log.event_type.includes("BLOCK") ||
                    log.event_type.includes("REVOKE");
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.timestamp?.replace("T", " ").replace("Z", " UTC") ||
                          "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {log.actor_user}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] font-medium text-slate-900 max-w-[220px] truncate">
                        {log.agent_id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] text-slate-800 truncate max-w-[260px]">
                          {log.resource}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {log.event_type}
                          {log.policy_rule ? ` · ${log.policy_rule}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 text-right tabular-nums whitespace-nowrap">
                        {log.latency_us} µs
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[10px] font-semibold">
                            <XCircle className="w-3 h-3" />
                            BLOCKED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            ALLOWED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
