# Fathom Launch — Twitter/X Threads

---

## Thread 1: The Announcement

**Tweet 1 (Hook)**
Every AI agent trading crypto right now is flying blind.

They see prices. They don't see context.

We just fixed that. Introducing Fathom.

**Tweet 2**
The problem: your AI agent knows BTC is $82,000.

It doesn't know that Fear & Greed is at 28, BTC dominance is rising (capital fleeing to safety), DeFi TVL dropped 8% this week, and the yield curve just re-inverted.

It has data. It has zero understanding.

**Tweet 3**
Fathom is an MCP server that gives AI agents financial reality awareness.

Instead of raw numbers, your agent gets:
- Regime classification (risk-on, risk-off, euphoric, capitulation)
- Cycle positioning (where we are in the 4-year halving cycle)
- Risk score (0-100)
- Plain English guidance on how to act

**Tweet 4**
Every Fathom response includes an `agent_guidance` field.

No parsing. No prompt engineering. No hallucinated analysis.

Just grounded, sourced intelligence your agent can act on immediately.

Example: "Defensive posture recommended. Multiple risk indicators elevated. Reduce position sizes. Tighten stop losses. Avoid new leveraged positions."

**Tweet 5**
9 tools covering every dimension of financial reality:

- Market regime & sentiment
- Bitcoin halving cycle position
- DeFi ecosystem health
- Macro context (Fed, DXY, yield curve)
- On-chain signals (fees, mining, mempool)
- Sector rotation & narrative momentum
- Deep asset context

**Tweet 6**
Built on 5 real-time data sources. No paid API keys required to get started.

The value isn't the data — it's the interpretation layer.

Free tier: 3 core tools, 10 req/hr.
Full access starts at $29/mo.

No credit card. No waitlist.

**Tweet 7**
The FYI your agent needs before it acts.

Try Fathom free: https://fathom.fyi
GitHub: [link]

Works with Claude Desktop, Cursor, and any MCP client. Setup takes 2 minutes.

---

## Thread 2: The Technical Deep Dive

**Tweet 1 (Hook)**
I built an MCP server that synthesizes 5 real-time data sources into interpreted financial intelligence for AI agents.

Here's the architecture behind Fathom and why every response includes plain English guidance instead of raw numbers.

**Tweet 2**
The stack:

- TypeScript MCP server (stdio transport)
- 5 data sources: CoinGecko, Alternative.me, DeFiLlama, FRED, Mempool.space
- Intelligence layer: regime classifier, cycle analyzer, analog matcher, risk scorer
- Tiered caching (120s to 14,400s TTLs based on data volatility)
- Graceful degradation on source failures

**Tweet 3**
The intelligence layer is the key differentiator.

Raw input: BTC price, market cap, dominance %, Fear & Greed score, DeFi TVL, Fed Funds rate, yield curve spread.

Output: regime classification, risk score (0-100), opportunity score, suggested posture (aggressive/moderate/defensive/sideline), and `agent_guidance`.

**Tweet 4**
Every single tool response includes `agent_guidance` — a plain English directive that tells the AI exactly what the data means and how to act on it.

This is not a summary. It's an interpreted signal. The agent doesn't need to figure out what "Fear & Greed at 28 with rising BTC dominance" means. Fathom tells it.

**Tweet 5**
Claude Desktop config — this is all you need:

```json
{
  "mcpServers": {
    "fathom": {
      "command": "node",
      "args": ["/path/to/fathom.fyi/dist/index.js"],
      "env": {
        "CG_API_KEY": "your_coingecko_key",
        "FRED_API_KEY": "your_fred_key",
        "API_TIER": "free"
      }
    }
  }
}
```

Two free API keys. Two minutes to set up.

**Tweet 6**
Failure handling was a first-class design goal.

If CoinGecko is down, Fathom doesn't silently return garbage. It tells the agent exactly what's missing, provides last-known-good data, and adjusts confidence scores.

Your agent never operates on incomplete data without knowing it.

**Tweet 7**
Source code and docs: https://fathom.fyi

Free tier: `get_reality_check`, `get_market_regime`, `get_sentiment_state` — 10 req/hr.

Full suite (9 tools, up to unlimited requests): starts at $29/mo.

Works with any MCP-compatible client.

---

## Thread 3: The Business Case

**Tweet 1 (Hook)**
If you're building a crypto trading bot and your agent doesn't know the current market regime, cycle position, or macro context before it trades — you have a liability, not a product.

Here's how to fix that for $0.

**Tweet 2**
Fathom is an MCP server that gives AI agents financial reality awareness.

Your bot calls `get_reality_check` before every trade. It gets back a risk score, regime classification, cycle position, and plain English guidance: "Defensive posture. Risk 68/100. Reduce position sizes. Tighten stops."

That's the difference between a toy and a tool.

**Tweet 3**
The data sources are all free or near-free:
- CoinGecko (free tier)
- Alternative.me (free forever)
- DeFiLlama (free forever)
- FRED / Federal Reserve (free forever)
- Mempool.space (free forever)

Infrastructure cost: ~$0/month.

**Tweet 4**
Pricing:
- Free: 3 core tools, 10 req/hr — enough for manual agent workflows
- Starter ($29/mo): All 9 tools, 500 req/hr
- Pro ($99/mo): All 9 tools, fresher cache, 2,000 req/hr
- Trading Bot ($299/mo): Priority freshness, unlimited requests

**Tweet 5**
The free tier is not a demo. It's a fully functional financial awareness layer.

`get_reality_check` alone synthesizes 7 data dimensions into a single actionable briefing. Most agents only need that one call.

Start free. Upgrade when your bot needs more.

https://fathom.fyi
