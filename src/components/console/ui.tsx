"use client";

import React, { useEffect, useState } from "react";
import { timeLeft } from "../../lib/console-api";

type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

const toneClass: Record<Tone, string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warn: "bg-amber-50 text-amber-800 ring-amber-600/20",
  bad: "bg-rose-50 text-rose-700 ring-rose-600/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  active: "ok",
  approved: "ok",
  allow: "ok",
  idle: "neutral",
  pending: "warn",
  "step-up": "warn",
  expired: "neutral",
  revoked: "bad",
  denied: "bad",
  block_and_revoke: "bad",
};

export function StatusPill({ status }: { status: string }) {
  const tone = statusTone[status] || "neutral";
  return (
    <Pill tone={tone}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : tone === "bad" ? "bg-rose-500" : "bg-slate-400"}`} />
      {status.replace(/_/g, " ")}
    </Pill>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", padded = true }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {actions}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: Tone }) {
  const color = tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const v = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300",
    danger: "bg-white text-rose-600 hover:bg-rose-50 border-rose-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent",
  }[variant];
  const s = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm";
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${v} ${s}`}>
      {children}
    </button>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/60">
            {head.map((h) => (
              <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3 align-middle ${className}`}>{children}</td>;
}

/** Re-renders every second so expiry times count down live. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function Countdown({ expiresAt }: { expiresAt: number }) {
  const now = useNow();
  const left = expiresAt - now;
  const tone = left <= 0 ? "text-slate-400" : left < 120 ? "text-amber-600" : "text-slate-600";
  return <span className={`tabular-nums text-xs ${tone}`}>{timeLeft(expiresAt, now)}</span>;
}

export function ActionChips({ actions }: { actions: string[] | null | undefined }) {
  if (!actions || actions.length === 0) return <span className="text-xs text-slate-400">—</span>;
  const label: Record<string, string> = { read: "Read", write: "Change", payment_transfer: "Money", export: "Send out" };
  return (
    <div className="flex flex-wrap gap-1">
      {actions.map((a) => (
        <span key={a} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${a === "payment_transfer" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
          {label[a] || a}
        </span>
      ))}
    </div>
  );
}

/** Extra permissions a human allowed for a limited time, shown with a live countdown. */
export function TempChips({ temporary }: { temporary?: Record<string, number> }) {
  const now = useNow();
  const entries = Object.entries(temporary || {}).filter(([, until]) => until > now);
  if (entries.length === 0) return null;
  const label: Record<string, string> = { read: "Read", write: "Change", export: "Send out" };
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {entries.map(([a, until]) => (
        <span key={a} title="Temporary permission approved by a human" className="rounded border border-dashed border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
          +{label[a] || a} · {timeLeft(until, now).replace(" left", "")}
        </span>
      ))}
    </div>
  );
}

export function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs text-slate-500 break-all">{children}</span>;
}

export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative rounded-lg bg-slate-900 px-4 py-3 pr-16">
      <code className="block whitespace-pre-wrap font-mono text-xs text-slate-100 break-all">{text}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="absolute right-2 top-2 rounded px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// ---------- toasts: action results that must never crash the page ----------

type ToastMsg = { id: number; text: string; tone: "ok" | "bad" };

export function notify(text: string, tone: "ok" | "bad" = "bad") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("console-toast", { detail: { text, tone } }));
}

/** Plain-language version of an API error. */
export function friendlyError(e: unknown): string {
  const m = String((e as Error)?.message || e);
  if (/not found/i.test(m))
    return "That item no longer exists on the server. The server may have restarted: agents, grants and tokens are kept in memory in this prototype, so they reappear only when the agent signs in again.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Can't reach the server. Is `go run ./cmd/server` running?";
  return m;
}

/** Runs a console action; shows success or a readable error instead of throwing. */
export async function runAction(fn: () => Promise<unknown>, success?: string) {
  try {
    await fn();
    if (success) notify(success, "ok");
    return true;
  } catch (e) {
    notify(friendlyError(e));
    return false;
  }
}

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (ev: Event) => {
      const { text, tone } = (ev as CustomEvent).detail;
      const id = ++n;
      setItems((xs) => [...xs, { id, text, tone }].slice(-3));
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 7000);
    };
    window.addEventListener("console-toast", on);
    return () => window.removeEventListener("console-toast", on);
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[60] w-[min(26rem,calc(100vw-2rem))] space-y-2" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${t.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
