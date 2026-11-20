export type NavTab =
  | "dashboard"
  | "consents-agents"
  | "setup-flow"
  | "audit-logs"
  | "gateway-policies"
  | "settings";

export interface RegisteredAgentItem {
  agent_id: string;
  name?: string;
  owner_user: string;
  parent_agent_id?: string;
  spiffe_id: string;
  model_id: string;
  allowed_scopes?: string[];
  dpop_thumbprint: string;
  registered_at: number;
  status: string;
}

export interface AuditEntry {
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
  dpop_jkt?: string;
  token_jti?: string;
  family_id?: string;
  latency_us: number;
}

export interface OrgFlowConfig {
  dcr: boolean;
  camd: boolean;
  dpop: boolean;
  egress: boolean;
  ciba: boolean;
  tokenExchange: boolean;
}
