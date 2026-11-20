// Typed client for the tenant console. Every call here maps to one Go handler; see
// docs/03_backend_frontend_map.md in the workspace root for the page → endpoint → handler map.
import { GO_API_BASE } from "./api";

export type GrantStatus = "pending" | "active" | "expired" | "revoked" | "denied";

export interface Grant {
  consent_id: string;
  agent_id: string;
  agent_name: string;
  user_sub: string;
  status: GrantStatus;
  actions: string[] | null;
  resource: string;
  is_sub_agent: boolean;
  sub_agent_name?: string;
  parent_agent_id?: string;
  parent_grant_id?: string;
  family_id?: string;
  created_at: number;
  expires_at: number;
  temporary?: Record<string, number>;
}

export interface Agent {
  agent_id: string;
  name: string;
  kind: "agent" | "sub-agent";
  status: "active" | "idle" | "revoked";
  owner_user: string;
  parent_agent_id?: string;
  platform: string;
  registered_at: number;
  active_grant?: Grant;
  last_activity?: string;
  calls_24h: number;
  blocked_24h: number;
  children: string[];
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  actor_user: string;
  agent_id: string;
  parent_agent?: string;
  event_type: string;
  method?: string;
  resource: string;
  target_host?: string;
  risk_score: number;
  verdict: string;
  policy_rule?: string;
  reasons?: string[];
  token_jti?: string;
  family_id?: string;
  latency_us: number;
}

export interface Approval {
  auth_req_id: string;
  agent_id: string;
  user_sub: string;
  action: string;
  resource: string;
  risk_score: number;
  reasons: string[] | null;
  status: string;
  created_at: number;
  expires_at: number;
  tool?: string;
  args_preview?: string;
  parent_agent_id?: string;
  granted_actions?: string[] | null;
  grant_expires_at?: number;
  can_elevate: boolean;
  max_elevate_seconds?: number;
  kind: "step_up" | "sub_agent";
  sub_agent_type?: string;
  offer_actions?: string[] | null;
  offer_max_seconds?: number;
  requested_actions?: string[] | null;
  requested_seconds?: number;
  source?: "token_exchange" | "mcp_meta" | "client_hook";
}

export interface Overview {
  agents: { total: number; active: number; sub_agents: number; revoked: number };
  active_grants: number;
  pending_approvals: Approval[] | null;
  calls_24h: { allowed: number; approved: number; stepped_up: number; blocked: number };
  top_block_reasons: Record<string, number>;
  recent_activity: ActivityEntry[] | null;
}

export interface TokenNode {
  jti: string;
  token_type: string;
  client_id: string;
  status: string;
  revoke_cause?: string;
  issued_at: number;
  expires_at: number;
}

export interface TokenFamily {
  family_id: string;
  parent_family_id?: string;
  revoked: boolean;
  revoke_reason?: string;
  nodes: TokenNode[];
}

export interface AgentDetail {
  agent: Agent;
  registration?: { spiffe_id?: string; redirect_uris?: string[]; model_id?: string };
  grants: Grant[] | null;
  token_families: TokenFamily[] | null;
  sub_agents: Agent[] | null;
  activity: ActivityEntry[] | null;
}

export interface Policy {
  id: string;
  name: string;
  code: string;
  description: string;
  action: string;
  enabled: boolean;
  category: string;
  hits_count: number;
}

export interface Connections {
  online: boolean;
  gateway_url: string;
  mcp_url: string;
  error?: string;
  egress_allowlist?: string[];
  upstreams?: { Name: string; Description: string; Transport: string; Error: string; Tools: string[] | null }[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${GO_API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

async function post<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${GO_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `${path}: HTTP ${res.status}`);
  return data as T;
}

export const consoleApi = {
  // Reads (cmd/server/console_api.go)
  overview: () => get<Overview>("/api/v1/console/overview"),
  agents: () => get<Agent[]>("/api/v1/console/agents"),
  agent: (id: string) => get<AgentDetail>(`/api/v1/console/agent?id=${encodeURIComponent(id)}`),
  grants: () => get<Grant[] | null>("/api/v1/console/grants"),
  approvals: () => get<Approval[]>("/api/v1/console/approvals"),
  connections: () => get<Connections>("/api/v1/console/connections"),
  activity: () => get<ActivityEntry[]>("/api/v1/audit-logs"),
  policies: () => get<Policy[]>("/api/v1/policies"),
  egress: () => get<{ hosts: string[] }>("/api/v1/gateway/egress-allowlist"),

  // Actions (cmd/server/main.go)
  revokeAgent: (agentId: string) =>
    post("/api/v1/agents/revoke", { agent_id: agentId, reason: "Revoked from tenant console" }),
  restoreAgent: (agentId: string) => post("/api/v1/agents/restore", { agent_id: agentId }),
  revokeGrant: (consentId: string) => post("/api/v1/consents/revoke", { consent_id: consentId }),
  /** elevateSeconds: 0 = approve this one call; >0 = allow this action for that long (capped at the grant). */
  resolveApproval: (authReqId: string, approved: boolean, elevateSeconds = 0) =>
    post("/api/v1/oauth/ciba-resolve", { auth_req_id: authReqId, approved, elevate_seconds: elevateSeconds }),
  /** Answer a "new sub-agent" request: which of the parent's permissions to delegate, and for how long. */
  delegateSubAgent: (authReqId: string, approved: boolean, actions: string[], ttlSeconds: number) =>
    post("/api/v1/oauth/ciba-resolve", { auth_req_id: authReqId, approved, actions, ttl_seconds: ttlSeconds }),
  togglePolicy: (id: string, enabled: boolean) => post("/api/v1/policies/toggle", { id, enabled }),
  allowHost: (host: string) => post("/api/v1/gateway/egress-allowlist", { hosts: [host] }),

  eventStreamUrl: () => `${GO_API_BASE}/api/v1/events/stream`,
};

// ---------- display helpers ----------

export const ACTION_LABELS: Record<string, string> = {
  read: "Read data",
  write: "Change data",
  payment_transfer: "Move money",
  export: "Send data out",
  delete: "Delete",
};

export function shortUser(sub?: string) {
  const s = (sub || "").replace(/^user:/, "");
  return !s || s === "pending-login" || s === "pending-consent" ? "—" : s;
}

export function timeLeft(expiresAt: number, now = Date.now() / 1000) {
  const s = Math.floor(expiresAt - now);
  if (s <= 0) return "expired";
  if (s < 60) return `${s}s left`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s left`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m left`;
}

export function relTime(input: string | number) {
  const t = typeof input === "number" ? input * 1000 : Date.parse(input);
  if (!t) return "—";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(t).toLocaleDateString();
}

/** Turns an audit event into one plain-language line for tenants. */
export function describeEvent(e: ActivityEntry): { text: string; tone: "ok" | "warn" | "bad" | "info" } {
  const tool = e.method?.replace("MCP tools/call ", "") || e.resource;
  switch (e.event_type) {
    case "GATEWAY_ALLOW":
      return { text: `Allowed ${tool}`, tone: "ok" };
    case "GATEWAY_STEP_UP_CIBA":
      return { text: `Asked for approval: ${tool}`, tone: "warn" };
    case "GATEWAY_STEP_UP_APPROVED":
      return { text: `Approved by a human: ${tool}`, tone: "ok" };
    case "GATEWAY_STEP_UP_DENIED":
      return { text: `Approval denied: ${tool}`, tone: "bad" };
    case "GATEWAY_STEP_UP_EXPIRED":
      return { text: `Approval timed out: ${tool}`, tone: "bad" };
    case "GATEWAY_BLOCK":
      return { text: `Blocked ${tool}; access revoked`, tone: "bad" };
    case "UNTRUSTED_CONTENT_IN_CONTEXT":
      return { text: `Untrusted content read from ${e.resource}`, tone: "warn" };
    case "OAUTH_CONSENT_APPROVED":
      return { text: `${shortUser(e.actor_user)} granted access`, tone: "ok" };
    case "OAUTH_CONSENT_DENIED":
      return { text: `Access request denied`, tone: "bad" };
    case "OAUTH_AUTHORIZE_RAR":
      return { text: `Requested access`, tone: "info" };
    case "RFC7591_DCR_AUTO_REGISTER":
      return { text: `Registered`, tone: "info" };
    case "TOKEN_ISSUED":
      return { text: `Token issued`, tone: "info" };
    case "TOKEN_REFRESHED":
      return { text: `Token rotated`, tone: "info" };
    case "REFRESH_REFUSED":
      return { text: `Token refresh refused`, tone: "bad" };
    case "CIBA_STEP_UP_APPROVED":
      return { text: `${shortUser(e.actor_user)} approved a request`, tone: "ok" };
    case "CIBA_STEP_UP_DENIED":
      return { text: `${shortUser(e.actor_user)} denied a request`, tone: "bad" };
    case "TEMPORARY_ACCESS_GRANTED":
      return { text: `Temporary permission granted: ${ACTION_LABELS[e.resource] || e.resource}`, tone: "warn" };
    case "SUB_AGENT_DETECTED":
      return { text: `New sub-agent spawned by ${e.parent_agent || "its parent"}`, tone: "warn" };
    case "SUB_AGENT_DELEGATED":
      return { text: `Sub-agent given access (${(e.reasons || []).join(", ")})`, tone: "ok" };
    case "SUB_AGENT_DENIED":
    case "SUB_AGENT_EXPIRED":
      return { text: `Sub-agent not approved`, tone: "bad" };
    case "AGENT_REVOKED":
      return { text: `Agent revoked by admin`, tone: "bad" };
    case "AGENT_RESTORED":
      return { text: `Agent restored by admin`, tone: "ok" };
    case "USER_WITHDREW_CONSENT":
      return { text: `Access withdrawn`, tone: "bad" };
    default:
      return { text: e.event_type.replace(/_/g, " ").toLowerCase(), tone: "info" };
  }
}
