export interface AuthorizationDetail {
  type: string;
  locations: string[];
  actions: string[];
  data_residency?: string;
  max_amount_inr?: number;
}

export interface ActorClaim {
  sub: string;
  act?: ActorClaim;
}

export interface AgentAccessTokenClaims {
  iss: string;
  sub: string;
  client_id: string;
  aud: string;
  scope: string;
  jti: string;
  family_id: string;
  parent_jti?: string;
  iat: number;
  exp: number;
  cnf: { jkt: string };
  authorization_details: AuthorizationDetail[];
  risk: {
    issuance_score: number;
    model: string;
  };
  act?: ActorClaim;
}

export interface DPoPClaims {
  jti: string;
  htm: string;
  htu: string;
  iat: number;
  ath?: string;
}

export interface RiskDecision {
  stage: string;
  score: number;
  verdict: "allow" | "step-up" | "block_and_revoke";
  hard_rule_hit?: string;
  top_reasons: string[];
  feature_weights: Record<string, number>;
  model_version: string;
  policy_version: string;
  latency_us: number;
}

export interface TokenNode {
  jti: string;
  family_id: string;
  parent_jti?: string;
  token_type: "parent_access" | "sub_agent_access" | "refresh_token";
  client_id: string;
  user_sub: string;
  scope: string;
  dpop_jkt: string;
  status: "ACTIVE" | "REVOKED" | "ROTATED";
  revoke_cause?: string;
  issued_at: number;
  expires_at: number;
  revoked_at?: number;
}

export interface FamilyGraphSnapshot {
  family_id: string;
  user_sub: string;
  root_agent_id: string;
  revoked: boolean;
  revoke_reason?: string;
  propagation_us?: number;
  nodes: TokenNode[];
}

export interface PhonePrompt {
  prompt_id?: string;
  type: "rar_consent" | "ciba_step_up" | "dismiss";
  title?: string;
  user?: string;
  agent_id?: string;
  parent_agent_id?: string;
  task_description?: string;
  requested_resource?: string;
  requested_actions?: string[];
  ttl_display?: string;
  risk_score?: number;
  risk_reasons?: string[];
  expires_in_seconds?: number;
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  step_number?: number;
  from_lane: "user" | "agent" | "as" | "risk" | "gw" | "res";
  to_lane: "user" | "agent" | "as" | "risk" | "gw" | "res";
  label: string;
  who: string;
  headline: string;
  plain_text: string;
  under_the_hood: string;
  flow_node: string;
  status: "info" | "ok" | "warn" | "bad";
  status_text: string;
  latency_us?: number;
  token_raw?: string;
  token_claims?: AgentAccessTokenClaims;
  dpop_raw?: string;
  dpop_claims?: DPoPClaims;
  risk_decision?: RiskDecision;
  family_graph?: FamilyGraphSnapshot;
  phone_prompt?: PhonePrompt;
}

export interface IncidentRecord {
  id: string;
  disclosed: string;
  month: string;
  title: string;
  target: string;
  country: string;
  actor: string;
  agents: string;
  impact: string;
  records: number | null;
  outcome: string;
  control_gap: string;
  source: string;
  product_fit: string;
  est_low_usd: number | null;
  est_high_usd: number | null;
  oauth_alone: "Stop" | "Reduce" | "No effect";
  with_gateway: "Stop" | "Reduce" | "No effect";
  adopter: string;
  how_it_stops: string;
  why_not: string;
  with_risk: "Stop" | "Reduce" | "No effect";
  risk_layer: string;
  risk_signal: string;
  live_sim_score?: number;
  live_sim_verdict?: string;
  live_sim_hard_rule?: string;
  live_sim_latency_us?: number;
}

export interface CompetitorRecord {
  id: string;
  company: string;
  product: string;
  group: string;
  pass: string;
  guard: string;
  risk: string;
  inbound: string;
  since: string;
  status: string;
  money: string;
  strength: string;
  gap: string;
  source: string;
}

export interface DealRecord {
  id: string;
  buyer: string;
  target: string;
  month: string;
  area: string;
  price_musd: number | null;
}

export interface BenchmarkSummary {
  total_incidents: number;
  oauth_alone_stopped: number;
  oauth_alone_reduced: number;
  with_gateway_stopped: number;
  with_gateway_reduced: number;
  full_stack_stopped: number;
  full_stack_reduced: number;
  in_scope_total: number;
  in_scope_stopped: number;
  total_eval_latency_us: number;
  avg_incident_latency_us: number;
  evaluated_incidents: IncidentRecord[];
}
