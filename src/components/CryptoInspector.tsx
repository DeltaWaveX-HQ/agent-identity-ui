"use client";

import React, { useState } from "react";
import { AgentAccessTokenClaims, TelemetryEvent } from "../lib/types";
import { KeyRound, GitBranch, Shield, Activity, UserCheck } from "lucide-react";

interface Props {
  event: TelemetryEvent | null;
}

function buildHierarchyView(
  claims: AgentAccessTokenClaims,
  event: TelemetryEvent | null
) {
  const isChild = Boolean(claims.act || claims.parent_jti);
  const loc =
    claims.authorization_details?.[0]?.locations?.[0] || "/finance/invoices/2026-Q3";
  const acts =
    claims.authorization_details?.[0]?.actions?.join(",") || "read";
  const folderScope = `${loc}:${acts} (${claims.scope})`;

  const isRevoked =
    event?.family_graph?.revoked || event?.status === "bad";
  const isStepUp = event?.risk_decision?.verdict === "step-up";

  const authStatus = isRevoked
    ? "no (revoked)"
    : isStepUp
      ? "step-up (awaiting human CIBA)"
      : "yes";

  const reasons = event?.risk_decision?.top_reasons || [
    "spiffe_workload_attested",
    "action_within_rar_consent",
    "dpop_sender_constrained",
  ];

  if (!isChild) {
    return {
      user: {
        id: claims.sub,
        authenticated_via: "oidc_federated_idp (Okta / LoginRadius)",
        standing_role: "Finance Manager",
        agent: {
          id: claims.client_id,
          scope: folderScope,
          authorised: authStatus,
          token: claims.jti,
          time: `ttl=${claims.exp - claims.iat}s (exp=${claims.exp})`,
          type_of_agent: "parent",
          awake: `gemini-2.5-flash (parent awakened by ${claims.sub})`,
          reason: reasons,
          authorised_flow: "oauth2.1 + pkce + rfc9396_rar + rfc9449_dpop",
          dpop_cnf_jkt: claims.cnf?.jkt,
        },
      },
    };
  }

  return {
    user: {
      id: claims.sub,
      authenticated_via: "oidc_federated_idp (Okta / LoginRadius)",
      standing_role: "Finance Manager",
      agent: {
        id: claims.act?.sub || "agent:invoice-assistant",
        scope: folderScope,
        authorised: isRevoked ? "no (revoked via child cascade)" : "yes",
        token: claims.parent_jti || "tok_parent_8f91a2",
        time: "ttl=300s (parent session)",
        type_of_agent: "parent",
        awake: `gemini-2.5-flash (parent awakened by ${claims.sub})`,
        reason: ["spiffe_workload_attested", "spawned_child_via_rfc8693"],
        authorised_flow: "oauth2.1 + pkce + rfc9396_rar + rfc9449_dpop",
        child_agent: {
          id: claims.client_id,
          scope: folderScope,
          authorised: authStatus,
          token: claims.jti,
          time: `ttl=${claims.exp - claims.iat}s (attenuated <= 3m)`,
          type_of_agent: "child",
          awake: `gemini-2.5-flash (child awakened by parent ${claims.act?.sub || "agent:invoice-assistant"})`,
          reason: reasons,
          authorised_flow: "oauth2.1 + rfc8693_token_exchange (nested act)",
          dpop_cnf_jkt: claims.cnf?.jkt,
        },
      },
    },
  };
}

export default function CryptoInspector({ event }: Props) {
  const [viewMode, setViewMode] = useState<"hierarchy" | "rfc_jwt">(
    "hierarchy"
  );
  const claims = event?.token_claims;
  const dpop = event?.dpop_claims;
  const risk = event?.risk_decision;
  const dag = event?.family_graph;

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Token Family DAG & Instant Revocation Bus */}
      <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-400" />
            <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
              Token Family DAG (RFC 8693 Cascading Revocation)
            </span>
          </div>
          {dag && (
            <span
              className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                dag.revoked
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {dag.revoked
                ? `FAMILY REVOKED (${dag.propagation_us || 19} µs)`
                : "FAMILY ACTIVE"}
            </span>
          )}
        </div>

        {!dag ? (
          <p className="text-xs text-slate-400">
            No token family issued yet (Zero standing privileges prior to Step
            9).
          </p>
        ) : (
          <div className="space-y-2">
            {dag.revoke_reason && (
              <div className="rounded-lg bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 text-xs text-rose-200">
                <b>Revocation Trigger:</b> {dag.revoke_reason}
              </div>
            )}
            <div className="grid grid-cols-1 gap-1.5">
              {dag.nodes.map((node) => (
                <div
                  key={node.jti}
                  className={`rounded-lg border px-3 py-2 flex items-center justify-between text-xs ${
                    node.status === "REVOKED"
                      ? "bg-rose-950/25 border-rose-500/40 text-rose-200"
                      : node.status === "ROTATED"
                        ? "bg-amber-950/25 border-amber-500/40 text-amber-200"
                        : "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-mono font-semibold">
                      {node.token_type === "parent_access"
                        ? "🪪 Parent Agent Token"
                        : node.token_type === "sub_agent_access"
                          ? "↳ ⚙️ Child Sub-Agent Token (RFC 8693)"
                          : "↳ 🔄 Rotating Refresh Token"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      client: {node.client_id} · jti: {node.jti}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                      node.status === "REVOKED"
                        ? "bg-rose-600 text-white"
                        : node.status === "ROTATED"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-600 text-white"
                    }`}
                  >
                    {node.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Layer 3 Two-Stage Risk Engine Telemetry */}
      {risk && (
        <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
                Layer 3 Risk Engine ({risk.model_version})
              </span>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {risk.latency_us} µs
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-900/80 rounded-lg p-2.5 border border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block">
                Combined Risk Score
              </span>
              <span
                className={`text-xl font-bold font-mono ${
                  risk.score >= 0.75
                    ? "text-rose-400"
                    : risk.score >= 0.3
                      ? "text-amber-400"
                      : "text-emerald-400"
                }`}
              >
                {risk.score.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">
                Policy + Risk Verdict
              </span>
              <span
                className={`font-mono text-xs font-bold uppercase px-2.5 py-1 rounded-full inline-block mt-0.5 ${
                  risk.verdict === "block_and_revoke"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : risk.verdict === "step-up"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {risk.verdict}
              </span>
            </div>
          </div>

          {risk.hard_rule_hit && (
            <div className="rounded bg-rose-950/50 border border-rose-500/40 p-2 text-[11px] font-mono text-rose-200">
              <b>Deterministic Cedar Rule Override:</b> {risk.hard_rule_hit}
            </div>
          )}

          <div className="text-xs text-slate-300">
            <span className="text-slate-400 font-mono text-[11px]">
              Top Feature Signals:
            </span>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] font-mono text-slate-300">
              {risk.top_reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 3. User vs. Agent Differentiation & Decoded ES256 Token Inspector */}
      <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
              User vs. Agent Identity Differentiation
            </span>
          </div>

          {/* Toggle between User -> Agent Hierarchy and Raw RFC 8693 JWT */}
          <div className="flex items-center gap-1 bg-[#080d14] p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setViewMode("hierarchy")}
              className={`px-2 py-1 rounded ${
                viewMode === "hierarchy"
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              user → agent JSON
            </button>
            <button
              onClick={() => setViewMode("rfc_jwt")}
              className={`px-2 py-1 rounded ${
                viewMode === "rfc_jwt"
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              RFC 8693 at+jwt
            </button>
          </div>
        </div>

        {!claims ? (
          <p className="text-xs text-slate-400 py-3">
            No token present at this step. Agent has zero standing privileges
            until Step 9.
          </p>
        ) : viewMode === "hierarchy" ? (
          <>
            <p className="text-[11px] text-slate-400">
              Unlike traditional OAuth that flattens identity into the human
              user, our platform nests{" "}
              <code className="text-blue-300">
                user → parent agent → child sub-agent
              </code>{" "}
              with distinct scopes, TTLs, and LLM lineage:
            </p>
            <pre className="rounded-lg bg-[#080d14] border border-slate-800 p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              {JSON.stringify(buildHierarchyView(claims, event), null, 2)}
            </pre>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-blue-400" />
                Standard IETF OAuth 2.1 + RFC 8693 + RFC 9396 Payload
              </span>
              <span className="text-emerald-400">alg: ES256</span>
            </div>
            <pre className="rounded-lg bg-[#080d14] border border-slate-800 p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              {JSON.stringify(claims, null, 2)}
            </pre>
            {dpop && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-blue-300 mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>
                    RFC 9449 Sender-Constrained DPoP Proof Header (dpop+jwt)
                  </span>
                </div>
                <pre className="rounded-lg bg-[#080d14] border border-slate-800 p-2.5 text-[11px] font-mono text-blue-200 overflow-x-auto">
                  {JSON.stringify(dpop, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
