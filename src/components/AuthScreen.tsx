"use client";

import React, { useState } from "react";
import { GO_API_BASE } from "../lib/api";
import { Shield, Building2, Lock, Mail, User, Globe, ArrowRight } from "lucide-react";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  org_id: string;
  org_name: string;
  org_domain: string;
}

export interface AuthenticatedOrg {
  id: string;
  name: string;
  slug: string;
  domain: string;
  owner_email: string;
}

interface Props {
  onSuccess: (user: AuthenticatedUser, org: AuthenticatedOrg, token: string) => void;
}

export default function AuthScreen({ onSuccess }: Props) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint =
      mode === "signup" ? "/api/v1/auth/signup" : "/api/v1/auth/login";

    try {
      const res = await fetch(`${GO_API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || email.split("@")[0],
          email,
          password,
          org_name: orgName || email.split("@")[0] + "-org",
          org_domain: orgDomain,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setLoading(false);
        return;
      }
      onSuccess(data.user, data.organization, data.session_token);
    } catch {
      setError(
        "Could not reach the Go Authorization Server on http://localhost:8080. Make sure `go run ./cmd/server` is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/25">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {mode === "signup"
              ? "Create Your Organization"
              : "Sign in to Your Organization"}
          </h1>
          <p className="text-xs text-slate-500 max-w-xs">
            Agent Identity Cloud · OAuth 2.1 + DPoP Authorization Server,
            CAMD/DCR Onboarding &amp; Runtime Gateway
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`py-2 rounded-lg transition ${
              mode === "signup"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Create Organization
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`py-2 rounded-lg transition ${
              mode === "login"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === "signup" && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ajay Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Organization Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. ajay-test"
                      value={orgName}
                      onChange={(e) => {
                        setOrgName(e.target.value);
                        const slug = e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-");
                        if (slug) setOrgDomain(`${slug}.agentidentity.local`);
                      }}
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SPIFFE / OIDC Domain
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ajay-test.local"
                      value={orgDomain}
                      onChange={(e) => setOrgDomain(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition"
          >
            <span>
              {loading
                ? "Provisioning Organization..."
                : mode === "signup"
                  ? "Create Clean Organization & Launch Server"
                  : "Sign In to Dashboard"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Starts with <b>0 pre-filled demo agents</b> so you only see your own
          live Claude, Gemini, or CLI agents connecting in real time.
        </div>
      </div>
    </div>
  );
}
