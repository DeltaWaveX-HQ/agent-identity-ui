"use client";

import React, { useState } from "react";
import { GO_API_BASE } from "../lib/api";
import {
  Shield,
  Building2,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  org_id: string;
  role: string;
}

export interface AuthenticatedOrg {
  id: string;
  name: string;
  domain: string;
  plan?: string;
  auto_dcr_enabled?: boolean;
  camd_enabled?: boolean;
  crm_delegation_enabled?: boolean;
}

interface AuthScreenProps {
  onSuccess: (
    user: AuthenticatedUser,
    org: AuthenticatedOrg,
    token: string
  ) => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("Ajay Sharma");
  const [orgName, setOrgName] = useState("DeltaWaveX Org");
  const [email, setEmail] = useState("ajay@deltawavex.in");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        mode === "signup" ? "/api/v1/auth/signup" : "/api/v1/auth/login";
      const payload =
        mode === "signup"
          ? { name, org_name: orgName, email, password }
          : { email, password };

      const res = await fetch(`${GO_API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setLoading(false);
        return;
      }
      onSuccess(data.user, data.organization, data.session_token || "session");
    } catch {
      setError(
        "Cannot connect to Go Authorization Server at http://localhost:8080"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between relative overflow-hidden">
      {/* Subtle Cryptographic Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, #000 40%, transparent 100%)",
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-900 leading-none">
              Agent Identity
            </div>
            <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mt-1">
              Enterprise AI Security Gateway
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-700">
              Gateway Online
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-[11px] text-slate-500">
              OAuth 2.1 / DPoP · :8080
            </span>
          </div>
          <a
            href="http://localhost:8080/.well-known/oauth-authorization-server"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>OIDC Discovery</span>
          </a>
        </div>
      </header>

      {/* Main Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px] bg-white rounded-xl border border-slate-200 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.08)] p-7 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-semibold">
                ENTERPRISE GATEWAY
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                KMS ES256 Attested
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight pt-1">
              {mode === "login" ? "Tenant Sign-In" : "Create Organization"}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Access your cryptographically bound AI agent gateway, RFC 9396 RAR
              consent hub, and real-time enforcement audit trail.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === "signup"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Organization
            </button>
          </div>

          {/* Detected Workspace Bar */}
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Workspace Tenant
                </div>
                <div className="font-mono text-xs font-semibold text-slate-800 truncate">
                  {mode === "signup" ? orgName || "new-org" : "deltawavex-prod"}
                  <span className="text-slate-400 font-normal">
                    .deltawavex.in
                  </span>
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-600">
              PROD
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Organization Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="DeltaWaveX Org"
                      className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Admin Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ajay Sharma"
                      className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ajay@deltawavex.in"
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-colors disabled:opacity-60"
            >
              <span>
                {loading
                  ? "Authenticating..."
                  : mode === "login"
                  ? "Sign In to Security Gateway"
                  : "Create Organization & Launch Gateway"}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              RFC 7591 · 8693 · 9396 · 9449
            </span>
            <span className="font-mono text-slate-400">demo: demo1234</span>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-[11px] text-slate-400 font-mono">
        Agent Identity Control Plane · Zero-Trust MCP &amp; AI Agent IAM
      </footer>
    </div>
  );
}
