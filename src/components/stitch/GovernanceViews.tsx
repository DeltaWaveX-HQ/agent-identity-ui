"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  RotateCcw,
  KeyRound,
  ExternalLink,
  Download,
} from "lucide-react";
import { AuthenticatedOrg, AuthenticatedUser } from "../AuthScreen";
import { AuditEntry } from "./types";

/* ============================================================================
   1. FULL AUDIT LOGS VIEW
   ============================================================================ */
export function AuditLogsView({ auditLogs }: { auditLogs: AuditEntry[] }) {
  const [query, setQuery] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<"all" | "allow" | "block">(
    "all"
  );

  const filtered = useMemo(() => {
    return auditLogs.filter((l) => {
      const isBlocked =
        l.verdict === "block_and_revoke" ||
        l.verdict === "deny" ||
        l.event_type.includes("BLOCK") ||
        l.event_type.includes("REVOKE");
      if (verdictFilter === "allow" && isBlocked) return false;
      if (verdictFilter === "block" && !isBlocked) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (l.agent_id || "").toLowerCase().includes(q) ||
        (l.actor_user || "").toLowerCase().includes(q) ||
        (l.resource || "").toLowerCase().includes(q) ||
        (l.event_type || "").toLowerCase().includes(q) ||
        (l.family_id || "").toLowerCase().includes(q)
      );
    });
  }, [auditLogs, query, verdictFilter]);

  function exportJSON() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gateway-audit-logs.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable cryptographic ledger of every DCR registration, RAR
            consent, RFC 8693 child token exchange, and Layer 2 gateway verdict.
          </p>
        </div>
        <button
          type="button"
          onClick={exportJSON}
          className="h-8 px-3 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export JSON
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agent, user, family_id, resource..."
              className="w-full h-8 pl-8 pr-3 rounded-md bg-slate-50 border border-slate-200 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(["all", "allow", "block"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setVerdictFilter(f)}
                className={`h-8 px-3 rounded-md text-xs font-medium capitalize border ${
                  verdictFilter === f
                    ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f === "all" ? "All Events" : f === "allow" ? "Allowed" : "Blocked"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Event</th>
                <th className="px-4 py-2.5">Human (sub)</th>
                <th className="px-4 py-2.5">Agent (act)</th>
                <th className="px-4 py-2.5">Resource</th>
                <th className="px-4 py-2.5">Family DAG</th>
                <th className="px-4 py-2.5 text-right">Latency</th>
                <th className="px-4 py-2.5 text-center">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    No matching audit records.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const blocked =
                    l.verdict === "block_and_revoke" ||
                    l.verdict === "deny" ||
                    l.event_type.includes("BLOCK") ||
                    l.event_type.includes("REVOKE");
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {l.timestamp?.replace("T", " ").replace("Z", "")}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                        {l.event_type}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {l.actor_user}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-900 max-w-[200px] truncate">
                        {l.agent_id}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 max-w-[220px] truncate">
                        {l.resource}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {l.family_id || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-right text-slate-600 tabular-nums whitespace-nowrap">
                        {l.latency_us} µs
                      </td>
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        {blocked ? (
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

/* ============================================================================
   2. GATEWAY POLICIES VIEW (Cedar + Hard Rules)
   ============================================================================ */
export function GatewayPoliciesView() {
  const rules = [
    {
      id: "RULE_DEFAULT_DENY_UNKNOWN_EGRESS",
      title: "Default-Deny Unknown Egress Hosts",
      action: "BLOCK_AND_REVOKE",
      desc: "Blocks any outbound agent HTTP call outside *.acme.local and triggers instant <1ms cascading revocation of the entire Parent→Child token family.",
      cedar: `forbid (principal, action, resource) when { resource.host != "*.acme.local" };`,
    },
    {
      id: "RULE_HIGH_VALUE_PAYMENT_CIBA",
      title: "High-Value Financial Transfer Step-Up (CIBA)",
      action: "STEP_UP_CIBA",
      desc: "Requires out-of-band human confirmation before an agent can execute payment_transfer mutations.",
      cedar: `forbid (principal, action == Action::"payment_transfer", resource) unless { context.ciba_approved == true };`,
    },
    {
      id: "RULE_BLOCK_DESTRUCTIVE_DELETE",
      title: "Block Destructive Delete Without Explicit RAR",
      action: "BLOCK_AND_REVOKE",
      desc: "Denies delete/drop operations if not explicitly approved in the signed RFC 9396 authorization_details.",
      cedar: `forbid (principal, action == Action::"delete", resource) unless { principal.rar_actions.contains("delete") };`,
    },
    {
      id: "RULE_DPOP_SENDER_CONSTRAINT",
      title: "Strict RFC 9449 DPoP Proof Binding",
      action: "BLOCK_HTTP_401",
      desc: "Verifies that the ES256 DPoP header thumbprint matches the token's cnf.jkt claim on every tool invocation.",
      cedar: `permit (principal, action, resource) when { context.dpop_jkt == principal.cnf_jkt };`,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Gateway Policies
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-semibold">
            Cedar Engine Enforcing
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Hard tenant guardrails evaluated inline by Layer 2 Gateway (:8080) on
          every MCP tool call.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900">
                  {r.title}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${
                  r.action.includes("BLOCK")
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {r.action}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
            <pre className="p-3 rounded-lg bg-slate-900 text-blue-300 font-mono text-[11px] overflow-x-auto">
              {r.cedar}
            </pre>
            <div className="font-mono text-[10px] text-slate-400">
              Policy ID: {r.id}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   3. SETTINGS & TRUST INFRASTRUCTURE VIEW
   ============================================================================ */
export function SettingsView({
  currentUser,
  activeOrg,
  onResetWorkspace,
}: {
  currentUser: AuthenticatedUser;
  activeOrg: AuthenticatedOrg;
  onResetWorkspace: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Settings &amp; Trust Infrastructure
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Organization identity metadata, ES256 KMS discovery endpoints, and
          workspace controls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-600" />
            Organization &amp; Cryptographic Endpoints
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {[
              { k: "Organization", v: activeOrg.name },
              { k: "Admin Subject (sub)", v: `user:${currentUser.email}` },
              {
                k: "OAuth 2.1 Discovery",
                v: "http://localhost:8080/.well-known/oauth-authorization-server",
                link: true,
              },
              {
                k: "ES256 Public JWKS",
                v: "http://localhost:8080/.well-known/jwks.json",
                link: true,
              },
              {
                k: "MCP Protected Resource (RFC 9728)",
                v: "http://localhost:8090/.well-known/oauth-protected-resource/sse",
                link: true,
              },
            ].map((row) => (
              <div
                key={row.k}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <span className="text-slate-500">{row.k}</span>
                {row.link ? (
                  <a
                    href={row.v}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 truncate max-w-[280px]"
                  >
                    <span className="truncate">{row.v}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="font-mono text-[11px] text-slate-900 font-medium">
                    {row.v}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-rose-700">
              Reset Demo Workspace
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Clears all registered agents, active token families, and audit
              logs on the Go backend (:8080) so you can run a clean live demo
              from scratch.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetWorkspace}
            className="self-start px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Workspace State
          </button>
        </div>
      </div>
    </div>
  );
}
