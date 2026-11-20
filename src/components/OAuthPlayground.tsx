"use client";

import React, { useState } from "react";
import { GO_API_BASE } from "../lib/api";
import {
  AgentAccessTokenClaims,
  DPoPClaims,
  FamilyGraphSnapshot,
} from "../lib/types";
import {
  KeyRound,
  GitBranch,
  Send,
  ShieldCheck,
  ShieldAlert,
  Search,
  Lock,
} from "lucide-react";

export default function OAuthPlayground({
  initialAgentId,
}: {
  initialAgentId?: string;
}) {
  // Step 1: Mint Parent Token Form
  const [clientId, setClientId] = useState(
    initialAgentId || "agent:invoice-assistant"
  );
  const [userSub, setUserSub] = useState("user:priya@acme.in");
  const [scope, setScope] = useState("invoices.read");
  const [aud, setAud] = useState("https://gw.acme.local/tools/invoices");
  const [rarPath, setRarPath] = useState("/finance/invoices/2026-Q3");
  const [rarActions, setRarActions] = useState("read");

  // Active Minted Credentials
  const [accessToken, setAccessToken] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState<string>("");
  const [tokenClaims, setTokenClaims] =
    useState<AgentAccessTokenClaims | null>(null);
  const [dpopProof, setDpopProof] = useState<string>("");
  const [dpopClaims, setDpopClaims] = useState<DPoPClaims | null>(null);
  const [familyGraph, setFamilyGraph] = useState<FamilyGraphSnapshot | null>(
    null
  );

  // Step 2: RFC 8693 Sub-Agent Token Exchange
  const [subAgentId, setSubAgentId] = useState(
    "agent:invoice-assistant/summariser"
  );
  const [subScope, setSubScope] = useState("invoices.read");

  // Step 3: Live Gateway Test Request
  const [gwMethod, setGwMethod] = useState("GET");
  const [gwHost, setGwHost] = useState("gw.acme.local");
  const [gwPath, setGwPath] = useState("/finance/invoices/2026-Q3");
  const [gwAction, setGwAction] = useState("read");
  const [untrustedCtx, setUntrustedCtx] = useState(false);
  const [simulateStolenReplay, setSimulateStolenReplay] = useState(false);
  const [gwResult, setGwResult] = useState<Record<string, unknown> | null>(
    null
  );
  const [introspectResult, setIntrospectResult] = useState<Record<
    string,
    unknown
  > | null>(null);

  async function handleMintToken(e: React.FormEvent) {
    e.preventDefault();
    setGwResult(null);
    setIntrospectResult(null);
    const actions = rarActions
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`${GO_API_BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "interactive_mint",
          client_id: clientId,
          user_sub: userSub,
          scope,
          aud,
          task: `Interactive OAuth 2.1 + RAR Mandate for ${rarPath}`,
          authorization_details: [
            {
              type: "file_access",
              locations: [rarPath],
              actions,
              data_residency: "IN",
            },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);
        setTokenClaims(data.claims);
        setDpopProof(data.dpop_proof_sample);
        setDpopClaims(data.dpop_claims_sample);
        setFamilyGraph(data.family_graph);
        return;
      }
    } catch {
      // Offline deterministic fallback
    }

    const now = Math.floor(Date.now() / 1000);
    const mockClaims: AgentAccessTokenClaims = {
      iss: "https://auth.agentidentity.local",
      sub: userSub,
      client_id: clientId,
      aud,
      scope,
      jti: "tok_parent_" + Math.random().toString(36).slice(2, 8),
      family_id: "fam_" + Math.random().toString(36).slice(2, 8),
      iat: now,
      exp: now + 300,
      cnf: { jkt: "0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I" },
      authorization_details: [
        {
          type: "file_access",
          locations: [rarPath],
          actions,
          data_residency: "IN",
        },
      ],
      risk: { issuance_score: 0.12, model: "issuance-xgb-v3" },
    };
    setAccessToken(
      "eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9." +
        btoa(JSON.stringify(mockClaims)) +
        ".ES256_SIGNATURE"
    );
    setRefreshToken("rt_rot_" + Math.random().toString(36).slice(2, 8));
    setTokenClaims(mockClaims);
    setDpopClaims({
      jti: "dpop_" + Math.random().toString(36).slice(2, 8),
      htm: "GET",
      htu: aud,
      iat: now,
    });
  }

  async function handleTokenExchange() {
    if (!accessToken) return;
    try {
      const res = await fetch(`${GO_API_BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          subject_token: accessToken,
          actor_client_id: subAgentId,
          scope: subScope,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccessToken(data.access_token);
        setTokenClaims(data.claims);
        setDpopProof(data.dpop_proof_sample);
        setDpopClaims(data.dpop_claims_sample);
        setFamilyGraph(data.family_graph);
      } else {
        setGwResult(data);
      }
    } catch {
      if (tokenClaims) {
        const subC: AgentAccessTokenClaims = {
          ...tokenClaims,
          client_id: subAgentId,
          scope: subScope,
          jti: "tok_sub_" + Math.random().toString(36).slice(2, 8),
          parent_jti: tokenClaims.jti,
          exp: tokenClaims.iat + 180,
          act: {
            sub: tokenClaims.client_id,
            act: { sub: tokenClaims.sub },
          },
        };
        setTokenClaims(subC);
      }
    }
  }

  async function handleIntrospect() {
    if (!accessToken) return;
    try {
      const res = await fetch(`${GO_API_BASE}/oauth/introspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: accessToken }),
      });
      if (res.ok) {
        setIntrospectResult(await res.json());
        return;
      }
    } catch {
      // fallback
    }
    setIntrospectResult({
      active: true,
      ...tokenClaims,
    });
  }

  async function handleExecuteGatewayCall() {
    if (!accessToken) return;
    const targetURI = `https://${gwHost}${gwPath}`;

    try {
      let proofToUse = dpopProof;
      if (simulateStolenReplay) {
        // Forge a DPoP proof signed by a different attacker keypair
        const forgeRes = await fetch(`${GO_API_BASE}/oauth/dpop-sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken,
            http_method: gwMethod,
            target_uri: targetURI,
            simulate_theft: true,
          }),
        });
        if (forgeRes.ok) {
          const fData = await forgeRes.json();
          proofToUse = fData.dpop_proof;
        }
      }

      const res = await fetch(`${GO_API_BASE}/api/v1/gateway/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          dpop_proof: proofToUse,
          http_method: gwMethod,
          target_uri: targetURI,
          target_host: gwHost,
          resource_path: gwPath,
          action: gwAction,
          untrusted_context: untrustedCtx,
        }),
      });
      const data = await res.json();
      setGwResult(data);
      if (data.family_graph) {
        setFamilyGraph(data.family_graph);
      }
    } catch {
      setGwResult({
        allowed: !simulateStolenReplay && gwHost.endsWith(".acme.local"),
        http_status:
          simulateStolenReplay || !gwHost.endsWith(".acme.local") ? 403 : 200,
        note: "Evaluated by local fallback",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-[#223042] bg-[#121a24] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
            Interactive OAuth 2.1 + DPoP + RFC 8693 + Gateway Sandbox
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            Live Authorization Server &amp; Inline Gateway Testbench
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Mint real <code>ES256</code> DPoP-bound access tokens with custom{" "}
            <code>RFC 9396</code> Rich Authorization Requests, exchange them
            for attenuated sub-agent tokens via <code>RFC 8693</code>,
            introspect token status (<code>RFC 7662</code>), and fire live
            requests against the Go Enforcement Gateway.
          </p>
        </div>
        <a
          href={`${GO_API_BASE}/.well-known/openid-configuration`}
          target="_blank"
          rel="noreferrer"
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 font-mono text-xs border border-slate-700"
        >
          /.well-known/openid-configuration ↗
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (6 cols): Step 1 Mint, Step 2 Exchange, Step 3 Gateway Call */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* STEP 1: Mint OAuth 2.1 + PKCE + RAR + DPoP Token */}
          <form
            onSubmit={handleMintToken}
            className="rounded-xl border border-[#223042] bg-[#121a24] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <KeyRound className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">
                  Step 1 · Issue OAuth 2.1 + RAR + DPoP Token (POST /oauth/token)
                </h3>
              </div>
              <span className="font-mono text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                PKCE S256 + ES256
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Agent Client ID
                </label>
                <input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-2.5 py-1.5 text-blue-300 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Human Subject (sub)
                </label>
                <input
                  value={userSub}
                  onChange={(e) => setUserSub(e.target.value)}
                  className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  OAuth Scope &amp; Target Audience (RFC 8707)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="rounded-lg bg-[#0b1017] border border-slate-700 px-2 py-1.5 text-emerald-300 font-mono"
                  />
                  <input
                    value={aud}
                    onChange={(e) => setAud(e.target.value)}
                    className="rounded-lg bg-[#0b1017] border border-slate-700 px-2 py-1.5 text-slate-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  RFC 9396 RAR Path &amp; Allowed Actions
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={rarPath}
                    onChange={(e) => setRarPath(e.target.value)}
                    className="rounded-lg bg-[#0b1017] border border-slate-700 px-2 py-1.5 text-white font-mono"
                  />
                  <input
                    value={rarActions}
                    onChange={(e) => setRarActions(e.target.value)}
                    className="rounded-lg bg-[#0b1017] border border-slate-700 px-2 py-1.5 text-amber-300 font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow"
            >
              Mint Live ES256 Access Token + Ephemeral DPoP Proof
            </button>
          </form>

          {/* STEP 2: RFC 8693 Sub-Agent Token Exchange */}
          <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <GitBranch className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">
                  Step 2 · RFC 8693 Sub-Agent Token Exchange (Attenuation &amp;
                  act Chain)
                </h3>
              </div>
              <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                TTL 5m → 3m
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Sub-Agent Client ID
                </label>
                <input
                  value={subAgentId}
                  onChange={(e) => setSubAgentId(e.target.value)}
                  className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-2.5 py-1.5 text-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Attenuated Sub-Agent Scope
                </label>
                <input
                  value={subScope}
                  onChange={(e) => setSubScope(e.target.value)}
                  className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTokenExchange}
                disabled={!accessToken}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition"
              >
                Exchange Parent Token for Sub-Agent Token (RFC 8693)
              </button>
              <button
                type="button"
                onClick={handleIntrospect}
                disabled={!accessToken}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                Introspect (RFC 7662)
              </button>
            </div>
          </div>

          {/* STEP 3: Fire Request Through Layer 2 Enforcement Gateway */}
          <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <Send className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">
                  Step 3 · Fire Live Tool / Network Call via Layer 2 Gateway
                </h3>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                POST /api/v1/gateway/execute
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">HTTP Method</label>
                <select
                  value={gwMethod}
                  onChange={(e) => setGwMethod(e.target.value)}
                  className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-2.5 py-1.5 text-white font-mono"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Target Host (Try evil-exfil.example)
                </label>
                <input
                  value={gwHost}
                  onChange={(e) => setGwHost(e.target.value)}
                  className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Action (read / export_all / delete)
                </label>
                <input
                  value={gwAction}
                  onChange={(e) => setGwAction(e.target.value)}
                  className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-2.5 py-1.5 text-amber-300 font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Resource Path</label>
              <input
                value={gwPath}
                onChange={(e) => setGwPath(e.target.value)}
                className="w-full rounded-lg bg-[#0b1017] border border-slate-700 px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div className="flex flex-wrap gap-4 pt-1 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={untrustedCtx}
                  onChange={(e) => setUntrustedCtx(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Inject Untrusted Prompt Context (+0.34 Risk)</span>
              </label>
              <label className="flex items-center gap-2 text-rose-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateStolenReplay}
                  onChange={(e) => setSimulateStolenReplay(e.target.checked)}
                  className="accent-rose-500"
                />
                <span>
                  Simulate Stolen Token Replay (Mismatch DPoP Private Key)
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleExecuteGatewayCall}
              disabled={!accessToken}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold transition shadow"
            >
              Execute Request Through Go Enforcement Gateway
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (6 cols): Live Token Output, Introspection & Gateway Response */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Gateway Decision Result */}
          {gwResult && (
            <div
              className={`rounded-xl border p-4 space-y-2 ${
                gwResult.allowed
                  ? "border-emerald-500/50 bg-emerald-950/20"
                  : "border-rose-500/50 bg-rose-950/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {gwResult.allowed ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                  )}
                  <span className="text-sm font-bold text-white">
                    Gateway Verdict: HTTP {String(gwResult.http_status)} ·{" "}
                    {gwResult.allowed ? "ALLOWED" : "BLOCKED / STEP-UP"}
                  </span>
                </div>
                {Boolean(gwResult.gateway_latency_us) && (
                  <span className="font-mono text-xs text-slate-300">
                    {String(gwResult.gateway_latency_us)} µs
                  </span>
                )}
              </div>
              <pre className="rounded-lg bg-[#080d14] border border-slate-800 p-3 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-64">
                {JSON.stringify(gwResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Introspection Output */}
          {introspectResult && (
            <div className="rounded-xl border border-blue-500/40 bg-[#121a24] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase text-blue-400">
                  RFC 7662 Token Introspection Response (POST /oauth/introspect)
                </span>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                    introspectResult.active
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  active: {String(introspectResult.active)}
                </span>
              </div>
              <pre className="rounded-lg bg-[#080d14] border border-slate-800 p-3 text-[11px] font-mono text-blue-200 overflow-x-auto max-h-56">
                {JSON.stringify(introspectResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Active Minted JWT & DPoP Inspector */}
          <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
                Active Minted Access Token (at+jwt) &amp; DPoP Proof
              </span>
              {refreshToken && (
                <span className="font-mono text-[11px] text-slate-400">
                  Refresh Token: <code>{refreshToken}</code>
                </span>
              )}
            </div>

            {!tokenClaims ? (
              <div className="py-10 text-center text-slate-400 flex flex-col items-center gap-2">
                <Lock className="w-6 h-6 text-slate-500" />
                <p className="text-xs">
                  Click &ldquo;Mint Live ES256 Access Token&rdquo; on the left
                  to generate a real cryptographic token and DPoP proof.
                </p>
              </div>
            ) : (
              <>
                <div className="text-[11px] font-mono bg-[#080d14] border border-slate-800 rounded-lg p-2.5 text-slate-400 break-all">
                  <b className="text-slate-200">Raw ES256 JWT:</b>{" "}
                  {accessToken.slice(0, 120)}...
                </div>
                <pre className="rounded-lg bg-[#080d14] border border-slate-800 p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                  {JSON.stringify(tokenClaims, null, 2)}
                </pre>
                {dpopClaims && (
                  <pre className="rounded-lg bg-[#080d14] border border-slate-800 p-2.5 text-[11px] font-mono text-blue-200 overflow-x-auto">
                    {JSON.stringify(dpopClaims, null, 2)}
                  </pre>
                )}
                {familyGraph && (
                  <div className="rounded-lg bg-[#0b1017] border border-slate-800 p-3 text-xs space-y-1.5">
                    <div className="font-mono text-[11px] text-slate-400">
                      Token Family DAG (<code>{familyGraph.family_id}</code>) ·
                      Status:{" "}
                      <b
                        className={
                          familyGraph.revoked
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }
                      >
                        {familyGraph.revoked ? "REVOKED" : "ACTIVE"}
                      </b>
                    </div>
                    {familyGraph.nodes.map((n) => (
                      <div
                        key={n.jti}
                        className="flex items-center justify-between font-mono text-[11px] bg-slate-900/70 px-2.5 py-1 rounded"
                      >
                        <span>
                          {n.token_type}: {n.client_id} ({n.jti})
                        </span>
                        <span
                          className={
                            n.status === "REVOKED"
                              ? "text-rose-400 font-bold"
                              : "text-emerald-400"
                          }
                        >
                          {n.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
