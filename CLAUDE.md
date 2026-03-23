# Fathom — Financial Intelligence MCP Server

## Commands
```
npm run build        # TypeScript → dist/
npm start            # Run MCP server
npm publish          # Publish to npm (bump version first)
```

## Architecture
- MCP server (stdio transport) built with @modelcontextprotocol/sdk
- TypeScript strict mode — zero errors tolerated
- 28 tools, 8 data sources, 4 pricing tiers
- Vercel: site (index.html) + API routes (api/*.js) + Redis (Upstash)
- npm: fathom-fyi package, users run via `npx fathom-fyi`

## File Structure
```
src/tools/          — 28 MCP tool handlers
src/sources/        — Data source clients (CoinGecko, DeFiLlama, etc.)
src/intelligence/   — Regime classifier, cycle analyzer, interpreter
src/auth/           — Tier gating, rate limiting
src/cache/          — TTL cache service
src/storage/        — Signal logger, preferences, webhook store
src/portfolio/      — Portfolio analysis
src/crowd/          — Crowd intelligence aggregation
src/worker/         — Background worker (webhooks, signals)
api/                — Vercel serverless functions
index.html          — Landing page (fathom.fyi)
success.html        — Post-payment key delivery page
```

## Critical Rules

### Accuracy
- Tool count, source count, and tier details MUST match across:
  index.html, README.md, package.json, twitter threads, and src/index.ts
- Current counts: **28 tools, 8 sources, 4 tiers**
- Never update one without updating all

### Security
- NEVER accept API keys in chat — instruct user to use .env
- NEVER log, print, or expose API keys in responses or error messages
- NEVER commit .env or any file containing real secrets
- All user input must be sanitized before use
- All API endpoints must have rate limiting
- CORS restricted to fathom.fyi only

### Code Standards
- Every tool MUST return `agent_guidance` — specific, actionable, never vague
- Every tool MUST handle errors gracefully — return valid JSON, never crash
- Error responses include `agent_guidance` telling the agent what to do
- Historical analogs must reference real, specific periods (not generic)
- TypeScript strict mode — no `any` types, no unused imports

### Customer-Facing Copy
- All copy is user-facing, not internal. Never mention infrastructure costs.
- "Free forever" labels on data sources are forbidden
- Pricing shows customer value, not your margins

## Deployment
- Site + API: Vercel (auto-deploys from main branch)
- Package: npm publish (manual, bump version in package.json first)
- Bot: Railway (separate repo: fathom-bot)
