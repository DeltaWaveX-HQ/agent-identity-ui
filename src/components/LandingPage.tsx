"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Shield,
  ArrowRight,
  Rocket,
  Box,
  Bot,
  Sparkles,
  Brain,
  Terminal,
  Network,
  Lock,
  Ban,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Fingerprint,
  GitBranch,
  Scale,
  FolderLock,
  GitCommitHorizontal,
  MessageSquare,
  Cloud,
  Database,
  KeyRound,
  FileCode2,
  Check,
  Hand,
} from "lucide-react";

interface LandingPageProps {
  onTryNow: () => void;
}

type SimMode = "normal" | "attack" | "ciba";
type CodeTab = "jwt" | "cedar" | "mcp";

export default function LandingPage({ onTryNow }: LandingPageProps) {
  const [simMode, setSimMode] = useState<SimMode>("normal");
  const [codeTab, setCodeTab] = useState<CodeTab>("jwt");
  const [hudCoords, setHudCoords] = useState({ x: 22, y: 192 });
  const [rotation, setRotation] = useState({ x: -12, y: 25 });
  const [isDragging, setIsDragging] = useState(false);
  const [simLog, setSimLog] = useState(
    "Agent Claude Sonnet issued RFC 9449 token exchange for Ajay (user:ajay@deltawavex.in) → Cedar PERMIT → MCP Gateway <0.18ms"
  );

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotRef = useRef({ x: -12, y: 25 });

  useEffect(() => {
    function handleWindowMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      const next = {
        x: rotRef.current.x - dy * 0.7,
        y: rotRef.current.y + dx * 0.7,
      };
      rotRef.current = next;
      setRotation(next);
    }
    function handleWindowMouseUp() {
      if (isDragging) setIsDragging(false);
    }
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDragging]);

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setHudCoords({
        x: Math.max(0, Math.round(e.clientX - rect.left)),
        y: Math.max(0, Math.round(e.clientY - rect.top)),
      });
    }
    if (!isDragging && stageRef.current) {
      const sRect = stageRef.current.getBoundingClientRect();
      const cx = sRect.left + sRect.width / 2;
      const cy = sRect.top + sRect.height / 2;
      const dx = (e.clientX - cx) / sRect.width;
      const dy = (e.clientY - cy) / sRect.height;
      const next = {
        x: -12 - dy * 18,
        y: 25 + dx * 26,
      };
      rotRef.current = next;
      setRotation(next);
    }
  }

  function handleSelectMode(mode: SimMode) {
    setSimMode(mode);
    if (mode === "normal") {
      setSimLog(
        "Agent Claude Sonnet issued RFC 9449 token exchange for Ajay (user:ajay@deltawavex.in) → Cedar PERMIT → MCP Gateway <0.18ms"
      );
    } else if (mode === "attack") {
      setSimLog(
        "SECURITY EXCEPTION: Prompt injection attempted unauthorized export to evil-exfil.example. Intercepted & revoked sub-tree DAG in 0.04ms."
      );
    } else {
      setSimLog(
        "OIDC CIBA STEP-UP: High-sensitivity financial transfer paused. Out-of-band approval prompt dispatched to human delegator."
      );
    }
  }

  function handlePulseAgent(agentName: string) {
    setSimMode("normal");
    setSimLog(
      `Interactive Trigger: ${agentName} generated ephemeral ES256 DPoP challenge. RFC 8693 child token verified in <0.18ms.`
    );
  }

  const agentsList = [
    { name: "Anthropic Claude", icon: Bot, highlight: true },
    { name: "OpenAI GPT-4o", icon: Sparkles, highlight: false },
    { name: "Google Gemini", icon: Brain, highlight: true },
    { name: "Cursor & Windsurf", icon: Terminal, highlight: false },
    { name: "MCPJam & MCP Daemons", icon: Network, highlight: true },
  ];

  const targetsList = [
    { name: "Sandboxed Workspace", badge: "Protected", icon: FolderLock },
    { name: "GitHub Repos", badge: "Signed", icon: GitCommitHorizontal },
    { name: "Slack & Teams", badge: "CIBA", icon: MessageSquare },
    { name: "AWS Cloud IAM", badge: "Federated", icon: Cloud },
    { name: "Postgres & Invoices", badge: "Zero-Exfil", icon: Database },
  ];

  return (
    <div className="min-h-screen bg-[#050507] text-[#f0f1f5] antialiased selection:bg-[#FF5500] selection:text-white overflow-x-hidden">
      {/* =====================================================================
          FIXED GLASS HEADER
          ===================================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050507]/90 backdrop-blur-xl border-b border-white/10">
        <div className="h-16 max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FF5500] flex items-center justify-center shadow-lg shadow-[#FF5500]/30 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[15px] text-white tracking-tight leading-none">
                Agent Identity
              </span>
              <span className="font-mono text-[10px] text-[#FF6A00] tracking-widest uppercase leading-none mt-1 font-semibold">
                DELTAWAVEX ENCLAVE · 3D HUD
              </span>
            </div>
          </div>

          <nav className="hidden xl:flex items-center gap-6 text-xs font-medium text-white/70">
            <a
              href="#pipeline-showcase"
              className="hover:text-white transition-colors"
            >
              3D Blueprint Topology
            </a>
            <a
              href="#rfc-standards"
              className="hover:text-white transition-colors"
            >
              Protocols
            </a>
            <a
              href="#code-viewer"
              className="hover:text-white transition-colors"
            >
              Specs &amp; Code
            </a>
            <a
              href="#proof-benchmarks"
              className="hover:text-white transition-colors"
            >
              Ecosystem
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#0e0e14] rounded-lg border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
              <span className="font-mono text-[11px] text-white/80">
                Fabric v2.4 · &lt;0.24ms P99
              </span>
            </div>
            <button
              type="button"
              onClick={onTryNow}
              className="text-xs font-medium text-white/75 hover:text-white hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onTryNow}
              className="inline-flex items-center justify-center text-xs bg-[#FF5500] text-white hover:bg-[#FF6A00] px-4 py-1.5 rounded-lg shadow-md shadow-[#FF5500]/25 transition-all group gap-1.5 font-semibold"
            >
              <span>Try Now</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full pt-16">
        {/* ===================================================================
            SECTION 1: COSMIC TECHNICAL HERO
            =================================================================== */}
        <div className="relative w-full overflow-hidden bg-gradient-to-b from-[#050507] via-[#09090e] to-[#050507]">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#FF5500 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[960px] h-[420px] bg-gradient-to-b from-[#FF5500]/20 via-[#FF6A00]/10 to-transparent blur-3xl pointer-events-none rounded-full" />

          <section className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-12 pb-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0e0e14] border border-[#FF5500]/30 rounded-full shadow-lg shadow-[#FF5500]/10 mb-5">
              <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
              <span className="font-mono text-[11px] text-white/90 font-medium">
                RFC 9449 DPoP
              </span>
              <span className="text-white/25 font-mono text-[11px]">•</span>
              <span className="font-mono text-[11px] text-[#FF7A1A] font-semibold">
                Latency &lt; 0.24ms
              </span>
              <span className="text-white/25 font-mono text-[11px]">•</span>
              <span className="font-mono text-[11px] text-white/80 font-medium">
                OAuth 2.1 + MCP Gateway
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-[54px] lg:leading-[60px] font-semibold text-white tracking-tight max-w-4xl mb-4">
              The Zero-Trust Identity Gateway for{" "}
              <span className="bg-gradient-to-r from-[#FF5500] via-[#FF6A00] to-[#FF7A1A] bg-clip-text text-transparent">
                Autonomous AI Agents
              </span>
            </h1>

            <p className="text-sm sm:text-base text-white/70 max-w-2xl mb-8 leading-relaxed">
              Stop handing out raw API keys. Bind every agent and child
              sub-agent action to verifiable human provenance with cryptographic
              proof of possession in under 0.2ms.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 mb-8">
              <button
                type="button"
                onClick={onTryNow}
                className="group inline-flex items-center gap-2 px-6 py-3.5 bg-[#FF5500] text-white rounded-lg shadow-lg hover:bg-[#FF6A00] shadow-[#FF5500]/30 hover:shadow-[#FF5500]/50 transition-all text-xs sm:text-sm font-semibold"
              >
                <Rocket className="w-4 h-4" />
                <span>Try Now — Launch Free Console</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#pipeline-showcase"
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-[#0e0e14] text-white hover:bg-[#161620] rounded-lg border border-white/10 transition-all text-xs sm:text-sm font-medium"
              >
                <Box className="w-4 h-4 text-[#FF6A00]" />
                <span>Inspect 3D Blueprint Enclave</span>
              </a>
            </div>

            {/* Metric Pills Strip */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl">
              {[
                {
                  dot: "bg-[#FF5500]",
                  k: "RFC 9449 DPoP:",
                  v: "100% Bound",
                  accent: false,
                },
                {
                  dot: "bg-[#FF6A00]",
                  k: "RFC 8693 DAG:",
                  v: "Human Delegator Provenance",
                  accent: false,
                },
                {
                  dot: "bg-[#FF7A1A]",
                  k: "Overhead:",
                  v: "< 0.24ms P99",
                  accent: true,
                },
                {
                  dot: "bg-white",
                  k: "Exfiltration Egress:",
                  v: "0 Leaks",
                  accent: false,
                },
              ].map((m) => (
                <div
                  key={m.k}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#0e0e14] border border-white/10 rounded-full"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                  <span className="font-mono text-[11px] text-white/50">
                    {m.k}
                  </span>
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      m.accent ? "text-[#FF7A1A]" : "text-white"
                    }`}
                  >
                    {m.v}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* =================================================================
              SECTION 2: INTERACTIVE 3D GATEWAY ENCLAVE
              ================================================================= */}
          <section
            id="pipeline-showcase"
            className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 pb-16"
          >
            <div
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              className="relative bg-[#08080C] border border-[#FF5500]/30 rounded-2xl p-4 lg:p-6 shadow-2xl shadow-[#FF5500]/10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-blueprint-grid pointer-events-none opacity-40" />
              <div className="absolute top-3 left-4 font-mono text-[10px] text-[#FF6A00]/65 tracking-widest pointer-events-none select-none hidden sm:block">
                SYS.ID // DWX-GATEWAY-MESH-3D · SPEC REV 4.9.1
              </div>

              {/* Dynamic Cursor Coordinates HUD */}
              <div className="absolute top-3 right-4 hidden md:flex items-center gap-2 font-mono text-[11px] text-white/90 bg-[#050507]/90 border border-white/15 px-3 py-1 rounded-md backdrop-blur select-none z-30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
                <span className="text-white/40">LOC:</span>
                <span className="text-[#FF6A00] font-semibold">
                  X: {String(hudCoords.x).padStart(4, "0")}PX · Y:{" "}
                  {String(hudCoords.y).padStart(4, "0")}PX
                </span>
                <span className="text-white/30">|</span>
                <span className="text-white/40">ROT:</span>
                <span className="text-white font-semibold">
                  Y: {Math.round(rotation.y)}° X: {Math.round(rotation.x)}°
                </span>
              </div>

              {/* Header Controls Strip */}
              <div className="relative z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10 mt-6">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#FF5500] shadow-md shadow-[#FF5500]/60 animate-pulse shrink-0" />
                  <div>
                    <h2 className="text-[15px] text-white font-semibold flex flex-wrap items-center gap-2">
                      Interactive 3D Gateway Enclave
                      <span className="font-mono text-[10px] px-2 py-0.5 bg-[#FF5500]/15 text-[#FF6A00] border border-[#FF5500]/40 rounded font-semibold tracking-wider">
                        HARDWARE SECURE ROTATABLE
                      </span>
                    </h2>
                    <p className="text-xs text-white/60">
                      Drag cube to rotate 3D enclave. Simulate real-time
                      verification of autonomous agent authorization payloads.
                    </p>
                  </div>
                </div>

                {/* Scenario Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#0e0e14] p-1.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleSelectMode("normal")}
                    className={`px-3 py-1.5 rounded text-[11px] font-semibold transition-all ${
                      simMode === "normal"
                        ? "bg-[#FF5500] text-white shadow-md shadow-[#FF5500]/30"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Normal Dispatch (✓ Valid)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectMode("attack")}
                    className={`px-3 py-1.5 rounded text-[11px] font-semibold transition-all ${
                      simMode === "attack"
                        ? "bg-white text-black shadow-md"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Simulate Injection (✕ Blocked)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectMode("ciba")}
                    className={`px-3 py-1.5 rounded text-[11px] font-semibold transition-all ${
                      simMode === "ciba"
                        ? "bg-[#FF7A1A] text-white shadow-md shadow-[#FF7A1A]/40"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Human Step-Up (▲ CIBA)
                  </button>
                </div>
              </div>

              {/* 3-Column Topology Stage */}
              <div className="relative w-full min-h-[470px] py-6 overflow-hidden flex flex-col justify-center select-none">
                {/* Animated SVG Lasers (Desktop) */}
                <svg
                  className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-0"
                  viewBox="0 0 1200 470"
                  preserveAspectRatio="none"
                >
                  {[75, 155, 235, 315, 395].map((y, idx) => (
                    <g key={y}>
                      <path
                        d={`M 270 ${y} C 420 ${y}, 420 235, 510 235`}
                        fill="none"
                        stroke="rgba(255,85,0,0.22)"
                        strokeWidth="1.5"
                      />
                      <path
                        d={`M 270 ${y} C 420 ${y}, 420 235, 510 235`}
                        fill="none"
                        stroke={idx % 2 === 0 ? "#FF5500" : "#FF6A00"}
                        strokeWidth="2"
                        className="cosmic-laser"
                      />
                      <path
                        d={`M 690 235 C 780 235, 780 ${y}, 930 ${y}`}
                        fill="none"
                        stroke="rgba(255,106,0,0.22)"
                        strokeWidth="1.5"
                      />
                      {simMode !== "attack" && (
                        <path
                          d={`M 690 235 C 780 235, 780 ${y}, 930 ${y}`}
                          fill="none"
                          stroke={simMode === "ciba" ? "#FF7A1A" : "#FF6A00"}
                          strokeWidth="2"
                          className="cosmic-laser-fast"
                        />
                      )}
                    </g>
                  ))}
                </svg>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* LEFT: Autonomous AI Agents */}
                  <div className="lg:col-span-4 flex flex-col gap-2.5 max-w-sm w-full mx-auto lg:mx-0">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <span className="font-mono text-[11px] text-white/70 uppercase tracking-widest font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                        AUTONOMOUS AGENTS
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 bg-[#FF5500]/10 border border-[#FF5500]/30 rounded text-[#FF6A00]">
                        DPoP CLIENTS
                      </span>
                    </div>
                    {agentsList.map((ag) => {
                      const Icon = ag.icon;
                      return (
                        <button
                          key={ag.name}
                          type="button"
                          onClick={() => handlePulseAgent(ag.name)}
                          className="p-2.5 bg-[#0e0e14]/90 backdrop-blur border border-white/10 hover:border-[#FF5500] rounded-xl flex items-center justify-between transition-all group text-left hover:shadow-[0_0_15px_rgba(255,85,0,0.22)]"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                ag.highlight
                                  ? "bg-[#FF5500]/20 border border-[#FF5500]/40 text-[#FF6A00]"
                                  : "bg-white/5 border border-white/10 text-white"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-[13px] text-white font-semibold group-hover:text-[#FF6A00] transition-colors">
                              {ag.name}
                            </span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                        </button>
                      );
                    })}
                  </div>

                  {/* CENTER: Rotatable 3D Cube Enclave + Precision HUD */}
                  <div className="lg:col-span-4 flex flex-col items-center justify-center px-2 py-4">
                    <div
                      ref={stageRef}
                      onMouseDown={(e) => {
                        setIsDragging(true);
                        dragStartRef.current = { x: e.clientX, y: e.clientY };
                      }}
                      className={`relative w-full max-w-xs perspective-1000 flex flex-col items-center justify-center ${
                        isDragging ? "cursor-grabbing" : "cursor-grab"
                      }`}
                    >
                      <div
                        className={`absolute w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
                          simMode === "attack"
                            ? "bg-red-600/30"
                            : "bg-[#FF5500]/20"
                        }`}
                      />

                      {/* 3D Cube */}
                      <div
                        className="relative w-[140px] h-[140px] preserve-3d my-7 transition-transform duration-75"
                        style={{
                          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                        }}
                      >
                        <div
                          className="cube-face cube-face-front"
                          style={{
                            borderColor:
                              simMode === "attack"
                                ? "rgba(255,60,60,0.9)"
                                : "rgba(255,106,0,0.65)",
                          }}
                        >
                          <div className="flex flex-col items-center text-center p-2">
                            {simMode === "attack" ? (
                              <Ban className="w-8 h-8 text-red-500" />
                            ) : simMode === "ciba" ? (
                              <Fingerprint className="w-8 h-8 text-[#FF7A1A]" />
                            ) : (
                              <Lock className="w-8 h-8 text-[#FF6A00]" />
                            )}
                            <span className="font-mono text-[9px] text-[#FF7A1A] tracking-wider font-bold mt-1.5">
                              ENCLAVE v2.4
                            </span>
                            <span className="font-mono text-[8px] text-white/60">
                              ES256 KMS
                            </span>
                          </div>
                        </div>
                        <div className="cube-face cube-face-back">
                          <div className="flex flex-col items-center text-center font-mono text-[9px] text-[#FF6A00]">
                            <span className="font-bold">CEDAR v3.1</span>
                            <span className="text-[8px] text-white/70">
                              POLICY ENGINE
                            </span>
                            <span className="text-[8px] text-emerald-400 mt-1">
                              PERMIT
                            </span>
                          </div>
                        </div>
                        <div className="cube-face cube-face-right">
                          <div className="flex flex-col items-center text-center font-mono text-[9px] text-white">
                            <span className="text-[#FF6A00] font-bold">
                              RFC 9449
                            </span>
                            <span className="text-[8px] text-white/60">
                              DPoP BOUND
                            </span>
                            <span className="text-[8px] text-[#FF7A1A] mt-1">
                              ES256 KEY
                            </span>
                          </div>
                        </div>
                        <div className="cube-face cube-face-left">
                          <div className="flex flex-col items-center text-center font-mono text-[9px] text-white">
                            <span className="text-[#FF6A00] font-bold">
                              RFC 8693
                            </span>
                            <span className="text-[8px] text-white/60">
                              TOKEN DAG
                            </span>
                            <span className="text-[8px] text-white/80 mt-1">
                              HUMAN ACT
                            </span>
                          </div>
                        </div>
                        <div className="cube-face cube-face-top">
                          <span className="font-mono text-[8px] text-[#FF6A00] tracking-widest uppercase">
                            ENCLAVE SECURE
                          </span>
                        </div>
                        <div className="cube-face cube-face-bottom">
                          <span className="font-mono text-[8px] text-white/40 tracking-wider">
                            SPIFFE ATT
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/50 tracking-wider mb-3">
                        <Hand className="w-3 h-3 text-[#FF6A00]" />
                        <span>DRAG OR MOVE MOUSE TO INSPECT 3D ENCLAVE</span>
                      </div>
                    </div>

                    {/* Gateway Status HUD Card */}
                    <div
                      className={`w-full max-w-sm rounded-xl backdrop-blur-md p-3 shadow-xl transition-all ${
                        simMode === "attack"
                          ? "bg-[#140808]/95 border-2 border-red-500 shadow-red-500/20"
                          : simMode === "ciba"
                          ? "bg-[#140e08]/95 border-2 border-[#FF7A1A] shadow-[#FF7A1A]/20"
                          : "bg-[#0b0b0f]/95 border border-[#FF5500]/40 shadow-[#FF5500]/15"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full animate-ping ${
                              simMode === "attack"
                                ? "bg-red-500"
                                : simMode === "ciba"
                                ? "bg-[#FF7A1A]"
                                : "bg-[#FF5500]"
                            }`}
                          />
                          <span
                            className={`font-mono text-[11px] font-bold tracking-wider uppercase ${
                              simMode === "attack"
                                ? "text-red-400"
                                : simMode === "ciba"
                                ? "text-[#FF7A1A]"
                                : "text-white"
                            }`}
                          >
                            {simMode === "attack"
                              ? "INJECTION BLOCKED"
                              : simMode === "ciba"
                              ? "AWAITING CIBA STEP-UP"
                              : "GATEWAY CORE SECURE"}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                            simMode === "attack"
                              ? "text-red-400 bg-red-500/10 border-red-500/30"
                              : "text-[#FF7A1A] bg-[#FF5500]/10 border-[#FF5500]/30"
                          }`}
                        >
                          {simMode === "attack"
                            ? "DROPPED (0.04ms)"
                            : simMode === "ciba"
                            ? "PAUSED"
                            : "< 0.18ms"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                        <div className="p-2 bg-[#111116] border border-white/5 rounded-lg flex items-center justify-between">
                          <span className="text-white/80 flex items-center gap-1">
                            {simMode === "attack" ? (
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6A00]" />
                            )}
                            RFC 9449
                          </span>
                          <span
                            className={
                              simMode === "attack"
                                ? "text-red-400 font-bold"
                                : "text-[#FF7A1A] font-bold"
                            }
                          >
                            {simMode === "attack" ? "Tamper" : "Bound"}
                          </span>
                        </div>
                        <div className="p-2 bg-[#111116] border border-white/5 rounded-lg flex items-center justify-between">
                          <span className="text-white/80 flex items-center gap-1">
                            {simMode === "attack" ? (
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            ) : simMode === "ciba" ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-[#FF7A1A]" />
                            ) : (
                              <Scale className="w-3.5 h-3.5 text-[#FF6A00]" />
                            )}
                            Cedar
                          </span>
                          <span
                            className={
                              simMode === "attack"
                                ? "text-red-400 font-bold"
                                : "text-[#FF7A1A] font-bold"
                            }
                          >
                            {simMode === "attack"
                              ? "Deny"
                              : simMode === "ciba"
                              ? "Step-Up"
                              : "Permit"}
                          </span>
                        </div>
                        <div className="p-2 bg-[#111116] border border-white/5 rounded-lg flex items-center justify-between">
                          <span className="text-white/80 flex items-center gap-1">
                            <GitBranch className="w-3.5 h-3.5 text-[#FF6A00]" />
                            Actor DAG
                          </span>
                          <span className="text-[#FF7A1A] font-bold">
                            {simMode === "attack" ? "Revoked" : "Proven"}
                          </span>
                        </div>
                        <div className="p-2 bg-[#111116] border border-white/5 rounded-lg flex items-center justify-between">
                          <span className="text-white/80 flex items-center gap-1">
                            <Fingerprint className="w-3.5 h-3.5 text-white/50" />
                            CIBA
                          </span>
                          <span
                            className={
                              simMode === "ciba"
                                ? "text-[#FF7A1A] font-bold"
                                : "text-white/50"
                            }
                          >
                            {simMode === "ciba" ? "Push Sent" : "Active"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Enterprise Targets */}
                  <div className="lg:col-span-4 flex flex-col gap-2.5 max-w-sm w-full mx-auto lg:ml-auto lg:mr-0">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <span className="font-mono text-[11px] text-white/70 uppercase tracking-widest font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF7A1A] animate-pulse" />
                        ENTERPRISE TARGETS
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded text-[#FF7A1A]">
                        ZERO TRUST
                      </span>
                    </div>
                    {targetsList.map((t) => {
                      const Icon = t.icon;
                      return (
                        <div
                          key={t.name}
                          className="p-2.5 bg-[#0e0e14]/90 backdrop-blur border border-white/10 hover:border-[#FF6A00] rounded-xl flex items-center justify-between transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-[13px] text-white font-semibold">
                              {t.name}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] px-2 py-0.5 bg-[#FF5500]/15 text-[#FF7A1A] border border-[#FF5500]/30 rounded font-semibold">
                            {t.badge}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Live Blueprint Audit Log Strip */}
              <div className="mt-4 p-3 bg-[#050507] border border-[#FF5500]/30 rounded-xl text-white font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping shrink-0" />
                  <span className="text-[#FF6A00] font-bold shrink-0">
                    [LIVE AUDIT LOG]
                  </span>
                  <span className="text-white/90 truncate">{simLog}</span>
                </div>
                <span className="text-[#FF7A1A] text-[11px] font-semibold bg-[#FF5500]/15 px-2 py-0.5 rounded border border-[#FF5500]/30 shrink-0 self-start sm:self-auto">
                  100% Cryptographically Bound
                </span>
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 3: RFC & PROTOCOL STANDARDS
              ================================================================= */}
          <section
            id="rfc-standards"
            className="max-w-7xl mx-auto px-4 lg:px-8 py-14"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF5500]/15 border border-[#FF5500]/30 rounded-full mb-2">
                  <Shield className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span className="font-mono text-[11px] text-[#FF7A1A] font-semibold uppercase tracking-wider">
                    Zero-Trust Specifications
                  </span>
                </div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">
                  Formal IETF Specifications, Not Hallucinatory Guardrails
                </h2>
              </div>
              <p className="text-xs text-white/60 max-w-md">
                Enforced cryptographically at the wire level so prompt-injection
                attacks cannot bypass authorization logic.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  badge: "RFC 9449",
                  icon: KeyRound,
                  title: "DPoP Proof of Possession",
                  desc: "Ephemeral ES256 asymmetric keys prevent token replay if an agent leaks bearer secrets in logs.",
                },
                {
                  badge: "RFC 8693",
                  icon: GitBranch,
                  title: "Actor DAG Delegation",
                  desc: "Binds human delegators (sub) with autonomous parent & child sub-agents (act) for unforgeable audit trails.",
                },
                {
                  badge: "Cedar v3.1",
                  icon: Scale,
                  title: "Inline Policy Engine",
                  desc: "Formally structured access rules & default-deny egress executed inline in < 1 ms.",
                },
                {
                  badge: "OIDC CIBA",
                  icon: Fingerprint,
                  title: "Human Step-Up Approval",
                  desc: "Out-of-band human confirmation before agents execute irreversible payments or deletes.",
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.badge}
                    className="p-5 bg-[#0e0e14] border border-white/10 hover:border-[#FF5500]/50 rounded-xl transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[11px] px-2 py-0.5 bg-[#FF5500]/20 text-[#FF6A00] border border-[#FF5500]/40 font-semibold rounded">
                        {card.badge}
                      </span>
                      <Icon className="w-4 h-4 text-[#FF6A00]" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1.5">
                      {card.title}
                    </h3>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =================================================================
              SECTION 4: INTERACTIVE CODE & TOKEN PROOF INSPECTOR
              ================================================================= */}
          <section
            id="code-viewer"
            className="max-w-7xl mx-auto px-4 lg:px-8 py-14"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF5500]/15 border border-[#FF5500]/30 rounded-full">
                  <FileCode2 className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span className="font-mono text-[11px] text-[#FF7A1A] font-semibold uppercase tracking-wider">
                    Cryptographic Difference
                  </span>
                </div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">
                  Static API Keys vs Cryptographic Gateway
                </h2>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                  Traditional bearer tokens grant all-or-nothing privileges.
                  Agent Identity generates cryptographic micro-credentials bound
                  to exact directory paths and human delegators.
                </p>
                <div className="space-y-2 pt-1">
                  {[
                    { k: "Replay Protection", v: "ES256 DPoP Bound" },
                    { k: "Human Provenance", v: "RFC 8693 Actor Claims" },
                    {
                      k: "Revocation Granularity",
                      v: "Instant Sub-Tree DAG Kill",
                    },
                  ].map((r) => (
                    <div
                      key={r.k}
                      className="p-3 bg-[#0e0e14] border border-white/10 rounded-lg flex items-center justify-between text-xs"
                    >
                      <span className="text-white font-medium">{r.k}</span>
                      <span className="font-mono text-[11px] text-[#FF7A1A] font-semibold">
                        {r.v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 bg-[#08080C] rounded-2xl overflow-hidden shadow-2xl border border-[#FF5500]/30">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#0e0e14] border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: "jwt", label: "Decoded RFC 8693 JWT" },
                        { id: "cedar", label: "Cedar DSL Policy" },
                        { id: "mcp", label: "MCP Gateway Config" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCodeTab(t.id)}
                        className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                          codeTab === t.id
                            ? "bg-[#FF5500] text-white shadow-md shadow-[#FF5500]/30"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-[#FF7A1A] font-mono text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
                    <span>Hardware Enclave Attested</span>
                  </div>
                </div>

                <div className="p-5 font-mono text-xs text-[#f0f1f5] overflow-x-auto leading-relaxed">
                  {codeTab === "jwt" && (
                    <pre className="m-0">{`{
  "iss": "http://localhost:8080",
  "sub": "user:ajay@deltawavex.in",       // Human Delegator
  "client_id": "agent:dcr-mcpjam/mcp-worker",
  "act": {
    "sub": "agent:dcr-mcpjam-inspector-agent", // Parent AI Actor
    "act_type": "rfc8693_sub_agent"
  },
  "cnf": { "jkt": "q9FEJdfOiniUVv50...CKVVM" }, // ES256 DPoP Key
  "authorization_details": [{
    "locations": ["/finance/invoices/2026-Q3"],
    "actions": ["read"]
  }]
}`}</pre>
                  )}
                  {codeTab === "cedar" && (
                    <pre className="m-0">{`permit (
  principal is DeltaWaveX::Agent,
  action in [Action::"read"],
  resource in Resource::"FinanceInvoices"
)
when {
  context.delegation.human_sub == "user:ajay@deltawavex.in" &&
  context.dpop_verified == true &&
  resource.host == "invoices.acme.local"
};`}</pre>
                  )}
                  {codeTab === "mcp" && (
                    <pre className="m-0">{`{
  "mcpServers": {
    "agent-identity-gateway": {
      "url": "http://localhost:8090/sse"
    }
  }
}`}</pre>
                  )}
                </div>

                <div className="px-4 py-2 bg-[#0e0e14] border-t border-white/10 flex items-center justify-between text-white/50 font-mono text-[11px]">
                  <span>ES256 Signature Verified</span>
                  <span className="text-[#FF7A1A] font-medium">
                    P99 Inline Proxy Overhead: 0.18ms
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 5: ECOSYSTEM & TESTIMONIALS
              ================================================================= */}
          <section
            id="proof-benchmarks"
            className="max-w-7xl mx-auto px-4 lg:px-8 py-12"
          >
            <div className="text-center mb-10">
              <span className="font-mono text-[11px] text-white/60 tracking-wider uppercase font-semibold">
                Seamlessly Integrated Across The Autonomous Stack
              </span>
              <div className="flex flex-wrap items-center justify-center gap-8 mt-5 text-sm font-semibold text-white">
                <span className="inline-flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#FF5500]" /> Anthropic Claude
                </span>
                <span className="inline-flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#FF6A00]" /> Google Gemini
                </span>
                <span className="inline-flex items-center gap-2">
                  <Network className="w-4 h-4 text-[#FF7A1A]" /> MCP Protocol
                </span>
                <span className="inline-flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-white" /> Cursor &amp;
                  MCPJam
                </span>
                <span className="inline-flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#FF5500]" /> Enterprise IAM
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  quote:
                    '"The RFC 8693 sub-to-act delegation graph gave our auditors the verifiable human accountability trail they demanded without slowing down engineering velocity."',
                  initials: "EW",
                  name: "Elena Rostova",
                  role: "VP of AI Security, FinScale",
                },
                {
                  quote:
                    '"Sub-millisecond latency is not hyperbole here. The proxy intercepts every Claude Code, Gemini, and MCPJam tool operation with under 0.3ms overhead."',
                  initials: "MC",
                  name: "Marcus Chen",
                  role: "Head of Core Infra, DevGrid",
                },
                {
                  quote:
                    '"The cascading killswitch saved our databases during a prompt injection red-team drill. Terminating the parent agent collapsed every child worker immediately."',
                  initials: "DR",
                  name: "David Reinhardt",
                  role: "CISO, Apex Global",
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className="p-5 bg-[#0e0e14] border border-white/10 rounded-xl flex flex-col justify-between hover:border-[#FF5500]/40 transition-all"
                >
                  <p className="text-xs text-white/80 leading-relaxed mb-4">
                    {t.quote}
                  </p>
                  <div className="flex items-center gap-2.5 pt-3 border-t border-white/10">
                    <div className="w-8 h-8 rounded-full bg-[#FF5500]/20 border border-[#FF5500]/30 flex items-center justify-center font-semibold text-[#FF6A00] text-xs">
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {t.name}
                      </div>
                      <div className="text-[11px] text-white/50">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* =================================================================
              SECTION 6: CLOSING CTA BANNER
              ================================================================= */}
          <section className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 pb-16">
            <div className="relative w-full bg-[#08080C] border border-[#FF5500]/40 text-white rounded-2xl p-8 lg:p-10 overflow-hidden shadow-2xl">
              <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-[#FF5500]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF5500]/15 border border-[#FF5500]/30 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                  <span className="font-mono text-[11px] text-[#FF7A1A] font-semibold uppercase tracking-wider">
                    Local Proxy &amp; Cloud Gateway Ready
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  Ready to Secure Your Autonomous Agents in 5 Minutes?
                </h2>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                  Sign in to your tenant console to configure RFC policies,
                  connect MCPJam / Claude / Gemini, and inspect live human-to-agent
                  delegation trees.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onTryNow}
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#FF5500] text-white hover:bg-[#FF6A00] text-xs sm:text-sm font-semibold rounded-lg shadow-lg shadow-[#FF5500]/30 transition-all group"
                  >
                    <span>Try Now — Launch Tenant Sign-In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="pt-2 flex flex-wrap items-center gap-5 font-mono text-[11px] text-white/55">
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-[#FF6A00]" /> Live MCP
                    Gateway (:8090)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-[#FF6A00]" /> Instant
                    Sub-Tree Revocation
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-[#FF6A00]" /> ES256 DPoP
                    + OAuth 2.1
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
