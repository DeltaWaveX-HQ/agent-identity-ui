"use client";

import React, { useState } from "react";
import { PhonePrompt } from "../lib/types";
import {
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Lock,
  Clock,
} from "lucide-react";

interface Props {
  prompt: PhonePrompt | null;
  onApproveConsent: (consentId: string, actions: string[]) => void;
  onResolveCiba: (authReqId: string, approved: boolean) => void;
}

export default function PhoneSimulator({
  prompt,
  onApproveConsent,
  onResolveCiba,
}: Props) {
  const [readChecked, setReadChecked] = useState(true);
  const [writeChecked, setWriteChecked] = useState(false);
  const [exportChecked, setExportChecked] = useState(false);

  const isActive = prompt && prompt.type !== "dismiss";

  return (
    <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-blue-400" />
          <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
            Priya&apos;s Device Simulator (RAR &amp; OpenID CIBA)
          </span>
        </div>
        <span
          className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
            isActive
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {isActive ? "PUSH ACTIVE" : "STANDBY"}
        </span>
      </div>

      {/* Smartphone Bezel */}
      <div className="mx-auto w-full max-w-[310px] rounded-[24px] border-2 border-slate-700 bg-[#080d14] p-3.5 shadow-2xl">
        <div className="mx-auto mb-2.5 h-1 w-14 rounded-full bg-slate-700" />

        {!isActive ? (
          <div className="py-6 text-center flex flex-col items-center gap-2 text-slate-400">
            <Lock className="w-6 h-6 text-emerald-400/80" />
            <p className="text-xs font-medium text-slate-300">
              Agent Identity Authenticator
            </p>
            <p className="text-[11px] text-slate-500 max-w-[220px]">
              Waiting for RFC 9396 Fine-Grained Consent or OpenID CIBA Step-Up
              Push...
            </p>
          </div>
        ) : prompt.type === "rar_consent" ? (
          <div className="flex flex-col gap-2.5 text-left">
            <div className="flex items-center gap-2 text-blue-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold">
                {prompt.title || "RFC 9396 Rich Authorization Request"}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <b>{prompt.agent_id}</b> wants permission for task:{" "}
              <span className="italic text-slate-400">
                &ldquo;{prompt.task_description}&rdquo;
              </span>
            </p>
            <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5 text-[11px] space-y-1.5">
              <div>
                <span className="text-slate-500">Folder Scope:</span>{" "}
                <code className="text-emerald-300">
                  {prompt.requested_resource}
                </code>
              </div>
              <div>
                <span className="text-slate-500">Pass Lifetime:</span>{" "}
                <span className="text-slate-200">{prompt.ttl_display}</span>
              </div>
              <div className="pt-1 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">
                  Narrow Allowed Actions (Least Privilege):
                </span>
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readChecked}
                    onChange={(e) => setReadChecked(e.target.checked)}
                    className="rounded accent-blue-500"
                  />
                  <span>read (View Q3 Invoices)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={writeChecked}
                    onChange={(e) => setWriteChecked(e.target.checked)}
                    className="rounded accent-blue-500"
                  />
                  <span>write / modify</span>
                </label>
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={exportChecked}
                    onChange={(e) => setExportChecked(e.target.checked)}
                    className="rounded accent-blue-500"
                  />
                  <span>external_export (Denied)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  const acts: string[] = [];
                  if (readChecked) acts.push("read");
                  if (writeChecked) acts.push("write");
                  if (exportChecked) acts.push("export");
                  onApproveConsent(
                    prompt.prompt_id || "rar_consent_1",
                    acts.length ? acts : ["read"]
                  );
                }}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve Pass
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">
                  OpenID CIBA Step-Up Push
                </span>
              </div>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                Risk: {prompt.risk_score?.toFixed(2)}
              </span>
            </div>

            <p className="text-[11px] text-slate-200 leading-snug">
              Sub-agent <code className="text-amber-300">{prompt.agent_id}</code>{" "}
              is attempting a sensitive action outside its read-only baseline:
            </p>

            <div className="rounded-lg bg-amber-950/30 border border-amber-500/30 p-2.5 text-[11px] space-y-1">
              <div className="font-semibold text-amber-200">
                {prompt.task_description}
              </div>
              <div className="text-slate-400 font-mono text-[10px]">
                {prompt.requested_resource}
              </div>
              {prompt.risk_reasons && prompt.risk_reasons.length > 0 && (
                <ul className="list-disc pl-4 text-[10px] text-amber-300/90 pt-1">
                  {prompt.risk_reasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="w-3 h-3" />
              <span>2-minute timeout defaults to DENY (NIST Tenet #5)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() =>
                  onResolveCiba(prompt.prompt_id || "ciba_req_1", false)
                }
                className="flex items-center justify-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2 transition"
              >
                <XCircle className="w-3.5 h-3.5" />
                Deny &amp; Revoke
              </button>
              <button
                onClick={() =>
                  onResolveCiba(prompt.prompt_id || "ciba_req_1", true)
                }
                className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve Once
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
