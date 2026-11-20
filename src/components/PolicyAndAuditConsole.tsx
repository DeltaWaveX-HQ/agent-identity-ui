"use client";

import React, { useEffect, useState } from "react";
import { GO_API_BASE } from "../lib/api";
import { Shield, FileCode, Activity, CheckCircle2, Ban } from "lucide-react";

interface PolicyRule {
  id: string;
  name: string;
  code: string;
  description: string;
  cedar_expr: string;
  action: string;
  enabled: boolean;
  category: string;
  hits_count: number;
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

const DEFAULT_POLICIES: PolicyRule[] = [
  {
    id: "pol_egress_allowlist",
    name: "Default-Deny Unknown Egress Hosts",
    code: "RULE_DEFAULT_DENY_UNKNOWN_EGRESS",
    description:
      "Blocks any agent HTTP or MCP tool call targeting an external host outside the tenant's verified allowlist (*.acme.local).",
    cedar_expr: `forbid (principal, action, resource) unless { resource.host in ["gw.acme.local", "invoices.acme.local", "payments.acme.local", "crm.acme.local"] };`,
    action: "BLOCK_AND_REVOKE",
    enabled: true,
    category: "Egress",
    hits_count: 14,
  },
  {
    id: "pol_oversight_protect",
    name: "Protect Safety Monitoring & Alerting Configs",
    code: "RULE_PROTECT_OVERSIGHT_CONFIG",
    description:
      "Prevents autonomous coding or ops agents from disabling or modifying security monitoring and alerting pipelines (stops OpenAI GPT-6 monitor-disable incident).",
    cedar_expr: `forbid (principal is Agent, action in [Action::"write", Action::"delete"], resource) when { resource.path like "/monitoring/*" || resource.path like "/alerts/*" };`,
    action: "BLOCK_AND_REVOKE",
    enabled: true,
    category: "Oversight",
    hits_count: 3,
  },
  {
    id: "pol_ciba_financial",
    name: "Require OpenID CIBA Step-Up for Financial Transfers",
    code: "RULE_CIBA_FINANCIAL_STEP_UP",
    description:
      "Holds any payment initiation or money-movement call (score 0.30–0.75) and dispatches an asynchronous OpenID CIBA push notification to the human owner's device.",
    cedar_expr: `permit (principal is Agent, action == Action::"payment_transfer", resource) when { context.ciba_human_approved == true && context.data_residency == "IN" };`,
    action: "STEP_UP_CIBA",
    enabled: true,
    category: "Financial",
    hits_count: 9,
  },
  {
    id: "pol_unissued_cred",
    name: "Block Unissued / Stolen Static Credentials",
    code: "RULE_UNISSUED_CREDENTIAL_BLOCK",
    description:
      "Rejects any outbound request carrying an API key or bearer token that was not dynamically minted for the active attested run (stops CERT-In & LiteLLM key leaks).",
    cedar_expr: `forbid (principal is Agent, action, resource) when { !context.credential_issued_to_run || !context.dpop_verified };`,
    action: "BLOCK_AND_REVOKE",
    enabled: true,
    category: "Egress",
    hits_count: 8,
  },
];

export default function PolicyAndAuditConsole() {
  const [policies, setPolicies] = useState<PolicyRule[]>(DEFAULT_POLICIES);
  const [logs, setLogs] = useState<AuditEntry[]>([]);

  async function refreshData() {
    try {
      const [pRes, lRes] = await Promise.all([
        fetch(`${GO_API_BASE}/api/v1/policies`, {
          signal: AbortSignal.timeout(1500),
        }),
        fetch(`${GO_API_BASE}/api/v1/audit-logs`, {
          signal: AbortSignal.timeout(1500),
        }),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData) && pData.length > 0) setPolicies(pData);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        if (Array.isArray(lData)) setLogs(lData);
      }
    } catch {
      // keep defaults
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  async function togglePolicy(id: string, enabled: boolean) {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled } : p))
    );
    try {
      await fetch(`${GO_API_BASE}/api/v1/policies/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
    } catch {
      // local update only
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Cedar / OPA Tenant Policy Studio */}
      <div className="rounded-xl border border-[#223042] bg-[#121a24] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
              Deterministic Policy Engine · NIST Tenet #7 &amp; #8
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Cedar / OPA Tenant Guardrails &amp; Egress Policies
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic tenant rules always override probabilistic LLM
              reasoning and risk scores at the Go Enforcement Gateway.
            </p>
          </div>
          <span className="font-mono text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
            Active Policy Bundle: cedar-acme-in-v14
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((pol) => (
            <div
              key={pol.id}
              className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                pol.enabled
                  ? "border-[#223042] bg-[#0e151f]"
                  : "border-slate-800 bg-slate-950/40 opacity-60"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      {pol.category}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">
                      {pol.name}
                    </h3>
                    <code className="text-[11px] text-amber-300 font-mono">
                      {pol.code}
                    </code>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pol.enabled}
                      onChange={(e) => togglePolicy(pol.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all relative peer-checked:after:translate-x-4" />
                  </label>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {pol.description}
                </p>

                <div className="rounded-lg bg-[#080d14] border border-slate-800 p-2.5 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                    <FileCode className="w-3 h-3" />
                    <span>Cedar Policy Expression</span>
                  </div>
                  {pol.cedar_expr}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
                <span
                  className={
                    pol.action === "BLOCK_AND_REVOKE"
                      ? "text-rose-400 font-bold"
                      : "text-amber-400 font-bold"
                  }
                >
                  Action: {pol.action}
                </span>
                <span className="text-slate-400">
                  Triggered: {pol.hits_count} times
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Append-Only SIEM Audit Log */}
      <div className="rounded-xl border border-[#223042] bg-[#121a24] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              Tamper-Evident Tenant Audit Log (NIST Tenet #10)
            </h3>
          </div>
          <button
            onClick={refreshData}
            className="text-xs font-mono text-blue-400 hover:underline"
          >
            Refresh Audit Stream
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">
            Mint tokens in the OAuth 2.1 Sandbox or run any scenario in the
            Command Center to populate live audit records.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#182230] text-slate-300 font-mono text-[11px] uppercase">
                <tr>
                  <th className="p-2.5 border-b border-slate-700">Timestamp</th>
                  <th className="p-2.5 border-b border-slate-700">Event</th>
                  <th className="p-2.5 border-b border-slate-700">
                    Principal Chain (User → Agent)
                  </th>
                  <th className="p-2.5 border-b border-slate-700">Resource</th>
                  <th className="p-2.5 border-b border-slate-700">
                    Risk / Verdict
                  </th>
                  <th className="p-2.5 border-b border-slate-700">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-900/60">
                    <td className="p-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-2.5 font-semibold text-blue-300">
                      {l.event_type}
                    </td>
                    <td className="p-2.5 text-slate-200">
                      <div>{l.actor_user}</div>
                      <div className="text-slate-400">↳ {l.agent_id}</div>
                    </td>
                    <td className="p-2.5 text-slate-300">{l.resource}</td>
                    <td className="p-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                          l.verdict.includes("block") ||
                          l.verdict === "DENIED"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {l.verdict.includes("block") ? (
                          <Ban className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {l.verdict} ({l.risk_score.toFixed(2)})
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-400">{l.latency_us} µs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
