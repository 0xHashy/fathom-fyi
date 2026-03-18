# Fathom — Financial Reality for AI Agents

> For Your Intelligence. The FYI your agent needs before it acts.

**Live at [fathom.fyi](https://fathom.fyi)**

## What is Fathom?

Fathom is an MCP server that gives AI agents financial reality awareness before they make consequential decisions.

**The problem:** Every AI agent operating in crypto today is blind. Trading bots see prices but don't understand context. DeFi agents deploy capital without knowing where we are in the cycle. Treasury managers make decisions without macro awareness. They have data but no understanding.

**The solution:** Fathom synthesizes 5 real-time data sources into interpreted intelligence — regime classification, cycle positioning, sentiment state, DeFi health, macro context, and on-chain signals — delivered as plain English guidance an agent can act on immediately.

Your agent doesn't get "BTC is $82,000." It gets: *"Market is in late-stage risk-off rotation. Fear & Greed at 28. BTC dominance rising — capital rotating to safety. Historical analog: Q4 2022 pre-recovery accumulation zone. Recommended posture: defensive."*

## Quick Start

### Install via npm

```bash
npm install -g fathom-fyi
```

Or run directly with npx (no install needed):

```bash
npx fathom-fyi
```

### Configure for Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fathom": {
      "command": "npx",
      "args": ["-y", "fathom-fyi"],
      "env": {
        "CG_API_KEY": "your_coingecko_key",
        "FRED_API_KEY": "your_fred_key",
        "FATHOM_API_KEY": "your_fathom_api_key"
      }
    }
  }
}
```

### Configure for Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "fathom": {
      "command": "npx",
      "args": ["-y", "fathom-fyi"],
      "env": {
        "CG_API_KEY": "your_coingecko_key",
        "FRED_API_KEY": "your_fred_key",
        "FATHOM_API_KEY": "your_fathom_api_key"
      }
    }
  }
}
```

### Configure for any MCP client

Fathom uses stdio transport. Point any MCP client at:

```bash
npx -y fathom-fyi
```

Set environment variables `CG_API_KEY`, `FRED_API_KEY`, and optionally `FATHOM_API_KEY` before launching.

## Environment Setup

| Variable | Description | Where to get it | Required? |
|----------|-------------|-----------------|-----------|
| `CG_API_KEY` | CoinGecko API key | [coingecko.com/api](https://www.coingecko.com/en/api) | Yes |
| `FRED_API_KEY` | Federal Reserve (FRED) API key | [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) | Yes (for macro data) |
| `FATHOM_API_KEY` | Your Fathom subscription key | [fathom.fyi](https://fathom.fyi) | No (free tier without it) |
| `CACHE_ENABLED` | Enable response caching | — | No (defaults to `true`) |

CoinGecko and FRED API keys are **free** to obtain. `FATHOM_API_KEY` unlocks paid tiers.

## Tools (13 instruments)

### Free Tier (3 tools)

| Tool | Description | Cache TTL |
|------|-------------|-----------|
| `get_reality_check` | Master briefing — synthesizes all sources into unified assessment with risk scores and posture | 180s |
| `get_market_regime` | Market regime classification (risk-on/off, euphoric, capitulation) with confidence scoring | 300s |
| `get_sentiment_state` | Fear & Greed Index, 7-day trend, contrarian signals, extreme opportunity detection | 300s |

### Starter Tier (10 tools — $29/mo)

All free tools plus:

| Tool | Description | Cache TTL |
|------|-------------|-----------|
| `get_narrative_pulse` | Sector rotation, accelerating/decelerating narratives, momentum scoring | 900s |
| `get_asset_context` | Deep context on any asset: cycle position, trend, volume health, risk level | 120s |
| `get_temporal_context` | Bitcoin halving cycle positioning with historical analogs | 3600s |
| `get_defi_health` | DeFi ecosystem TVL, health score, concentration risk, revenue trends | 600s |
| `get_macro_context` | Fed rates, DXY, yield curve, recession probability, crypto impact | 14400s |
| `get_onchain_pulse` | Bitcoin network health, mempool, fees, mining economics | 600s |
| `set_portfolio_context` | Save your portfolio holdings for personalized guidance | — |

### Pro Tier (13 tools — $99/mo)

All Starter tools plus:

| Tool | Description | Cache TTL |
|------|-------------|-----------|
| `get_portfolio_analysis` | Personalized analysis: regime alignment, concentration risk, rebalancing suggestions | Real-time |
| `get_crowd_intelligence` | Aggregate behavior of all Fathom-connected agents: consensus posture, crowd fear | Real-time |
| `get_signal_history` | Fathom's track record: every signal logged, outcomes tracked, win rates | Real-time |

## Example Agent Prompts

**Before any trade:**
> "Use get_reality_check to assess current market conditions. What is the risk score and suggested posture? Should I proceed with this trade?"

**Portfolio check:**
> "Use set_portfolio_context with my holdings: 2 BTC, 50 SOL, $10k USDC. Then use get_portfolio_analysis — is my portfolio aligned with the current regime?"

**Narrative research:**
> "Use get_narrative_pulse to identify which crypto sectors are accelerating. Where is the momentum?"

**Asset due diligence:**
> "Use get_asset_context for SOL, then get_reality_check for the overall environment. Is this a good entry point?"

**Macro awareness:**
> "Use get_macro_context and get_temporal_context. Where are we in the cycle and what's the macro backdrop?"

**Risk assessment before deploying capital:**
> "Use get_reality_check. What are the top 3 risks I should be aware of before deploying capital today?"

## Pricing

| Tier | Price | Tools | Rate Limit |
|------|-------|-------|------------|
| Free | $0 | 3 core tools | 10 req/hr |
| Starter | $29/mo | 10 tools + portfolio context | 500 req/hr |
| Pro | $99/mo | All 13 + crowd intelligence + signal history | 2,000 req/hr |
| Trading Bot | $299/mo | All 13 + webhooks + 4x fresher cache | Unlimited |

[Subscribe at fathom.fyi](https://fathom.fyi)

## Data Sources

| Source | Cost | What it provides |
|--------|------|------------------|
| **CoinGecko** | Free tier (30 calls/min) | Prices, market caps, OHLC, categories, trending |
| **Alternative.me** | Free forever | Fear & Greed Index |
| **DeFiLlama** | Free forever | DeFi TVL, protocol data, fees |
| **FRED** | Free forever | Fed Funds Rate, DXY, yield curve |
| **Mempool.space** | Free forever | Bitcoin network health, fees, mining |

**Total infrastructure cost at launch: ~$0/month.**

## License

MIT
