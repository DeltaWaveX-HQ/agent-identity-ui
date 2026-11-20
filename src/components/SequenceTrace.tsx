"use client";

import React from "react";
import { TelemetryEvent } from "../lib/types";

const LANES: { key: TelemetryEvent["from_lane"]; name: string }[] = [
  { key: "user", name: "User" },
  { key: "agent", name: "Agent + Go SDK" },
  { key: "as", name: "Auth Server" },
  { key: "risk", name: "Risk Engine" },
  { key: "gw", name: "Gateway" },
  { key: "res", name: "Resource" },
];

const LANE_X: Record<string, number> = {
  user: 70,
  agent: 215,
  as: 360,
  risk: 505,
  gw: 650,
  res: 795,
};

interface Props {
  events: TelemetryEvent[];
  selectedIndex: number;
  onSelectStep: (idx: number) => void;
}

export default function SequenceTrace({
  events,
  selectedIndex,
  onSelectStep,
}: Props) {
  const TOP = 52;
  const ROW = 32;
  const height = Math.max(360, TOP + events.length * ROW + 24);

  return (
    <div className="rounded-xl border border-[#223042] bg-[#121a24] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
            Live 6-Lane Protocol Trace (OAuth 2.1 · RAR · RFC 8693 · DPoP ·
            CIBA)
          </span>
          <h3 className="text-sm font-semibold text-slate-200">
            Click any message arrow to inspect its decoded JWT, DPoP proof &amp;
            Go microsecond latency
          </h3>
        </div>
        <span className="font-mono text-xs text-slate-400">
          Step {events.length ? selectedIndex + 1 : 0} / {events.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 870 ${height}`}
          className="w-full min-w-[660px] select-none"
        >
          <defs>
            <marker
              id="arr-default"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#64748b" />
            </marker>
            <marker
              id="arr-info"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#60a5fa" />
            </marker>
            <marker
              id="arr-ok"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#34d399" />
            </marker>
            <marker
              id="arr-warn"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#fbbf24" />
            </marker>
            <marker
              id="arr-bad"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#f87171" />
            </marker>
          </defs>

          {/* Lane Headers & Vertical Lifelines */}
          {LANES.map((lane) => {
            const x = LANE_X[lane.key];
            return (
              <g key={lane.key}>
                <rect
                  x={x - 58}
                  y={8}
                  width={116}
                  height={28}
                  rx={7}
                  fill="#1a2433"
                  stroke="#2b3b4e"
                />
                <text
                  x={x}
                  y={26}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="11.5"
                  fontWeight="600"
                >
                  {lane.name}
                </text>
                <line
                  x1={x}
                  x2={x}
                  y1={38}
                  y2={height - 10}
                  stroke="#223042"
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                />
              </g>
            );
          })}

          {/* Message Rows */}
          {events.map((ev, idx) => {
            const y = TOP + idx * ROW + 14;
            const x1 = LANE_X[ev.from_lane] || 70;
            const x2 = LANE_X[ev.to_lane] || 215;
            const dir = x2 >= x1 ? 1 : -1;
            const isSelected = idx === selectedIndex;

            let strokeColor = "#64748b";
            let markerId = "arr-default";
            if (ev.status === "bad") {
              strokeColor = "#f87171";
              markerId = "arr-bad";
            } else if (ev.status === "warn") {
              strokeColor = "#fbbf24";
              markerId = "arr-warn";
            } else if (ev.status === "ok") {
              strokeColor = isSelected ? "#34d399" : "#2dd4bf";
              markerId = "arr-ok";
            } else if (isSelected) {
              strokeColor = "#60a5fa";
              markerId = "arr-info";
            }

            const labelX = Math.min(x1, x2) + 10;

            return (
              <g
                key={ev.id || idx}
                onClick={() => onSelectStep(idx)}
                className="cursor-pointer"
              >
                {isSelected && (
                  <rect
                    x={8}
                    y={y - 18}
                    width={854}
                    height={28}
                    rx={6}
                    fill="#1e293b"
                    opacity={0.75}
                  />
                )}
                <line
                  x1={x1 + dir * 4}
                  x2={x2 - dir * 7}
                  y1={y}
                  y2={y}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? "2.6" : "1.6"}
                  markerEnd={`url(#${markerId})`}
                />
                <text
                  x={Math.min(x1, x2) - 4}
                  y={y - 5}
                  textAnchor="end"
                  fill={isSelected ? "#60a5fa" : "#64748b"}
                  fontSize="10"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {ev.step_number || idx + 1}
                </text>
                <text
                  x={labelX}
                  y={y - 5}
                  fill={
                    ev.status === "bad"
                      ? "#fca5a5"
                      : isSelected
                        ? "#f8fafc"
                        : "#94a3b8"
                  }
                  fontSize="11.5"
                  fontWeight={isSelected ? "600" : "400"}
                >
                  {ev.label}
                </text>
                {ev.latency_us && (
                  <text
                    x={Math.max(x1, x2) + 8}
                    y={y - 4}
                    fill="#64748b"
                    fontSize="9.5"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {ev.latency_us}µs
                  </text>
                )}
                {isSelected && (
                  <circle cx={x2} cy={y} r={4.5} fill={strokeColor} />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
