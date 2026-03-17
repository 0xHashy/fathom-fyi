# Fathom Launch — Discord Announcement

---

**Fathom — Financial Reality for AI Agents**

Fathom is an MCP server that gives AI agents financial reality awareness before they make consequential decisions. Instead of raw price data, your agent gets interpreted intelligence: regime classification, risk scores, cycle positioning, and plain English guidance.

**What it does:**
Your agent calls `get_reality_check` and gets back:
- Market regime (euphoric / risk-on / transitional / risk-off / capitulation)
- Risk score (0-100) and opportunity score
- Suggested posture (aggressive / moderate / defensive / sideline)
- Key risks and opportunities — sourced and grounded
- `agent_guidance` — plain English directive the agent acts on immediately

9 tools total covering sentiment, Bitcoin halving cycle, DeFi health, macro context (Fed rates, DXY, yield curve), on-chain signals, and sector rotation.

**Install (Claude Desktop):**
Add to `claude_desktop_config.json`:
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

Both API keys are free. Works with Claude Desktop, Cursor, and any MCP client.

**Pricing:** Free tier (3 tools, 10 req/hr) | Starter $29/mo | Pro $99/mo | Trading Bot $299/mo

No credit card required to start. The free tier is not a demo — `get_reality_check` alone synthesizes 7 data dimensions into a single actionable briefing.

https://fathom.fyi
