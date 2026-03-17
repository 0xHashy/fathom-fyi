# Fathom Launch — Reddit Posts

---

## r/ClaudeAI

**Title:** I built an MCP server that gives Claude financial awareness before it acts

**Body:**

I've been building AI agent workflows for crypto and kept running into the same problem: Claude is great at reasoning, but when it comes to financial decisions, it's working with raw numbers and no context. It knows BTC is $82,000 but has no idea whether that's a good time to buy, sell, or sit still.

So I built Fathom — an MCP server that synthesizes 5 real-time data sources (CoinGecko, Fear & Greed Index, DeFiLlama, Federal Reserve/FRED, and Mempool.space) into interpreted intelligence. Instead of returning raw data, every tool response includes an `agent_guidance` field with plain English direction like "Defensive posture recommended. Risk score 68/100. Multiple headwinds present."

There are 9 tools covering market regime classification, sentiment state, Bitcoin halving cycle position, DeFi health, macro context, on-chain signals, narrative/sector momentum, and asset-level deep dives. The master tool, `get_reality_check`, pulls everything together into a single unified briefing.

The key idea is that Claude shouldn't have to guess what "Fear & Greed at 28 with rising BTC dominance and an inverted yield curve" means. Fathom interprets that into a risk score, a posture recommendation, key risks, and key opportunities — grounded in the actual data, not hallucinated.

Works with Claude Desktop and any MCP client. Setup is adding one entry to your `claude_desktop_config.json` with two free API keys (CoinGecko and FRED).

Free tier gives you 3 core tools at 10 requests/hour. Full access starts at $29/mo.

https://fathom.fyi

Happy to answer questions about the architecture or how the intelligence layer works.

---

## r/CryptoCurrency

**Title:** I built free infrastructure that tells AI trading bots when NOT to trade

**Body:**

Most of the AI trading bot projects I see focus on when to enter trades. Almost none of them have any concept of when to stay out.

Your bot doesn't know that we're in a risk-off regime. It doesn't know DeFi TVL dropped 8% this week. It doesn't know the yield curve just inverted or that BTC dominance is rising (capital rotating to safety). It sees a technical signal and executes, completely blind to the macro and sentiment environment.

I built Fathom to fix this. It's an MCP server (Model Context Protocol — the standard Anthropic created for giving AI agents access to tools) that synthesizes data from CoinGecko, the Fear & Greed Index, DeFiLlama, the Federal Reserve (FRED), and Mempool.space into a single financial reality briefing.

The core output is a risk score (0-100), a regime classification (euphoric / risk-on / transitional / risk-off / capitulation), Bitcoin cycle positioning, and a suggested posture (aggressive / moderate / defensive / sideline). All with plain English guidance the agent can act on directly.

Every data source is free. CoinGecko free tier, Alternative.me, DeFiLlama, FRED, Mempool.space — all free forever. The value is the interpretation layer that sits on top.

Free tier: 3 core tools, 10 requests/hour. No credit card.

If you're building trading bots or just want your AI assistant to have real financial awareness before it gives you advice, check it out: https://fathom.fyi

Not trying to sell anything here — the free tier is genuinely useful on its own. I use it myself for the `get_reality_check` call before making any decisions.

---

## r/cursor

**Title:** New MCP server: real-time crypto market intelligence for Cursor

**Body:**

Just shipped an MCP server called Fathom that gives Cursor real-time crypto market intelligence. If you're building anything in the crypto/DeFi space, this gives your Cursor agent actual financial awareness instead of relying on its training data or hallucinating market conditions.

What it does: Fathom pulls from 5 live data sources (CoinGecko, Fear & Greed Index, DeFiLlama, Federal Reserve, Bitcoin mempool) and returns interpreted intelligence — not raw numbers. Every response includes an `agent_guidance` field with actionable direction.

9 tools covering market regime, sentiment, Bitcoin cycle position, DeFi health, macro context, on-chain data, sector rotation, and asset-level analysis.

Setup for Cursor — add to `.cursor/mcp.json`:

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

Both API keys are free to get (CoinGecko and FRED). Takes about 2 minutes to set up.

Free tier: 3 core tools at 10 req/hr. Full suite starts at $29/mo.

Use cases I've found most useful in Cursor:
- Ask Cursor to check market conditions before writing trading logic
- Get real-time DeFi protocol data while building integrations
- Have Cursor assess risk before suggesting trade parameters

https://fathom.fyi
