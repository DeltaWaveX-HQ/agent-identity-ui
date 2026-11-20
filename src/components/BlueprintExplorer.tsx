"use client";

import React, { useState } from "react";
import { ShieldCheck, Layers, Award, CheckCircle2 } from "lucide-react";

const ARCH_NODES: Record<
  string,
  { title: string; role: string[]; stores: string; standards: string }
> = {
  user: {
    title: "User (Human Principal)",
    role: [
      "Gives the assistant a task in plain words.",
      "Reviews plain-language RFC 9396 RAR consent screen and narrows scope.",
      "Receives OpenID CIBA phone push when an agent attempts a medium-risk action.",
    ],
    stores: "Nothing new (federated identity stays in customer IdP).",
    standards: "OIDC Login · RAR Consent · OpenID CIBA",
  },
  idp: {
    title: "Customer's Login System (IdP)",
    role: [
      "Authenticates the human user (Okta / Microsoft Entra / Ping).",
      "Provides OIDC ID token and enterprise group mappings.",
      "Interoperates with Okta Cross App Access / Entra Agent ID.",
    ],
    stores: "Enterprise user accounts.",
    standards: "OIDC · ID-JAG / Cross App Access",
  },
  runtime: {
    title: "Agent Runtime + Agent Identity Go SDK",
    role: [
      "Wraps Google ADK / Gemini, MCP client, or LangChain.",
      "Registers every parent & sub-agent with SPIFFE workload certificate.",
      "Generates ephemeral ES256 DPoP keypair in memory only (never touches disk).",
      "Routes 100% of tool & network calls through the Layer 2 Gateway.",
    ],
    stores: "Short-lived DPoP-bound tokens in memory only.",
    standards: "OAuth 2.1 Client · RFC 9449 DPoP · SPIFFE Workload ID",
  },
  as: {
    title: "Layer 1: Go OAuth 2.1 Authorization Server",
    role: [
      "Verifies agent SPIFFE workload attestation.",
      "Runs OAuth 2.1 PKCE + RFC 9396 Rich Authorization Request (RAR) flow.",
      "Issues 5-minute DPoP-bound access tokens + single-use rotating refresh tokens.",
      "Executes RFC 8693 Token Exchange for sub-agents with nested 'act' claim.",
    ],
    stores: "Agent registry, versioned consents, Token Family DAG.",
    standards: "OAuth 2.1 · RFC 8693 · RFC 9396 · RFC 9449 · RFC 8707",
  },
  consent: {
    title: "Consent & OpenID CIBA Approvals",
    role: [
      "Renders exact paths, actions, and TTL in plain language.",
      "Dispatches asynchronous OpenID CIBA push requests for scores 0.30–0.75.",
      "Enforces 2-minute timeout defaulting to DENY.",
    ],
    stores: "Versioned audit consent records.",
    standards: "RFC 9396 (RAR) · OpenID CIBA",
  },
  risk: {
    title: "Layer 3: Two-Stage Risk Engine",
    role: [
      "Model 1 scores agent at token issuance (< 50 ms SLA, < 1 ms in Go).",
      "Model 2 scores every runtime action sequence at the gateway (< 30 ms SLA).",
      "Returns score (0.00–1.00), top feature reasons, and model version.",
    ],
    stores: "Online feature store + model weights.",
    standards: "Model 1 (Issuance) + Model 2 (Runtime Sequence Scorer)",
  },
  policy: {
    title: "Deterministic Tenant Policy Engine",
    role: [
      "Enforces hard rules per tenant (default-deny unknown egress, India data residency, no oversight config writes).",
      "Hard rules always override probabilistic risk scores.",
    ],
    stores: "Versioned Cedar / OPA-style tenant policies.",
    standards: "Cedar Policy Language (acme-in-v14)",
  },
  revoke: {
    title: "Keys & Token-Family Revocation Bus",
    role: [
      "Signs tokens with ES256 (P-256) keys; publishes next key 24h before rotation.",
      "Cascades parent revocation to all sub-agent children in < 1 ms.",
    ],
    stores: "JWKS (/.well-known/jwks.json) + Token Family DAG.",
    standards: "RFC 7517 JWKS · RFC 7638 JWK Thumbprint",
  },
  gateway: {
    title: "Layer 2: Inline Enforcement Gateway",
    role: [
      "The agent's ONLY route to MCP tools and external network hosts.",
      "Verifies ES256 signature, exp, aud, DPoP proof (cnf.jkt + ath), and revocation cache.",
      "Calls /decide and enforces Allow, CIBA Step-Up, or Block & Cascade Revoke.",
    ],
    stores: "Sub-second key & revocation cache.",
    standards: "MCP Tool Proxy · HTTP Egress Proxy · RFC 9449",
  },
  resources: {
    title: "Target Resources (APIs, Files, Databases)",
    role: [
      "Never receive unapproved or unscoped requests.",
      "Optionally verify ES256 token & act chain for defense-in-depth.",
    ],
    stores: "Enterprise business data.",
    standards: "OAuth 2.1 Resource Server",
  },
};

const NIST_TENETS = [
  {
    num: "01",
    tenet: "Distinct Agent Identification",
    impl: "Every parent & sub-agent registers via POST /api/v1/agents/register with SPIFFE ID and receives a unique client_id + ephemeral ES256 DPoP keypair (cnf.jkt).",
  },
  {
    num: "02",
    tenet: "Agent Linking, Delegation & Attenuation",
    impl: "Implements RFC 8693 Token Exchange with nested 'act' claims (user → parent → sub-agent). Sub-agent tokens have strictly shorter TTL (3m vs 5m) and narrowed scopes.",
  },
  {
    num: "03",
    tenet: "Least & Zero Standing Privileges",
    impl: "Agents start with zero permissions (Step 1), receive task-scoped RAR tokens (Step 9), and destroy the entire token family upon completion (Step 17).",
  },
  {
    num: "04",
    tenet: "Short-Lived, Dynamic & Revocable Authorizations",
    impl: "5-min access tokens, single-use rotating refresh tokens (replay revokes family), and sub-millisecond cascading revocation in the Go Token Family DAG.",
  },
  {
    num: "05",
    tenet: "Human-in-the-Loop (HITL) Triggers",
    impl: "Risk scores in the 0.30–0.75 band trigger OpenID CIBA (POST /bc-authorize) phone push notifications with a 2-minute default-deny timeout.",
  },
  {
    num: "06",
    tenet: "Mandates and Constraints",
    impl: "User consent captures explicit RFC 9396 authorization_details (file paths, actions, India data residency) versioned in the consent store.",
  },
  {
    num: "07",
    tenet: "Architectural Separation of Policy from Reasoning",
    impl: "The Go Enforcement Gateway (Layer 2) and Policy/Risk Engine (Layer 3) run outside the LLM runtime, stopping prompt-injected agents deterministically.",
  },
  {
    num: "08",
    tenet: "Deterministic Access Decisions",
    impl: "Cedar-style tenant rules (default-deny unknown egress, no monitoring config tampering, no destructive deletes) always override probabilistic scores.",
  },
  {
    num: "09",
    tenet: "Continuous Monitoring for Anomalous Behavior",
    impl: "Stage 2 Runtime Sequence Engine scores every tool and network call in < 1 ms at the gateway, catching denied-then-retried loops and untrusted context drift.",
  },
  {
    num: "10",
    tenet: "Tamper-Evident, Independent Logging",
    impl: "Every registration, consent, token exchange, DPoP proof, and gateway verdict streams into an independent audit log with full delegation chain provenance.",
  },
];

export default function BlueprintExplorer() {
  const [selectedNode, setSelectedNode] = useState<string>("gateway");
  const info = ARCH_NODES[selectedNode];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Interactive 13-Node System Architecture Map */}
      <div className="rounded-xl border border-[#223042] bg-[#121a24] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
              System Architecture Blueprint (Click Any Component Node)
            </span>
            <h2 className="text-lg font-bold text-slate-100">
              3-Layer Agent Identity Control Plane &amp; Inline Gateway
            </h2>
          </div>
          <a
            href="/artifacts/01_agent_authorization_blueprint.html"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-blue-400 hover:underline"
          >
            Open Original Full-Page Blueprint Artifact ↗
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {Object.entries(ARCH_NODES).map(([key, node]) => (
            <button
              key={key}
              onClick={() => setSelectedNode(key)}
              className={`text-left p-3 rounded-xl border transition ${
                selectedNode === key
                  ? "bg-blue-950/50 border-blue-500 text-white shadow-lg shadow-blue-600/15"
                  : "bg-[#16202e] border-slate-800 text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="font-mono text-[10px] uppercase text-blue-400">
                Node: {key}
              </div>
              <div className="text-xs font-bold mt-0.5 line-clamp-2">
                {node.title}
              </div>
            </button>
          ))}
        </div>

        {info && (
          <div className="rounded-xl bg-[#0b1017] border border-slate-800 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center gap-2 text-blue-400">
                <Layers className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">{info.title}</h3>
              </div>
              <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                {info.role.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 text-xs border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
              <div>
                <span className="text-slate-500 font-mono uppercase text-[10px] block">
                  State &amp; Storage
                </span>
                <span className="text-slate-200">{info.stores}</span>
              </div>
              <div>
                <span className="text-slate-500 font-mono uppercase text-[10px] block">
                  Cryptographic Standards
                </span>
                <span className="font-mono text-emerald-400 text-[11px]">
                  {info.standards}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Credential Lifetimes & Rotation Table */}
      <div className="rounded-xl border border-[#223042] bg-[#121a24] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base font-bold text-slate-100">
            Cryptographic Credential Lifetimes, Binding &amp; Rotation Schedule
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#182230] text-slate-300 font-mono text-[11px] uppercase">
              <tr>
                <th className="p-2.5 border-b border-slate-700">Credential</th>
                <th className="p-2.5 border-b border-slate-700">Lifetime</th>
                <th className="p-2.5 border-b border-slate-700">
                  Cryptographically Bound To
                </th>
                <th className="p-2.5 border-b border-slate-700">
                  Rotation / Revocation Behavior
                </th>
                <th className="p-2.5 border-b border-slate-700">Standard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              <tr>
                <td className="p-2.5 font-semibold text-white">
                  Authorization Code
                </td>
                <td className="p-2.5 font-mono text-amber-300">
                  60 s, single-use
                </td>
                <td className="p-2.5">PKCE S256 code_verifier</td>
                <td className="p-2.5">
                  Second use revokes every token issued from it
                </td>
                <td className="p-2.5 font-mono text-blue-300">
                  OAuth 2.1 + PKCE
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-white">
                  Parent Agent Access Token
                </td>
                <td className="p-2.5 font-mono text-emerald-300">5 min</td>
                <td className="p-2.5">
                  Agent in-memory DPoP key (cnf.jkt) + 1 aud
                </td>
                <td className="p-2.5">
                  Never refreshed in place; revocation pushed to gateways in
                  &lt; 1 ms
                </td>
                <td className="p-2.5 font-mono text-blue-300">
                  RFC 9449 · RFC 8707
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-white">
                  Sub-Agent Access Token
                </td>
                <td className="p-2.5 font-mono text-emerald-300">
                  ≤ 3 min (≤ parent)
                </td>
                <td className="p-2.5">
                  Sub-agent&apos;s own ephemeral DPoP key
                </td>
                <td className="p-2.5">
                  Scope can only shrink; revoking parent cascades to all
                  children
                </td>
                <td className="p-2.5 font-mono text-blue-300">
                  RFC 8693 (act claim)
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-white">
                  Rotating Refresh Token
                </td>
                <td className="p-2.5 font-mono text-amber-300">
                  Single-use (max 8h)
                </td>
                <td className="p-2.5">Agent DPoP key + Token Family DAG</td>
                <td className="p-2.5">
                  Rotated on every use; replay of old token revokes entire
                  family
                </td>
                <td className="p-2.5 font-mono text-blue-300">
                  OAuth 2.1 Rotation
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-white">
                  Fine-Grained Mandate (RAR)
                </td>
                <td className="p-2.5 font-mono">Task length (max 24h)</td>
                <td className="p-2.5">User + Agent + Task</td>
                <td className="p-2.5">
                  Instant withdrawal from console; next gateway call denied
                </td>
                <td className="p-2.5 font-mono text-blue-300">
                  RFC 9396 (RAR)
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-white">
                  Human Step-Up Push
                </td>
                <td className="p-2.5 font-mono text-amber-300">2 min TTL</td>
                <td className="p-2.5">User&apos;s registered mobile device</td>
                <td className="p-2.5">
                  Expires as deterministic DENY if unanswered
                </td>
                <td className="p-2.5 font-mono text-blue-300">OpenID CIBA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. NIST 10 Design Tenets & OpenID Foundation Alignment */}
      <div className="rounded-xl border border-[#223042] bg-[#121a24] p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-base font-bold text-slate-100">
              10/10 Compliance with NIST Agent Identity Design Tenets &amp;
              OpenID Foundation AIIM Stack
            </h3>
            <p className="text-xs text-slate-400">
              Direct implementation mapping to NIST Cybersecurity Insights,
              OpenID Foundation Agentic AI Whitepaper, and Okta AI Security
              Blueprint
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {NIST_TENETS.map((t) => (
            <div
              key={t.num}
              className="rounded-xl bg-[#0b1017] border border-slate-800 p-3.5 flex gap-3 items-start"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-100">
                  <span className="font-mono text-blue-400 mr-1.5">
                    Tenet #{t.num}
                  </span>
                  {t.tenet}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t.impl}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
