# Fathom Launch — Reddit Posts

---

## r/ClaudeAI

**Title:** I built an MCP server that checks weather in financial centers before your agent trades (and 21 other signals)

**Body:**

I know a guy who only trades when the sun is shining. Sounds crazy until you learn the Journal of Finance published a study proving sunshine in financial centers correlates with positive market returns.

That got me thinking: what if the reason most AI agents make bad trades isn't the strategy — it's that they're only looking at 5% of the picture?

So I built Fathom. It's an MCP server that synthesizes 22 signals across 6 data sources into one financial reality briefing. Your agent calls `get_reality_check` and gets regime classification, risk scores, halving cycle position, DeFi health, macro context, on-chain signals — and also weather in NYC/London/Tokyo, presidential cycle positioning, seasonality patterns, and macro event calendar.

The combination is the signal. A cloudy Tuesday in September, 3 days before FOMC, in Year 2 of a presidential cycle, with Fear & Greed at 28 and options expiry on Friday — that paints a very specific picture no single data point reveals.

Other features: set your portfolio and get personalized rebalancing suggestions, define custom alerts, test trading strategies against live conditions, customize which signals matter to you.

Works with Claude Desktop, Cursor, Windsurf, any MCP client. Free tier gives you 3 core tools. Full access from $29/mo.

https://fathom.fyi

---

## r/CryptoCurrency

**Title:** I built an AI tool that checks if it's cloudy in New York before your bot trades — and it's backed by actual research

**Body:**

Before you roast me: the "sunshine effect" is a real, published finding from the Journal of Finance. Hirshleifer & Shumway (2003) proved statistically significant correlation between weather in financial centers and same-day market returns.

But that's just one signal. The real insight is that the best traders I know all have "weird" inputs — one watches political cycles (Year 3 of a presidential term averages +16%), another swears by September weakness, another tracks options expiry dates.

None of them are wrong. They're just looking at signals that most people (and all AI agents) completely ignore.

So I built Fathom — an MCP server that gives AI agents 22 different signals before they trade:

Standard: regime classification, Fear & Greed, BTC cycle position, DeFi TVL health, macro context (Fed/DXY/yield curve), on-chain data, sector rotation

Alternative: weather in NYC/London/Tokyo/Hong Kong, presidential cycle day, monthly seasonality bias, active seasonal effects (Sell in May, Santa Claus rally), FOMC/CPI proximity, options expiry calendar

Plus: portfolio analysis, custom alerts, trading strategy testing, watchlist reports, crowd intelligence from other connected agents.

One call. All of it. Under 3 seconds.

Free tier: 3 tools, no credit card. Full access from $29/mo.

https://fathom.fyi — the FYI your agent needs before it acts.

---

## r/cursor

**Title:** New MCP server: 22 financial intelligence tools for Cursor (including weather patterns and political cycles)

**Body:**

Just shipped Fathom — an MCP server that gives Cursor real-time financial intelligence across 22 tools and 6 data sources.

The hook: it doesn't just check price and sentiment. It also checks weather in financial centers (academically documented correlation with returns), presidential cycle positioning, seasonality patterns, FOMC/CPI proximity, and options expiry dates. The combination of all these signals is what makes it unique.

Setup for Cursor — add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "fathom": {
      "command": "npx",
      "args": ["-y", "fathom-fyi"],
      "env": {
        "CG_API_KEY": "your_coingecko_key",
        "FRED_API_KEY": "your_fred_key",
        "FATHOM_API_KEY": "your_fathom_key"
      }
    }
  }
}
```

CoinGecko and FRED keys are free. FATHOM_API_KEY unlocks paid tools (subscribe at fathom.fyi).

Features beyond basic market data:
- Custom alerts ("alert when fear < 20 and regime == capitulation")
- Portfolio analysis (tell it what you hold, get rebalancing suggestions)
- Strategy testing (5 built-in strategies + create your own)
- Signal preferences (choose which signals feed into your briefing)
- Watchlist reports (batch analyze 10 assets, detect state changes)

Free tier: 3 tools, 10 req/hr. No credit card.

https://fathom.fyi
