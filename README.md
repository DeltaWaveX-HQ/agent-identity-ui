# Agent Identity — Next.js UI (`agent-identity-ui`)

Interactive Command Center, Virtual Smartphone Simulator (RFC 9396 RAR & OpenID CIBA Push), Cryptographic JWT/DPoP & Token Family DAG Inspector, and 25-Incident Empirical Red-Team Benchmark Dashboard for the **Agent Identity** platform.

## Quick Start

1. Start the Go backend (`agent-identity-backend`) on port `8080`:
   ```bash
   cd ../agent-identity-backend
   go run ./cmd/server
   ```
2. Install dependencies and start the Next.js development server on port `3000`:
   ```bash
   cd ../agent-identity-ui
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000`. (Note: If the Go backend is offline, the UI automatically falls back to a built-in deterministic Go-spec simulator so live demos never fail!)
