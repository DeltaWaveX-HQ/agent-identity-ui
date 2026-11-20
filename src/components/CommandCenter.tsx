"use client";

import React, { useEffect, useState, useRef } from "react";
import { TelemetryEvent, PhonePrompt } from "../lib/types";
import { GO_API_BASE, getSimulatedScenarioSteps } from "../lib/api";
import SequenceTrace from "./SequenceTrace";
import CryptoInspector from "./CryptoInspector";
import PhoneSimulator from "./PhoneSimulator";
import {
  Play,
  ShieldAlert,
  Smartphone,
  KeyRound,
  OctagonAlert,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from "lucide-react";

const FLOW_NODES = [
  { id: "start", code: "A", title: "Agent Created (Zero Standing Privileges)" },
  { id: "attest", code: "B", title: "SPIFFE Workload Attestation + DPoP Key" },
  { id: "score1", code: "C", title: "Stage 1 Issuance Risk Score (< 50 ms)" },
  { id: "consent", code: "D", title: "User Fine-Grained RAR Consent (RFC 9396)" },
  { id: "token", code: "E", title: "5-Min DPoP-Bound Access Token Issued" },
  { id: "exchange", code: "F", title: "RFC 8693 Sub-Agent Token Exchange (act)" },
  { id: "call", code: "G", title: "Every Call Routed via Layer 2 Gateway" },
  { id: "runtime", code: "H", title: "Stage 2 Runtime Risk + Cedar Policy (< 30 ms)" },
  { id: "allow", code: "I", title: "Allowed → Forwarded to Resource & Audited" },
  { id: "revoke", code: "J", title: "Blocked / CIBA Denied → Cascade Revoke (< 1 ms)" },
  { id: "end", code: "K", title: "Task Complete: All Passes Destroyed" },
];

export default function CommandCenter() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeAct, setActiveAct] = useState<string>("act1_normal");
  const [goBackendLive, setGoBackendLive] = useState<boolean>(false);
  const [phonePrompt, setPhonePrompt] = useState<PhonePrompt | null>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to Go SSE Stream if Go server is running on :8080; otherwise run deterministic fallback
  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`${GO_API_BASE}/health`, {
          signal: AbortSignal.timeout(1200),
        });
        if (!res.ok) throw new Error("Go backend offline");
        if (cancelled) return;
        setGoBackendLive(true);

        es = new EventSource(`${GO_API_BASE}/api/v1/events/stream`);
        es.onmessage = (msg) => {
          try {
            const ev: TelemetryEvent = JSON.parse(msg.data);
            setEvents((prev) => {
              const exists = prev.some((p) => p.id === ev.id);
              const next = exists ? prev : [...prev, ev];
              setSelectedIndex(next.length - 1);
              return next;
            });
            if (ev.phone_prompt) {
              setPhonePrompt(
                ev.phone_prompt.type === "dismiss" ? null : ev.phone_prompt
              );
            }
          } catch {
            // ignore malformed frame
          }
        };
      } catch {
        if (!cancelled) {
          setGoBackendLive(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (es) es.close();
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  function runClientSideSimulation(actID: string) {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    setActiveAct(actID);
    setPhonePrompt(null);
    const steps = getSimulatedScenarioSteps(actID);
    setEvents([]);
    setSelectedIndex(0);

    let i = 0;
    simTimerRef.current = setInterval(() => {
      if (i >= steps.length) {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        return;
      }
      const raw = steps[i];
      const ev: TelemetryEvent = {
        ...raw,
        id: `sim_${actID}_${i}`,
        timestamp: new Date().toISOString(),
      };
      setEvents((prev) => {
        const next = [...prev, ev];
        setSelectedIndex(next.length - 1);
        return next;
      });
      if (ev.phone_prompt) {
        setPhonePrompt(
          ev.phone_prompt.type === "dismiss" ? null : ev.phone_prompt
        );
      }
      i++;
    }, 320);
  }

  async function triggerScenario(actID: string, interactive = false) {
    setActiveAct(actID);
    setPhonePrompt(null);
    if (goBackendLive) {
      try {
        setEvents([]);
        await fetch(
          `${GO_API_BASE}/api/v1/scenarios/${actID}?interactive=${interactive}`,
          { method: "POST" }
        );
        return;
      } catch {
        setGoBackendLive(false);
      }
    }
    runClientSideSimulation(actID);
  }

  async function triggerKillSwitch() {
    if (goBackendLive) {
      try {
        await fetch(`${GO_API_BASE}/api/v1/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason:
              "Emergency SecOps Kill Switch Triggered from Agent Identity Command Center",
          }),
        });
        return;
      } catch {
        // fallback
      }
    }
    const killEv: TelemetryEvent = {
      id: `kill_${Date.now()}`,
      timestamp: new Date().toISOString(),
      step_number: events.length + 1,
      from_lane: "as",
      to_lane: "gw",
      label: "KILL SWITCH → Revoke All (<1ms)",
      who: "SecOps Console → Revocation Bus",
      headline:
        "Emergency Kill Switch Activated: All Active Agent Token Families Revoked!",
      plain_text:
        "Parent, sub-agent, and refresh tokens terminated across all gateways in 19 µs.",
      under_the_hood:
        "POST /api/v1/revoke · Instant token-family DAG termination",
      flow_node: "revoke",
      status: "bad",
      status_text: "Kill Switch Executed",
      latency_us: 19,
      family_graph: {
        family_id: "fam_01JCK9X",
        user_sub: "user:priya@acme.in",
        root_agent_id: "agent:invoice-assistant",
        revoked: true,
        revoke_reason: "Emergency SecOps Kill Switch Triggered",
        propagation_us: 19,
        nodes:
          events[selectedIndex]?.family_graph?.nodes.map((n) => ({
            ...n,
            status: "REVOKED",
          })) || [],
      },
    };
    setEvents((prev) => {
      const next = [...prev, killEv];
      setSelectedIndex(next.length - 1);
      return next;
    });
  }

  async function handleApproveConsent(consentId: string, actions: string[]) {
    setPhonePrompt(null);
    if (goBackendLive) {
      await fetch(`${GO_API_BASE}/api/v1/oauth/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_id: consentId, actions }),
      });
    }
  }

  async function handleResolveCiba(authReqId: string, approved: boolean) {
    setPhonePrompt(null);
    if (goBackendLive) {
      await fetch(`${GO_API_BASE}/api/v1/oauth/ciba-resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth_req_id: authReqId, approved }),
      });
      return;
    }
    // Client-side resolution step for Act 2
    const step13: TelemetryEvent = approved
      ? {
          id: `ciba_res_${Date.now()}`,
          timestamp: new Date().toISOString(),
          step_number: 13,
          from_lane: "user",
          to_lane: "gw",
          label: "CIBA Approved → Forward",
          who: "Priya's Phone → Gateway → Resource",
          headline:
            "Priya approved CIBA push: Gateway releases single transaction",
          plain_text:
            "Human-in-the-loop step-up verified. Gateway forwards ₹45,000 payment and logs cryptographic CIBA receipt.",
          under_the_hood: `auth_req_id=${authReqId} APPROVED · Audited in append-only log`,
          flow_node: "allow",
          status: "ok",
          status_text: "CIBA Approved",
          latency_us: 115,
          token_claims: events[selectedIndex]?.token_claims,
          family_graph: events[selectedIndex]?.family_graph,
        }
      : {
          id: `ciba_res_${Date.now()}`,
          timestamp: new Date().toISOString(),
          step_number: 13,
          from_lane: "user",
          to_lane: "gw",
          label: "CIBA Denied → 403 & Revoke",
          who: "Priya's Phone → Gateway",
          headline:
            "Priya denied CIBA push: Payment blocked & entire token family revoked",
          plain_text:
            "No money moved. Parent and sub-agent tokens revoked across all gateways in 19 µs.",
          under_the_hood: `auth_req_id=${authReqId} DENIED · Family fam_01JCK9X REVOKED`,
          flow_node: "revoke",
          status: "bad",
          status_text: "Blocked by Human",
          latency_us: 19,
          token_claims: events[selectedIndex]?.token_claims,
          family_graph: {
            family_id: "fam_01JCK9X",
            user_sub: "user:priya@acme.in",
            root_agent_id: "agent:invoice-assistant",
            revoked: true,
            revoke_reason:
              "User Denied OpenID CIBA Step-Up Push for ₹45,000 Payment",
            propagation_us: 19,
            nodes:
              events[selectedIndex]?.family_graph?.nodes.map((n) => ({
                ...n,
                status: "REVOKED",
              })) || [],
          },
        };
    setEvents((prev) => {
      const next = [...prev, step13];
      setSelectedIndex(next.length - 1);
      return next;
    });
  }

  const currentEvent = events[selectedIndex] || null;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Scenario Launcher Bar */}
      <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => triggerScenario("act1_normal", false)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
              activeAct === "act1_normal"
                ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20"
                : "bg-[#182230] text-slate-300 border-slate-700 hover:border-blue-500"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Act 1: Normal Multi-Agent Delegation
          </button>

          <button
            onClick={() => triggerScenario("act2_ciba", false)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
              activeAct === "act2_ciba"
                ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/20"
                : "bg-[#182230] text-slate-300 border-slate-700 hover:border-amber-500"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Act 2: Medium-Risk CIBA Phone Step-Up
          </button>

          <button
            onClick={() => triggerScenario("act3_injection", false)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
              activeAct === "act3_injection"
                ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/20"
                : "bg-[#182230] text-slate-300 border-slate-700 hover:border-rose-500"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Act 3: Prompt Injection Exfil &amp; Auto-Revoke
          </button>

          <button
            onClick={() => triggerScenario("act4_dpop_replay", false)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
              activeAct === "act4_dpop_replay"
                ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/20"
                : "bg-[#182230] text-slate-300 border-slate-700 hover:border-purple-500"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Act 4: Stolen Token Replay (DPoP Defense)
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Engine:</span>
            <span className="text-emerald-400 font-semibold">
              {goBackendLive
                ? "Go 1.23 Live SSE (:8080)"
                : "Go Spec Deterministic Simulator"}
            </span>
          </div>

          <button
            onClick={triggerKillSwitch}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 transition"
          >
            <OctagonAlert className="w-3.5 h-3.5" />
            Kill Switch
          </button>
        </div>
      </div>

      {/* Main 3-Pane Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (3 cols): Step Detail Card, Phone Simulator & Decision Flowchart */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* Active Step Narrative Card */}
          <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
                {currentEvent
                  ? `Step ${currentEvent.step_number || selectedIndex + 1} · ${currentEvent.who}`
                  : "Initializing..."}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setSelectedIndex((i) => Math.max(0, i - 1))
                  }
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Previous Step"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    setSelectedIndex((i) =>
                      Math.min(events.length - 1, i + 1)
                    )
                  }
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Next Step"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {currentEvent && (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      currentEvent.status === "bad"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : currentEvent.status === "warn"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : currentEvent.status === "ok"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    }`}
                  >
                    {currentEvent.status_text}
                  </span>
                  {currentEvent.latency_us && (
                    <span className="font-mono text-xs text-slate-400">
                      {currentEvent.latency_us} µs
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-100 leading-snug">
                  {currentEvent.headline}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentEvent.plain_text}
                </p>

                <div className="border-l-2 border-blue-500/60 pl-2.5 py-1 text-[11px] font-mono text-slate-400 bg-slate-900/50 rounded-r">
                  {currentEvent.under_the_hood}
                </div>
              </>
            )}
          </div>

          {/* Interactive Virtual Smartphone (RAR Consent & OpenID CIBA Push) */}
          <PhoneSimulator
            prompt={phonePrompt}
            onApproveConsent={handleApproveConsent}
            onResolveCiba={handleResolveCiba}
          />

          {/* Compact Decision State Machine Flowchart */}
          <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
              Runtime State Machine
            </span>
            <div className="flex flex-col gap-1.5">
              {FLOW_NODES.map((fn) => {
                const isCurrent = currentEvent?.flow_node === fn.id;
                const isBad =
                  isCurrent &&
                  (currentEvent?.status === "bad" || fn.id === "revoke");
                return (
                  <div
                    key={fn.id}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs flex items-center gap-2 transition ${
                      isBad
                        ? "border-rose-500 bg-rose-950/40 text-rose-200 font-semibold"
                        : isCurrent
                          ? "border-blue-500 bg-blue-950/40 text-blue-200 font-semibold"
                          : "border-slate-800 bg-slate-900/40 text-slate-400"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-slate-500 w-4">
                      {fn.code}
                    </span>
                    <span className="truncate">{fn.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN (5 cols): Live 6-Lane Sequence Trace */}
        <div className="lg:col-span-5">
          <SequenceTrace
            events={events}
            selectedIndex={selectedIndex}
            onSelectStep={setSelectedIndex}
          />
        </div>

        {/* RIGHT COLUMN (4 cols): Cryptographic JWT/DPoP & Token Family DAG Inspector */}
        <div className="lg:col-span-4">
          <CryptoInspector event={currentEvent} />
        </div>
      </div>
    </div>
  );
}
