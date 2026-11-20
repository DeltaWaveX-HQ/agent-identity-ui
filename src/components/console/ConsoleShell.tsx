"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Bot,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  Shield,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Approval, consoleApi } from "../../lib/console-api";
import {
  ActivityPage,
  AgentDetailPage,
  AgentsPage,
  ApprovalCard,
  ApprovalsPage,
  ConnectPage,
  GrantsPage,
  OverviewPage,
  PoliciesPage,
} from "./pages";
import { Toaster } from "./ui";

interface Props {
  user: { name: string; email: string };
  org: { name: string; domain: string };
  onLogout: () => void;
}

const NAV: { group: string; items: { path: string; label: string; icon: React.ElementType }[] }[] = [
  { group: "", items: [{ path: "/overview", label: "Overview", icon: LayoutDashboard }] },
  { group: "Directory", items: [{ path: "/agents", label: "Agents", icon: Bot }] },
  {
    group: "Access",
    items: [
      { path: "/grants", label: "Access grants", icon: KeyRound },
      { path: "/approvals", label: "Approvals", icon: UserCheck },
    ],
  },
  {
    group: "Security",
    items: [
      { path: "/policies", label: "Policies", icon: ShieldCheck },
      { path: "/connect", label: "Connect & tools", icon: Plug },
    ],
  },
  { group: "Reports", items: [{ path: "/activity", label: "Activity log", icon: Activity }] },
];

function readPath() {
  if (typeof window === "undefined") return "/overview";
  return window.location.hash.replace(/^#/, "") || "/overview";
}

export default function ConsoleShell({ user, org, onLogout }: Props) {
  const [path, setPath] = useState("/overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [live, setLive] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPath(readPath());
    const onHash = () => setPath(readPath());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((p: string) => {
    window.location.hash = p;
    setMobileNav(false);
    window.scrollTo({ top: 0 });
  }, []);

  // Coalesce bursts of events into one refresh.
  const refresh = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setRefreshKey((k) => k + 1), 250);
  }, []);

  // Live updates from the backend event stream (GET /api/v1/events/stream), plus a slow poll as a fallback.
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(consoleApi.eventStreamUrl());
      es.onopen = () => setLive(true);
      es.onerror = () => setLive(false);
      es.onmessage = () => refresh();
    } catch {
      setLive(false);
    }
    const poll = setInterval(refresh, 15000);
    return () => {
      es?.close();
      clearInterval(poll);
    };
  }, [refresh]);

  useEffect(() => {
    consoleApi.approvals().then(setApprovals).catch(() => setApprovals([]));
  }, [refreshKey]);

  const top = "/" + (path.split("/")[1] || "overview");
  const agentId = path.startsWith("/agents/") ? decodeURIComponent(path.slice("/agents/".length)) : null;

  let page: React.ReactNode;
  if (agentId) page = <AgentDetailPage id={agentId} refreshKey={refreshKey} navigate={navigate} onChanged={refresh} />;
  else if (top === "/agents") page = <AgentsPage refreshKey={refreshKey} navigate={navigate} />;
  else if (top === "/grants") page = <GrantsPage refreshKey={refreshKey} navigate={navigate} onChanged={refresh} />;
  else if (top === "/approvals") page = <ApprovalsPage refreshKey={refreshKey} onChanged={refresh} />;
  else if (top === "/policies") page = <PoliciesPage refreshKey={refreshKey} onChanged={refresh} />;
  else if (top === "/connect") page = <ConnectPage refreshKey={refreshKey} />;
  else if (top === "/activity") page = <ActivityPage refreshKey={refreshKey} navigate={navigate} />;
  else page = <OverviewPage refreshKey={refreshKey} navigate={navigate} />;

  const initials = (user.name || user.email).split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
          <Shield className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">Agent Identity</div>
          <div className="text-[11px] text-slate-500">Admin console</div>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map((g) => (
          <div key={g.group || "main"}>
            {g.group && <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.group}</div>}
            {g.items.map((it) => {
              const active = top === it.path;
              const Icon = it.icon;
              const badge = it.path === "/approvals" && approvals.length > 0 ? approvals.length : null;
              return (
                <button
                  key={it.path}
                  type="button"
                  onClick={() => navigate(it.path)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm ${active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${active ? "text-blue-600" : "text-slate-400"}`} />
                    {it.label}
                  </span>
                  {badge && <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">{badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
        <div className="font-medium text-slate-700 truncate">{org.name}</div>
        <div className="truncate">{org.domain}</div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>
      {mobileNav && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setMobileNav(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-slate-300"}`} />
              {live ? "Live" : "Connecting…"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate("/approvals")} className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Approvals">
              <Bell className="h-5 w-5" />
              {approvals.length > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />}
            </button>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-slate-800">{user.name}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">{initials}</div>
            <button type="button" onClick={onLogout} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Sign out" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{page}</main>
      </div>

      <Toaster />

      {/* Approvals can't wait for someone to open the right page: they expire in 2 minutes. */}
      {approvals.length > 0 && top !== "/approvals" && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 pt-1 text-xs font-semibold text-amber-800">
            <span>Needs your approval</span>
            <button type="button" onClick={() => navigate("/approvals")} className="flex items-center gap-1 text-amber-700 hover:underline">
              Open approvals
            </button>
          </div>
          {approvals.slice(0, 2).map((a) => (
            <div key={a.auth_req_id}>
              <ApprovalCard a={a} onDone={refresh} compact />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
