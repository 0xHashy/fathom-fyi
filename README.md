# Fathom — Financial Reality for AI Agents

> For Your Intelligence. The FYI your agent needs before it acts.

**Live at [fathom.fyi](https://fathom.fyi)**

## What is Fathom?

Fathom is an MCP server that gives AI agents financial reality awareness before they make consequential decisions.

**The problem:** Every AI agent operating in crypto today is blind. Trading bots see prices but don't understand context. DeFi agents deploy capital without knowing where we are in the cycle. Treasury managers make decisions without macro awareness. They have data but no understanding.

**The solution:** Fathom synthesizes 8 real-time data sources into interpreted intelligence — regime classification, cycle positioning, sentiment state, DeFi health, macro context, and on-chain signals — delivered as plain English guidance an agent can act on immediately.

Your agent doesn't get "BTC is $82,000." It gets: *"Market is in late-stage risk-off rotation. Fear & Greed at 28. BTC dominance rising — capital rotating to safety. Historical analog: Q4 2022 pre-recovery accumulation zone. Recommended posture: defensive."*

## Quick Start

### Zero config — works immediately

Add to your **Claude Desktop** config (`Settings → Developer → Edit Config`):

```json
{
  "mcpServers": {
    "fathom": {
      "command": "npx",
      "args": ["-y", "fathom-fyi"]
    }
  }
}
```

Save. Restart Claude Desktop. Ask Claude: *"Use Fathom to check the market."*

That's it. Three free tools, live data, no API keys needed.

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "fathom": {
      "command": "npx",
      "args": ["-y", "fathom-fyi"]
    }
  }
}
```

### Any MCP client

Fathom uses stdio transport. Point any MCP client at `npx -y fathom-fyi`.

### Unlock everything with one key

Subscribe at [fathom.fyi](https://fathom.fyi), add your key to the config, and you're done. One key unlocks all 27 tools, all 8 data sources, and premium data routing. No other API keys needed — Fathom handles all data source authentication server-side.

```json
"env": {
  "FATHOM_API_KEY": "fathom_sk_your_key"
}
```

## Tools (27 instruments)

### Free Tier (3 tools)

| Tool | Description |
|------|-------------|
| `get_reality_check` | Market briefing with regime, sentiment, risk score. Paid tiers add alternative signals. |
| `get_market_regime` | Regime classification (risk-on/off, euphoric, capitulation) with confidence scoring |
| `get_sentiment_state` | Fear & Greed Index, 7-day trend, contrarian signals, extreme opportunity detection |

### Starter Tier (20 tools — $29/mo)

All free tools plus:

| Tool | Description |
|------|-------------|
| `get_narrative_pulse` | Sector rotation, accelerating/decelerating narratives, momentum scoring |
| `get_asset_context` | Deep context on any asset: cycle position, trend, volume health, risk level |
| `get_temporal_context` | Bitcoin halving cycle positioning with historical analogs |
| `get_defi_health` | DeFi ecosystem TVL, health score, concentration risk, revenue trends |
| `get_macro_context` | Fed rates, DXY, yield curve, recession probability, crypto impact |
| `get_onchain_pulse` | Bitcoin network health, mempool, fees, mining economics |
| `set_portfolio_context` | Save your portfolio holdings for personalized guidance |
| `set_alert` | Define custom alert conditions (e.g., "fear_greed < 20") |
| `get_alerts` | Check which of your alerts are triggered against live data |
| `get_watchlist_report` | Batch analyze up to 10 assets with state change detection |
| `evaluate_strategy` | Test built-in or custom strategies against live conditions |
| `get_chain_context` | Per-chain DeFi intelligence (Ethereum, Solana, Base, Arbitrum, etc.) |
| `get_alternative_signals` | Weather in financial centers, political cycles, seasonality, macro calendar |
| `get_derivatives_context` | Funding rates, options data (put/call, OI, IV, max pain), leverage positioning |
| `get_stablecoin_flows` | Stablecoin supply tracking, minting/redemptions, capital flow signal, depeg warnings |
| `get_correlation_matrix` | BTC correlation with S&P 500 and Gold, TradFi prices, macro risk appetite |
| `set_signal_preferences` | Customize which signals feed into your reality check |

### Pro Tier (25 tools — $99/mo)

All Starter tools plus:

| Tool | Description |
|------|-------------|
| `get_portfolio_analysis` | Personalized portfolio analysis with regime alignment and rebalancing |
| `get_crowd_intelligence` | Aggregate behavior of all Fathom-connected agents |
| `get_signal_history` | Fathom's track record: every signal logged, outcomes tracked |
| `get_historical_context` | What were market conditions on any past date? |
| `set_custom_strategy` | Create custom trading strategies with your own condition rules |

### Unlimited Tier (27 tools — $299/mo)

All Pro tools plus:

| Tool | Description |
|------|-------------|
| `set_webhook` | Register HTTP webhooks that fire when market conditions meet your criteria |
| `manage_webhooks` | List, monitor, and remove active webhooks |

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
| Starter | $29/mo | 20 tools + alerts + strategies + alternative signals | 500 req/hr |
| Pro | $99/mo | All 27 + custom strategies + crowd intelligence | 2,000 req/hr |
| Unlimited | $299/mo | All 27 + webhooks + unlimited requests + 4x fresher cache | Unlimited |

[Subscribe at fathom.fyi](https://fathom.fyi)

## Data Sources

| Source | What it provides | Freshness |
|--------|------------------|-----------|
| **CoinGecko** | Prices, market caps, OHLC, categories, trending | Real-time |
| **Alternative.me** | Fear & Greed Index | Real-time |
| **DeFiLlama** | DeFi TVL, protocol data, stablecoin supply | Real-time |
| **Deribit** | Funding rates, options OI, put/call, implied vol, max pain | Real-time |
| **Yahoo Finance** | S&P 500, Gold — TradFi correlation | Daily |
| **FRED** | Fed Funds Rate, DXY, yield curve | Daily |
| **Mempool.space** | Bitcoin network health, fees, mining | Real-time |
| **Open-Meteo** | Weather in financial centers (sunshine effect) | Real-time |

## License

MIT
