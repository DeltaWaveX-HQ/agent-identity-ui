"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ACTION_LABELS,
  ActivityEntry,
  Agent,
  AgentDetail,
  Approval,
  Connections,
  Grant,
  HookKeyInfo,
  Overview,
  Policy,
  consoleApi,
  describeEvent,
  relTime,
  shortUser,
} from "../../lib/console-api";
import { GO_API_BASE } from "../../lib/api";
import {
  ActionChips,
  Button,
  Card,
  CopyBlock,
  Countdown,
  Empty,
  Mono,
  PageHeader,
  Pill,
  Stat,
  StatusPill,
  Table,
  Td,
  TempChips,
  friendlyError,
  notify,
  runAction,
} from "./ui";

export type Navigate = (path: string) => void;

/** Loads data on mount and whenever `refreshKey` changes (bumped by the live event stream). */
function useData<T>(load: () => Promise<T>, refreshKey: number, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    load()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => {
        if (!alive) return;
        const msg = String(e.message || e);
        setError(msg);
        // The thing this page shows is gone (e.g. the server restarted): stop showing stale data.
        if (/HTTP 404/.test(msg)) setData(null);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, ...deps]);
  return { data, error };
}

function Loading({ error }: { error: string | null }) {
  return (
    <div className="py-16 text-center text-sm text-slate-500">
      {error ? <span className="text-rose-600">{friendlyError(error)}</span> : "Loading…"}
    </div>
  );
}

function AgentLink({ id, name, navigate, sub }: { id: string; name?: string; navigate: Navigate; sub?: boolean }) {
  return (
    <button type="button" onClick={() => navigate(`/agents/${encodeURIComponent(id)}`)} className="text-left group min-w-[12rem]">
      <div className="flex items-center gap-1.5">
        {sub && <span className="text-slate-300">└</span>}
        <span className="font-medium text-slate-900 group-hover:text-blue-600">{name || id}</span>
      </div>
      <Mono>{id}</Mono>
    </button>
  );
}

const toneDot: Record<string, string> = { ok: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-rose-500", info: "bg-slate-300" };

function ActivityRow({ e, navigate, showAgent = true }: { e: ActivityEntry; navigate: Navigate; showAgent?: boolean }) {
  const d = describeEvent(e);
  return (
    <tr className="hover:bg-slate-50/60">
      <Td className="whitespace-nowrap text-xs text-slate-500">{relTime(e.timestamp)}</Td>
      {showAgent && (
        <Td>
          <button type="button" title={e.agent_id} onClick={() => navigate(`/agents/${encodeURIComponent(e.agent_id)}`)} className="block max-w-[14rem] truncate font-mono text-xs text-slate-700 hover:text-blue-600 text-left">
            {e.agent_id.replace(/^agent:(dcr-)?/, "")}
          </button>
        </Td>
      )}
      <Td>
        <div className="flex items-start gap-2">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[d.tone]}`} />
          <div>
            <div className="text-slate-800">{d.text}</div>
            {(e.policy_rule || (e.reasons && e.reasons.length > 0 && (d.tone === "warn" || d.tone === "bad"))) && (
              <div className="mt-0.5 text-xs text-slate-500">{e.policy_rule ? e.policy_rule.split(":")[0] : e.reasons?.slice(0, 2).join(" · ")}</div>
            )}
          </div>
        </div>
      </Td>
      <Td className="text-xs text-slate-500 whitespace-nowrap">{shortUser(e.actor_user)}</Td>
      <Td className="text-right tabular-nums text-xs">{e.risk_score && e.event_type.startsWith("GATEWAY_") ? <span className={e.risk_score >= 0.75 ? "text-rose-600 font-medium" : e.risk_score >= 0.3 ? "text-amber-600" : "text-slate-500"}>{e.risk_score.toFixed(2)}</span> : "—"}</Td>
    </tr>
  );
}

// =============================================================================================
// Overview
// =============================================================================================

export function OverviewPage({ refreshKey, navigate }: { refreshKey: number; navigate: Navigate }) {
  const { data, error } = useData<Overview>(consoleApi.overview, refreshKey);
  if (!data) return <Loading error={error} />;
  const c = data.calls_24h;
  const reasons = Object.entries(data.top_block_reasons || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const pending = data.pending_approvals || [];
  return (
    <>
      <PageHeader title="Overview" description="What your AI agents can do, what they did in the last 24 hours, and what needs your attention." />
      {pending.length > 0 && (
        <button type="button" onClick={() => navigate("/approvals")} className="mb-6 flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-left">
          <span className="text-sm font-medium text-amber-900">
            {pending.length} action{pending.length > 1 ? "s" : ""} waiting for your approval
          </span>
          <span className="text-sm text-amber-700">Review →</span>
        </button>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active agents" value={data.agents.active} hint={`${data.agents.total} registered · ${data.agents.sub_agents} sub-agents`} />
        <Stat label="Active access grants" value={data.active_grants} hint="consents that have not expired" />
        <Stat label="Tool calls allowed (24h)" value={c.allowed + c.approved} hint={`${c.approved} after human approval`} tone="ok" />
        <Stat label="Blocked (24h)" value={c.blocked} hint="each block revokes that agent's access" tone={c.blocked ? "bad" : undefined} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Recent activity" className="lg:col-span-2" padded={false} actions={<Button size="sm" variant="ghost" onClick={() => navigate("/activity")}>View all</Button>}>
          {(data.recent_activity || []).length === 0 ? (
            <Empty title="No activity yet">Connect an agent to start.</Empty>
          ) : (
            <Table head={["When", "Agent", "Event", "User", "Risk"]}>
              {(data.recent_activity || []).map((e) => (
                <ActivityRow key={e.id} e={e} navigate={navigate} />
              ))}
            </Table>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Why calls were blocked">
            {reasons.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing blocked in the last 24 hours.</p>
            ) : (
              <ul className="space-y-2">
                {reasons.map(([r, n]) => (
                  <li key={r} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700">{r.replace(/^RULE_/, "").replace(/_/g, " ").toLowerCase()}</span>
                    <span className="tabular-nums text-slate-500">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Get started">
            <ol className="space-y-2 text-sm text-slate-600 list-decimal pl-4">
              <li>Connect an AI client to the gateway.</li>
              <li>Approve its access in the browser.</li>
              <li>Watch its calls here; approve risky ones.</li>
            </ol>
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={() => navigate("/connect")}>Connect an agent</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// =============================================================================================
// Agents directory (parent → sub-agent tree)
// =============================================================================================

export function AgentsPage({ refreshKey, navigate }: { refreshKey: number; navigate: Navigate }) {
  const { data, error } = useData<Agent[]>(consoleApi.agents, refreshKey);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "revoked">("all");

  const rows = useMemo(() => {
    if (!data) return [];
    const byId = new Map(data.map((a) => [a.agent_id, a]));
    const match = (a: Agent) =>
      (filter === "all" || a.status === filter || (filter === "active" && a.status === "active")) &&
      (!q || `${a.name} ${a.agent_id} ${a.owner_user}`.toLowerCase().includes(q.toLowerCase()));
    const out: { a: Agent; depth: number }[] = [];
    const roots = data.filter((a) => !a.parent_agent_id || !byId.has(a.parent_agent_id));
    const visit = (a: Agent, depth: number) => {
      const kids = data.filter((c) => c.parent_agent_id === a.agent_id);
      if (match(a) || kids.some(match)) out.push({ a, depth });
      kids.forEach((k) => visit(k, depth + 1));
    };
    roots.forEach((r) => visit(r, 0));
    return out;
  }, [data, q, filter]);

  if (!data) return <Loading error={error} />;
  return (
    <>
      <PageHeader
        title="Agents"
        description="Every AI agent and sub-agent that has registered with your tenant. Sub-agents are shown under the agent that delegated to them."
        actions={<Button variant="primary" onClick={() => navigate("/connect")}>Connect an agent</Button>}
      />
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1">
            {(["all", "active", "revoked"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 text-sm capitalize ${filter === f ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {f}
              </button>
            ))}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents or owners" className="w-full sm:w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
        {rows.length === 0 ? (
          <Empty title={data.length === 0 ? "No agents yet" : "No agents match"}>
            {data.length === 0 && "Connect Claude, ChatGPT, Gemini or any MCP client to see it here."}
          </Empty>
        ) : (
          <Table head={["Agent", "Status", "Owner", "Can do", "Access", "Calls (24h)", "Last seen"]}>
            {rows.map(({ a, depth }) => (
              <tr key={a.agent_id} className="hover:bg-slate-50/60">
                <Td>
                  <div style={{ paddingLeft: depth * 20 }} className="flex items-center gap-2">
                    <AgentLink id={a.agent_id} name={a.name} navigate={navigate} sub={depth > 0} />
                    {a.kind === "sub-agent" && <Pill tone="info">sub-agent</Pill>}
                  </div>
                </Td>
                <Td><StatusPill status={a.status} /></Td>
                <Td className="text-xs text-slate-600 whitespace-nowrap">{shortUser(a.owner_user)}</Td>
                <Td><ActionChips actions={a.active_grant?.actions} /><TempChips temporary={a.active_grant?.temporary} /></Td>
                <Td>{a.active_grant ? <Countdown expiresAt={a.active_grant.expires_at} /> : <span className="text-xs text-slate-400">none</span>}</Td>
                <Td className="tabular-nums text-xs">
                  {a.calls_24h}
                  {a.blocked_24h > 0 && <span className="ml-1 text-rose-600">({a.blocked_24h} blocked)</span>}
                </Td>
                <Td className="text-xs text-slate-500 whitespace-nowrap">{a.last_activity ? relTime(a.last_activity) : "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

// =============================================================================================
// Agent detail
// =============================================================================================

export function AgentDetailPage({ id, refreshKey, navigate, onChanged }: { id: string; refreshKey: number; navigate: Navigate; onChanged: () => void }) {
  const { data, error } = useData<AgentDetail>(() => consoleApi.agent(id), refreshKey, [id]);
  const gone = !!error && /HTTP 404/.test(error);
  const [tab, setTab] = useState<"overview" | "access" | "sub-agents" | "tokens" | "activity">("overview");
  const [busy, setBusy] = useState(false);
  if (gone)
    return (
      <Card>
        <Empty title="This agent no longer exists">
          The server doesn't know <span className="font-mono">{id}</span> any more. In this prototype agents and grants are kept in memory, so a server restart clears them; the agent appears again when it next signs in.
          <div className="mt-4">
            <Button onClick={() => navigate("/agents")}>Back to agents</Button>
          </div>
        </Empty>
      </Card>
    );
  if (!data) return <Loading error={error} />;
  const a = data.agent;
  const grants = data.grants || [];
  const subs = data.sub_agents || [];
  const tabs: [typeof tab, string][] = [
    ["overview", "Overview"],
    ["access", `Access (${grants.filter((g) => g.status === "active").length})`],
    ["sub-agents", `Sub-agents (${subs.length})`],
    ["tokens", "Tokens"],
    ["activity", "Activity"],
  ];
  const act = async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    await runAction(fn, success);
    setBusy(false);
    onChanged();
  };

  return (
    <>
      <button type="button" onClick={() => navigate("/agents")} className="mb-3 text-sm text-slate-500 hover:text-slate-800">← Agents</button>
      <PageHeader
        title={a.name}
        description={a.kind === "sub-agent" ? `Sub-agent of ${a.parent_agent_id}. It can only use a subset of its parent's access, for a short time.` : a.platform}
        actions={
          a.status === "revoked" ? (
            <Button disabled={busy} onClick={() => act(() => consoleApi.restoreAgent(a.agent_id), "Agent restored.")}>Restore agent</Button>
          ) : (
            <Button variant="danger" disabled={busy} onClick={() => confirm(`Revoke ${a.name}? It loses all access${subs.length ? ", and so do its sub-agents" : ""}.`) && act(() => consoleApi.revokeAgent(a.agent_id), "Agent revoked. It and its sub-agents lost all access.")}>
              Revoke agent
            </Button>
          )
        }
      />
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === k ? "border-blue-600 font-medium text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Details" className="lg:col-span-2">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
              {[
                ["Status", <StatusPill key="s" status={a.status} />],
                ["Type", a.kind === "sub-agent" ? "Sub-agent" : "Agent"],
                ["Agent ID", <Mono key="i">{a.agent_id}</Mono>],
                ["Owner", shortUser(a.owner_user)],
                ["Parent agent", a.parent_agent_id ? <button key="p" type="button" className="text-blue-600 hover:underline break-all text-left" onClick={() => navigate(`/agents/${encodeURIComponent(a.parent_agent_id!)}`)}>{a.parent_agent_id}</button> : "—"],
                ["Registered", relTime(a.registered_at)],
                ["Workload ID", <Mono key="w">{data.registration?.spiffe_id || "—"}</Mono>],
                ["Redirect URIs", <Mono key="r">{(data.registration?.redirect_uris || []).join(", ") || "—"}</Mono>],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="mt-0.5 text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Current access">
            {a.active_grant ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Granted by</div>
                  <div className="text-slate-800">{shortUser(a.active_grant.user_sub)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Can</div>
                  <ActionChips actions={a.active_grant.actions} />
                  <TempChips temporary={a.active_grant.temporary} />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Expires</div>
                  <Countdown expiresAt={a.active_grant.expires_at} />
                </div>
                <Button size="sm" variant="danger" onClick={() => act(() => consoleApi.revokeGrant(a.active_grant!.consent_id), "Access revoked.")}>Revoke this access</Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active access. The agent must ask the user again.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "access" && <GrantsTable grants={grants} navigate={navigate} onRevoke={(g) => act(() => consoleApi.revokeGrant(g.consent_id))} showAgent={false} />}

      {tab === "sub-agents" && (
        <div className="space-y-6">
          <Card padded={false}>
            {subs.length === 0 ? (
              <Empty title="No sub-agents">A sub-agent works under this agent with less access and a short time limit (5 min, 10 min or 1 hour).</Empty>
            ) : (
              <Table head={["Sub-agent", "Status", "Can do", "Access", "Calls (24h)"]}>
                {subs.map((s) => (
                  <tr key={s.agent_id}>
                    <Td><AgentLink id={s.agent_id} name={s.name} navigate={navigate} /></Td>
                    <Td><StatusPill status={s.status} /></Td>
                    <Td><ActionChips actions={s.active_grant?.actions} /><TempChips temporary={s.active_grant?.temporary} /></Td>
                    <Td>{s.active_grant ? <Countdown expiresAt={s.active_grant.expires_at} /> : <span className="text-xs text-slate-400">none</span>}</Td>
                    <Td className="text-xs tabular-nums">{s.calls_24h}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
          {a.kind === "agent" && <SubAgentHowTo />}
        </div>
      )}

      {tab === "tokens" && (
        <div className="space-y-4">
          {(data.token_families || []).length === 0 && <Card><p className="text-sm text-slate-500">No tokens issued yet.</p></Card>}
          {(data.token_families || []).map((f) => (
            <Card key={f.family_id} title={`Session ${f.family_id}`} actions={f.revoked ? <StatusPill status="revoked" /> : <StatusPill status="active" />} padded={false}>
              {f.revoke_reason && <p className="px-5 pt-3 text-xs text-rose-600">{f.revoke_reason}</p>}
              <Table head={["Token", "Type", "Status", "Issued", "Expires"]}>
                {f.nodes.map((n) => (
                  <tr key={n.jti}>
                    <Td><Mono>{n.jti}</Mono></Td>
                    <Td className="text-xs text-slate-600">{n.token_type.replace(/_/g, " ")}</Td>
                    <Td><StatusPill status={n.status.toLowerCase()} /></Td>
                    <Td className="text-xs text-slate-500">{relTime(n.issued_at)}</Td>
                    <Td>{n.status === "ACTIVE" ? <Countdown expiresAt={n.expires_at} /> : <span className="text-xs text-slate-400">—</span>}</Td>
                  </tr>
                ))}
              </Table>
            </Card>
          ))}
        </div>
      )}

      {tab === "activity" && (
        <Card padded={false}>
          {(data.activity || []).length === 0 ? (
            <Empty title="No activity yet" />
          ) : (
            <Table head={["When", "Event", "User", "Risk"]}>
              {(data.activity || []).map((e) => (
                <ActivityRow key={e.id} e={e} navigate={navigate} showAgent={false} />
              ))}
            </Table>
          )}
        </Card>
      )}
    </>
  );
}

function SubAgentHowTo() {
  const [name, setName] = useState("researcher");
  const [mcp, setMcp] = useState("http://localhost:8090/mcp");
  useEffect(() => {
    consoleApi.connections().then((c) => c.mcp_url && setMcp(c.mcp_url)).catch(() => {});
  }, []);
  const safe = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+/, "").slice(0, 32) || "researcher";
  return (
    <Card title="Add a sub-agent">
      <p className="mb-3 text-sm text-slate-600">
        Connect a second MCP client to its own sub-agent address. When it signs in, you choose this agent as its parent, pick what it may do (only what the parent has, never money), and give it <b>5 minutes, 10 minutes or 1 hour</b>.
      </p>
      <label className="mb-3 block text-xs font-medium text-slate-500">
        Sub-agent name
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
      </label>
      <CopyBlock text={`claude mcp add --transport http -s user agent-gw-${safe} ${mcp}/sub/${safe}`} />
    </Card>
  );
}

// =============================================================================================
// Access grants
// =============================================================================================

function GrantsTable({ grants, navigate, onRevoke, showAgent = true }: { grants: Grant[]; navigate: Navigate; onRevoke: (g: Grant) => void; showAgent?: boolean }) {
  if (grants.length === 0) return <Card><Empty title="No access grants">Grants appear when a user approves an agent in the browser.</Empty></Card>;
  return (
    <Card padded={false}>
      <Table head={[...(showAgent ? ["Agent"] : []), "Granted by", "Can do", "Status", "Expires", ""]}>
        {grants.map((g) => (
          <tr key={g.consent_id} className="hover:bg-slate-50/60">
            {showAgent && (
              <Td>
                <AgentLink id={g.agent_id} name={g.agent_name} navigate={navigate} />
                {g.is_sub_agent && <div className="mt-1 text-xs text-slate-500">sub-agent of <span className="font-mono">{g.parent_agent_id}</span></div>}
              </Td>
            )}
            <Td className="text-xs text-slate-600 whitespace-nowrap">{shortUser(g.user_sub)}</Td>
            <Td><ActionChips actions={g.actions} /><TempChips temporary={g.temporary} /></Td>
            <Td><StatusPill status={g.status} /></Td>
            <Td>{g.status === "active" ? <Countdown expiresAt={g.expires_at} /> : <span className="text-xs text-slate-400">{g.expires_at ? relTime(g.expires_at) : "—"}</span>}</Td>
            <Td className="text-right">{g.status === "active" && <Button size="sm" variant="danger" onClick={() => onRevoke(g)}>Revoke</Button>}</Td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

export function GrantsPage({ refreshKey, navigate, onChanged }: { refreshKey: number; navigate: Navigate; onChanged: () => void }) {
  const { data, error } = useData<Grant[] | null>(consoleApi.grants, refreshKey);
  const [onlyActive, setOnlyActive] = useState(true);
  if (data === null && !error) return <Loading error={error} />;
  const grants = (data || []).filter((g) => !onlyActive || g.status === "active");
  return (
    <>
      <PageHeader
        title="Access grants"
        description="What each user allowed each agent to do, and for how long. Revoking a parent agent's grant also cuts off its sub-agents."
        actions={
          <div className="flex rounded-lg border border-slate-300 p-0.5">
            {[true, false].map((v) => (
              <button key={String(v)} type="button" onClick={() => setOnlyActive(v)} className={`rounded-md px-3 py-1 text-sm ${onlyActive === v ? "bg-slate-900 text-white" : "text-slate-600"}`}>
                {v ? "Active" : "All"}
              </button>
            ))}
          </div>
        }
      />
      <GrantsTable grants={grants} navigate={navigate} onRevoke={async (g) => { await runAction(() => consoleApi.revokeGrant(g.consent_id), "Access revoked."); onChanged(); }} />
    </>
  );
}

// =============================================================================================
// Approvals (human step-up / CIBA)
// =============================================================================================

/** A sub-agent the client spawned on its own asks for delegated access: pick what and how long. */
function SubAgentRequestCard({ a, onDone }: { a: Approval; onDone: () => void }) {
  const offer = a.offer_actions || [];
  const asked = (a.requested_actions || []).filter((x) => offer.includes(x));
  const [picked, setPicked] = useState<string[]>(asked.length ? asked : offer.includes(a.action) ? [a.action] : offer.slice(0, 1));
  const max = a.offer_max_seconds || 0;
  const durations = [
    { s: 300, label: "5 min" },
    { s: 600, label: "10 min" },
    { s: 3600, label: "1 hour" },
  ].filter((d) => d.s <= max || d.s === 300);
  const wanted = a.requested_seconds ? durations.reduce((best, d) => (Math.abs(d.s - a.requested_seconds!) < Math.abs(best.s - a.requested_seconds!) ? d : best), durations[0]) : undefined;
  const [ttl, setTtl] = useState(wanted?.s || durations.find((d) => d.s === 600)?.s || durations[0]?.s || 300);
  const via = { token_exchange: "token exchange", mcp_meta: "MCP tag", client_hook: "client hook" }[a.source || "client_hook"];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tool = a.tool || a.resource.replace(/^mcp:\/\/[^/]+\//, "");
  const submit = async (ok: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      await consoleApi.delegateSubAgent(a.auth_req_id, ok, picked, Math.min(ttl, max || ttl));
      onDone();
    } catch (e) {
      setErr(String((e as Error).message));
      setBusy(false);
    }
  };
  return (
    <div className="rounded-xl border border-blue-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">New sub-agent</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900">{a.sub_agent_type || "sub-agent"}</span>
            <Pill tone="info">sub-agent</Pill>
          </div>
          <div className="mt-0.5 text-xs text-slate-500 break-all">created by {a.parent_agent_id} · for {shortUser(a.user_sub)} · identified via {via}</div>
        </div>
        <Countdown expiresAt={a.expires_at} />
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
        {a.tool ? (
          <>First call: <b>{(ACTION_LABELS[a.action] || a.action).toLowerCase()}</b> with <span className="font-mono text-xs">{tool}</span></>
        ) : (
          <>Asked for: <b>{(a.requested_actions || [a.action]).map((x) => (ACTION_LABELS[x] || x).toLowerCase()).join(", ")}</b>{a.requested_seconds ? ` for ${Math.round(a.requested_seconds / 60)} min` : ""}</>
        )}
      </div>
      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-slate-500">Let it</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {offer.map((act) => (
            <label key={act} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm ${picked.includes(act) ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
              <input type="checkbox" className="accent-blue-600" checked={picked.includes(act)} onChange={(e) => setPicked(e.target.checked ? [...picked, act] : picked.filter((x) => x !== act))} />
              {ACTION_LABELS[act] || act}
            </label>
          ))}
          <span className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-2.5 py-1 text-sm text-slate-400" title="Sub-agents never move money">Move money: never</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Only what the parent has. Parent's access ends in <Countdown expiresAt={a.grant_expires_at || 0} />.</p>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-slate-500">For</legend>
        <div className="mt-1 inline-flex rounded-lg border border-slate-300 p-0.5">
          {durations.map((d) => (
            <button key={d.s} type="button" onClick={() => setTtl(d.s)} className={`rounded-md px-3 py-1 text-sm ${ttl === d.s ? "bg-slate-900 text-white" : "text-slate-600"}`}>
              {d.label}
            </button>
          ))}
        </div>
      </fieldset>
      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button size="sm" variant="danger" disabled={busy} onClick={() => submit(false)}>Deny</Button>
        <Button size="sm" variant="primary" disabled={busy || picked.length === 0} onClick={() => submit(true)}>Give access</Button>
      </div>
    </div>
  );
}

export function ApprovalCard({ a, onDone, compact = false }: { a: Approval; onDone: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  if (a.kind === "sub_agent") return <SubAgentRequestCard a={a} onDone={onDone} />;
  const decide = async (ok: boolean, seconds = 0) => {
    setBusy(true);
    try {
      await consoleApi.resolveApproval(a.auth_req_id, ok, seconds);
    } catch (e) {
      notify(friendlyError(e));
    } finally {
      onDone();
    }
  };
  const tool = a.tool || a.resource.replace(/^mcp:\/\/[^/]+\//, "");
  const isSub = !!a.parent_agent_id;
  const max = a.max_elevate_seconds || 0;
  const windows = [
    { s: 600, label: "10 min" },
    { s: 3600, label: "1 hour" },
  ].filter((w) => w.s <= max);
  const outsideGrant = !(a.granted_actions || []).includes(a.action);
  return (
    <div className={`rounded-xl border border-amber-200 bg-white ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900 break-all">{a.agent_id.split("/").pop()}</span>
            {isSub ? <Pill tone="info">sub-agent</Pill> : <Pill>agent</Pill>}
          </div>
          {isSub && <div className="mt-0.5 text-xs text-slate-500 break-all">under {a.parent_agent_id}</div>}
          <div className="mt-0.5 text-xs text-slate-500">for {shortUser(a.user_sub)}</div>
        </div>
        <Countdown expiresAt={a.expires_at} />
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
        <div className="text-sm text-slate-800">
          Wants to <b>{(ACTION_LABELS[a.action] || a.action).toLowerCase()}</b> with <span className="font-mono text-xs">{tool}</span>
        </div>
        {a.args_preview && !compact && <div className="mt-1 truncate font-mono text-[11px] text-slate-500" title={a.args_preview}>{a.args_preview}</div>}
      </div>

      <div className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
        <span className="text-slate-500">Allowed now</span>
        <span><ActionChips actions={a.granted_actions} /></span>
        <span className="text-slate-500">Grant ends</span>
        <span>{a.grant_expires_at ? <Countdown expiresAt={a.grant_expires_at} /> : "—"}</span>
        <span className="text-slate-500">Why asked</span>
        <span className="text-slate-600">{outsideGrant ? "not in this agent's grant" : a.action === "payment_transfer" ? "money always needs a human" : (a.reasons || [])[0] || "risk"} · risk {a.risk_score.toFixed(2)}</span>
      </div>
      {!compact && a.reasons && a.reasons.length > 1 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-slate-500">
          {a.reasons.slice(0, 4).map((r) => <li key={r}>• {r}</li>)}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" variant="danger" disabled={busy} onClick={() => decide(false)}>Deny</Button>
        <Button size="sm" disabled={busy} onClick={() => decide(true)}>Allow once</Button>
        {a.can_elevate &&
          windows.map((w) => (
            <Button key={w.s} size="sm" variant="primary" disabled={busy} onClick={() => decide(true, w.s)}>
              Allow {w.label}
            </Button>
          ))}
        {a.can_elevate && windows.length === 0 && max > 0 && (
          <Button size="sm" variant="primary" disabled={busy} onClick={() => decide(true, max)}>Allow until grant ends</Button>
        )}
      </div>
      {!a.can_elevate && outsideGrant && (a.action === "payment_transfer" || a.action === "delete" || isSub) && (
        <p className="mt-2 text-right text-[11px] text-slate-400">
          {isSub && a.action !== "payment_transfer" ? "A sub-agent can't get more than its parent has." : "This action can only be approved one call at a time."}
        </p>
      )}
    </div>
  );
}

export function ApprovalsPage({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const { data, error } = useData<Approval[]>(consoleApi.approvals, refreshKey);
  if (!data) return <Loading error={error} />;
  return (
    <>
      <PageHeader title="Approvals" description="Risky actions wait here for a human. If nobody answers within 2 minutes, the action is denied." />
      {data.length === 0 ? (
        <Card><Empty title="Nothing waiting">You will see payments and other risky actions here when an agent tries them.</Empty></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((a) => <ApprovalCard key={a.auth_req_id} a={a} onDone={onChanged} />)}
        </div>
      )}
    </>
  );
}

// =============================================================================================
// Activity log
// =============================================================================================

const ACTIVITY_FILTERS: Record<string, (e: ActivityEntry) => boolean> = {
  All: () => true,
  "Tool calls": (e) => e.event_type.startsWith("GATEWAY_"),
  Blocked: (e) => e.event_type === "GATEWAY_BLOCK" || e.event_type.includes("DENIED") || e.event_type.includes("EXPIRED") || e.event_type.includes("REVOKED"),
  Approvals: (e) => e.event_type.includes("STEP_UP"),
  Access: (e) => e.event_type.startsWith("OAUTH_") || e.event_type.startsWith("TOKEN") || e.event_type.includes("CONSENT") || e.event_type.includes("DCR"),
  Threats: (e) => e.event_type === "UNTRUSTED_CONTENT_IN_CONTEXT" || !!e.policy_rule,
};

export function ActivityPage({ refreshKey, navigate }: { refreshKey: number; navigate: Navigate }) {
  const { data, error } = useData<ActivityEntry[]>(consoleApi.activity, refreshKey);
  const [f, setF] = useState("All");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);
  if (!data) return <Loading error={error} />;
  const rows = data.filter(ACTIVITY_FILTERS[f]).filter((e) => !q || JSON.stringify(e).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Activity log" description="Every registration, consent, token and tool call, newest first. Each entry records the user, the agent and the decision." />
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {Object.keys(ACTIVITY_FILTERS).map((k) => (
              <button key={k} type="button" onClick={() => setF(k)} className={`rounded-md px-3 py-1 text-sm ${f === k ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{k}</button>
            ))}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agent, tool, user…" className="w-full lg:w-72 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
        {rows.length === 0 ? (
          <Empty title="No matching activity" />
        ) : (
          <Table head={["When", "Agent", "Event", "User", "Risk"]}>
            {rows.slice(0, limit).map((e) => <ActivityRow key={e.id} e={e} navigate={navigate} />)}
          </Table>
        )}
        {rows.length > limit && (
          <div className="border-t border-slate-100 p-3 text-center">
            <Button size="sm" variant="ghost" onClick={() => setLimit(limit + 100)}>Show more ({rows.length - limit} older)</Button>
          </div>
        )}
      </Card>
    </>
  );
}

// =============================================================================================
// Policies
// =============================================================================================

export function PoliciesPage({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const { data, error } = useData<Policy[]>(consoleApi.policies, refreshKey);
  const egress = useData<{ hosts: string[] }>(consoleApi.egress, refreshKey);
  const [host, setHost] = useState("");
  if (!data) return <Loading error={error} />;
  return (
    <>
      <PageHeader title="Policies" description="Rules the gateway enforces on every tool call, whatever the risk score says. Changes apply immediately." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Rules" className="lg:col-span-2" padded={false}>
          <ul className="divide-y divide-slate-100">
            {data.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{p.name}</span>
                    <Pill tone={p.action.includes("BLOCK") ? "bad" : "warn"}>{p.action.includes("BLOCK") ? "Block & revoke" : "Ask a human"}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{p.description}</p>
                  <p className="mt-1 text-xs text-slate-400">{p.hits_count} hits</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.enabled}
                  aria-label={`${p.enabled ? "Disable" : "Enable"} ${p.name}`}
                  onClick={async () => { await runAction(() => consoleApi.togglePolicy(p.id, !p.enabled)); onChanged(); }}
                  className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${p.enabled ? "bg-blue-600" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${p.enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Allowed destinations">
          <p className="mb-3 text-sm text-slate-500">Agents can only send data to these hosts. Anything else is blocked and the agent's access is revoked.</p>
          <ul className="mb-4 space-y-1">
            {(egress.data?.hosts || []).sort().map((h) => (
              <li key={h} className="font-mono text-xs text-slate-700">{h}</li>
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!host.trim()) return;
              if (!(await runAction(() => consoleApi.allowHost(host.trim()), `${host.trim()} allowed.`))) return;
              setHost("");
              onChanged();
            }}
          >
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="api.example.com" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <Button type="submit" size="sm">Add</Button>
          </form>
          <p className="mt-2 text-xs text-slate-400">Added hosts last until the server restarts. Permanent ones live in config/mcp-upstreams.json.</p>
        </Card>
      </div>
    </>
  );
}

// =============================================================================================
// Connect an agent + connected tools
// =============================================================================================

/** Claude Code runs sub-agents over the parent's connection; its hook tells the gateway which one is calling. */
function SubAgentHookCard({ refreshKey }: { refreshKey: number }) {
  const { data } = useData<HookKeyInfo>(consoleApi.hookKey, refreshKey);
  const [created, setCreated] = useState<HookKeyInfo | null>(null);
  const [server, setServer] = useState("agent-gw");
  const info = created || data;
  const key = created?.key;
  const url = info?.attribution_url || "";
  const name = server.trim() || "agent-gw";
  const hook = key
    ? JSON.stringify(
        {
          hooks: {
            PreToolUse: [
              {
                matcher: `mcp__${name}__.*`,
                hooks: [
                  {
                    type: "command",
                    command: `curl -s -m 3 -X POST ${url} -H 'Authorization: Bearer ${key}' -H 'Content-Type: application/json' --data-binary @- >/dev/null 2>&1; exit 0`,
                    timeout: 5,
                  },
                ],
              },
            ],
          },
        },
        null,
        2,
      )
    : "";
  return (
    <Card title="Detect Claude Code sub-agents">
      <p className="mb-3 text-sm text-slate-600">
        When Claude Code spawns a sub-agent (&ldquo;create an agent and…&rdquo;), the sub-agent uses the parent&rsquo;s connection. A small Claude Code hook tells the gateway which
        agent is calling, so each sub-agent appears under its parent with its own approval and time limit. Your key only works for your own sessions.
      </p>
      {info?.exists && !key && (
        <p className="mb-3 text-sm text-slate-600">
          Key <Mono>{info.prefix}…</Mono> created {info.created_at ? relTime(new Date(info.created_at * 1000).toISOString()) : ""}. Creating a new key stops the old one.
        </p>
      )}
      {!key && (
        <Button variant="primary" onClick={() => runAction(async () => setCreated(await consoleApi.createHookKey()), "Hook key created. Copy it now: it is shown only once.")}>
          {info?.exists ? "Replace key" : "Create hook key"}
        </Button>
      )}
      {key && (
        <div className="space-y-3 text-sm text-slate-700">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Name you gave the gateway in Claude Code</span>
            <input value={server} onChange={(e) => setServer(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs" />
          </label>
          <div>Add this to <code className="rounded bg-slate-100 px-1">~/.claude/settings.json</code> (merge into any existing <code>hooks</code>), then restart Claude Code:</div>
          <CopyBlock text={hook} />
          <p className="text-xs text-amber-700">This key is shown only once. It is stored only as a hash.</p>
        </div>
      )}
    </Card>
  );
}

/** Gemini CLI connects like any OAuth MCP client; Google ADK agents create sub-agents by token exchange. */
function GeminiCard({ mcp }: { mcp: string }) {
  const gw = mcp.replace(/\/mcp$/, "");
  const adk = `# pip install google-adk   (agent_identity.py: examples/python in the backend repo)
from agent_identity import exchange_for_sub_agent
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StreamableHTTPConnectionParams

# A sub-agent of your connected agent: its own identity, read-only, 10 minutes.
# You approve it once in this console (Approvals).
sub = exchange_for_sub_agent("${GO_API_BASE}", PARENT_TOKEN, "researcher", ["read"], ttl_seconds=600)

researcher = Agent(
    name="researcher",
    model="gemini-2.5-flash",
    tools=[MCPToolset(connection_params=StreamableHTTPConnectionParams(
        url="${mcp}", headers={"Authorization": "Bearer " + sub["access_token"]}))],
)`;
  return (
    <Card title="Gemini">
      <ol className="space-y-4 text-sm text-slate-700">
        <li>
          <div className="mb-2">
            1. <b>Gemini CLI</b>: add the gateway (all folders):
          </div>
          <CopyBlock text={`gemini mcp add -s user -t http agentid-gateway ${mcp}`} />
        </li>
        <li>
          <div className="mb-2">2. Start Gemini CLI and sign in to the gateway. Your browser opens our consent screen:</div>
          <CopyBlock text="/mcp auth agentid-gateway" />
        </li>
        <li>
          3. Check it with <code className="rounded bg-slate-100 px-1">/mcp</code>, then ask, for example, &ldquo;list my bank accounts&rdquo;. Every call is checked here; risky ones appear in
          Approvals.
        </li>
        <li>
          <div className="mb-2">
            4. A <b>sub-agent</b> for Gemini CLI connects to its own address and gets 5 min, 10 min or 1 hour:
          </div>
          <CopyBlock text={`gemini mcp add -s user -t http agentid-researcher ${gw}/mcp/sub/researcher`} />
        </li>
        <li>
          <div className="mb-2">
            5. <b>Google ADK</b> (Python agents on Gemini): a parent agent creates a sub-agent with its own identity through token exchange:
          </div>
          <CopyBlock text={adk} />
        </li>
      </ol>
    </Card>
  );
}

export function ConnectPage({ refreshKey }: { refreshKey: number }) {
  const { data, error } = useData<Connections>(consoleApi.connections, refreshKey);
  if (!data) return <Loading error={error} />;
  const mcp = data.mcp_url || "http://localhost:8090/mcp";
  return (
    <>
      <PageHeader title="Connect an agent" description="Point any MCP client at your gateway. It signs in through your consent screen, and every call it makes is checked." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Claude Code">
            <ol className="space-y-4 text-sm text-slate-700">
              <li>
                <div className="mb-2">1. Add the gateway (works in every folder):</div>
                <CopyBlock text={`claude mcp add --transport http -s user agent-gw ${mcp}`} />
              </li>
              <li>2. Restart Claude Code, type <code className="rounded bg-slate-100 px-1">/mcp</code>, choose <b>agent-gw</b>, then <b>Authenticate</b>.</li>
              <li>3. In the browser: sign in, choose what it may do and for how long, then approve.</li>
            </ol>
          </Card>
          <Card title="Sub-agent">
            <p className="mb-3 text-sm text-slate-600">A sub-agent connects to its own address. After you sign in on its consent screen, it is attached to your connected agent; you choose a subset of that agent's permissions and 5 minutes, 10 minutes or 1 hour.</p>
            <CopyBlock text={`claude mcp add --transport http -s user agent-gw-researcher ${mcp}/sub/researcher`} />
          </Card>
          <SubAgentHookCard refreshKey={refreshKey} />
          <GeminiCard mcp={mcp} />
          <Card title="Other MCP clients">
            <p className="text-sm text-slate-600">
              Cursor, MCPJam, VS Code and other clients that support remote MCP with OAuth: use <code className="rounded bg-slate-100 px-1">{mcp}</code> with the HTTP (streamable) transport and OAuth; no client ID is needed.
            </p>
          </Card>
        </div>
        <Card title="Gateway">
          <div className="mb-4 flex items-center gap-2">
            <StatusPill status={data.online ? "active" : "revoked"} />
            <span className="text-sm text-slate-600">{data.online ? "Online" : data.error || "Offline"}</span>
          </div>
          <div className="space-y-3">
            {(data.upstreams || []).map((u) => (
              <div key={u.Name} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900">{u.Name}</span>
                  {u.Error ? <Pill tone={u.Error === "disabled" ? "neutral" : "bad"}>{u.Error === "disabled" ? "off" : "error"}</Pill> : <Pill tone="ok">{(u.Tools || []).length} tools</Pill>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{u.Description}</p>
                {u.Error && u.Error !== "disabled" && <p className="mt-1 text-xs text-rose-600 break-all">{u.Error}</p>}
              </div>
            ))}
            {!data.online && <p className="text-xs text-slate-500">Start it with <code>go run ./cmd/mcp-gateway</code>.</p>}
          </div>
        </Card>
      </div>
    </>
  );
}
