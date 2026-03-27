# Fathom Tool Output Examples

> These are example outputs showing the JSON structure each tool returns. Actual values reflect live market conditions — these examples use realistic March 2026 data for illustration.

---

## get_reality_check

The master tool. Synthesizes all data sources into one financial reality briefing. Call this before any consequential decision.

```json
{
  "timestamp": "2026-03-27T14:32:18Z",
  "fathom_version": "4.5.1",
  "executive_summary": "Markets are in risk-off mode with capital rotating toward safety. Fear & Greed at 31. BTC dominance rising as alts bleed. DeFi TVL stable at $98.2B. Macro headwinds from strong dollar. Recommended posture: DEFENSIVE.",
  "overall_risk_environment": "elevated",
  "risk_score": 62,
  "opportunity_score": 48,
  "regime": {
    "regime": "risk-off",
    "confidence": 78,
    "evidence": [
      "Fear & Greed below 35 for 5 consecutive days",
      "BTC dominance rising — capital rotating to safety",
      "Altcoin market cap declining while BTC holds",
      "Funding rates turning negative on majors"
    ],
    "historical_analog": "Similar to September 2023 pre-ETF accumulation zone — risk-off but with institutional accumulation underneath",
    "fear_greed_score": 31,
    "fear_greed_label": "Fear",
    "btc_dominance": 57.2,
    "btc_dominance_trend": "rising",
    "total_market_cap_usd": 2840000000000,
    "market_cap_change_24h": -2.1
  },
  "cycle": {
    "estimated_cycle_phase": "late_bull",
    "cycle_progress_percentage": 72,
    "days_since_last_halving": 701
  },
  "defi": {
    "total_tvl_usd": 98200000000,
    "tvl_trend": "stable",
    "defi_health_score": 65
  },
  "macro": {
    "fed_funds_rate": 3.75,
    "fed_funds_trend": "cutting",
    "dxy_value": 106.8,
    "dxy_trend": "strengthening",
    "macro_crypto_impact": "headwind"
  },
  "sentiment": {
    "fear_greed_current": 31,
    "fear_greed_trend": "deteriorating",
    "extreme_fear_opportunity": false,
    "extreme_greed_warning": false,
    "contrarian_signal": "Approaching fear zone — historically favorable for accumulation if fundamentals hold"
  },
  "onchain": {
    "mempool_congestion": "normal",
    "mining_economics": "profitable",
    "onchain_activity": "normal"
  },
  "top_narratives": [
    { "narrative": "AI & Big Data", "momentum_score": 74 },
    { "narrative": "Real World Assets", "momentum_score": 68 },
    { "narrative": "Layer 2", "momentum_score": 52 }
  ],
  "derivatives": {
    "funding_rates": [
      { "asset": "BTC", "rate_8h": -0.0034, "annualized_pct": -1.24, "sentiment": "bearish", "trajectory": "falling" },
      { "asset": "ETH", "rate_8h": -0.0058, "annualized_pct": -2.12, "sentiment": "bearish", "trajectory": "falling" },
      { "asset": "SOL", "rate_8h": 0.0012, "annualized_pct": 0.44, "sentiment": "neutral", "trajectory": "stable" }
    ],
    "btc_put_call_ratio": 0.72,
    "btc_open_interest_usd": 18400000000,
    "btc_max_pain": 82000,
    "btc_implied_volatility": 54.2,
    "leverage_signal": "leveraged_short"
  },
  "stablecoin_flows": {
    "total_supply_usd": 178500000000,
    "change_7d_usd": -1200000000,
    "change_7d_pct": -0.67,
    "net_flow_signal": "outflow",
    "depeg_warnings": []
  },
  "tradfi_correlation": {
    "btc_sp500_correlation": 0.62,
    "btc_gold_correlation": 0.18,
    "sp500_price": 5890,
    "gold_price": 3150,
    "macro_risk_appetite": "risk_off"
  },
  "alternative_signals": {
    "composite_bias": "neutral",
    "bullish_signals": ["Year 2 of presidential term historically bullish", "March seasonality slightly positive"],
    "bearish_signals": ["Low sunshine in NYC and London this week"]
  },
  "suggested_posture": "defensive",
  "key_risks": [
    "Late-cycle positioning — window for easy gains is closing",
    "Dollar strengthening reduces crypto inflows",
    "Negative funding rates suggest short-term bearish positioning"
  ],
  "key_opportunities": [
    "Fear zone approaching — historically favorable for DCA accumulation",
    "BTC max pain at $82,000 — options expiry could pin price near that level",
    "AI narrative still accelerating despite broader weakness"
  ],
  "agent_guidance": "Defensive posture. Reduce leveraged exposure. Increase stablecoin allocation to 40-60%. Tighten stop losses on altcoins. Consider small BTC DCA if fear_greed drops below 25. Wait for funding rates to normalize before adding long exposure.",
  "data_freshness": "All sources updated within last 5 minutes",
  "sources_used": ["CoinGecko", "Alternative.me", "DeFiLlama", "Deribit", "Yahoo Finance", "FRED", "Mempool.space", "Open-Meteo"],
  "data_warnings": [],
  "response_time_ms": 2340
}
```

---

## get_asset_momentum

Short-term momentum signal for any asset. Essential for timing entries and exits. Supports 20+ assets and 5 timeframes.

```json
{
  "asset": "bitcoin",
  "coingecko_id": "bitcoin",
  "timeframe": "4h",
  "direction": "bearish",
  "strength": 62,
  "confidence": 71,
  "confidence_score": -45,
  "price_change_percent": -1.8,
  "price_start": 85540,
  "price_current": 84000,
  "volume_trend": "increasing",
  "momentum_score": -38,
  "rsi_14": 38.4,
  "atr_percentile": 67,
  "bollinger_bandwidth": 4.2,
  "volatility_state": "expanding",
  "consecutive_direction": 3,
  "agent_guidance": "Bearish momentum on the 4h timeframe with expanding volatility. RSI at 38 is approaching oversold but not there yet. Volume is increasing on the downside — this is a confirmed move, not a low-volume drift. Wait for RSI below 30 or a momentum reversal before considering long entries. If already long, tighten stops.",
  "response_time_ms": 1120
}
```

**Pro tip:** Call with multiple timeframes to confirm direction alignment:
- `get_asset_momentum` with `asset: "btc"`, `timeframe: "15m"` — scalping signal
- `get_asset_momentum` with `asset: "btc"`, `timeframe: "4h"` — swing signal
- `get_asset_momentum` with `asset: "btc"`, `timeframe: "1d"` — trend signal

If all three agree, confidence is high. If they diverge, the market is in transition.

---

## get_derivatives_context

Derivatives intelligence: funding rates, options data, and leverage positioning. Critical for understanding market positioning.

```json
{
  "funding_rates": [
    {
      "asset": "BTC",
      "rate_8h": -0.0034,
      "annualized_pct": -1.24,
      "annualized_rate": -0.0124,
      "sentiment": "bearish",
      "trajectory": "falling",
      "projected_next": "Likely to remain negative — shorts are paying longs"
    },
    {
      "asset": "ETH",
      "rate_8h": -0.0058,
      "annualized_pct": -2.12,
      "annualized_rate": -0.0212,
      "sentiment": "bearish",
      "trajectory": "falling",
      "projected_next": "Deepening negative rates — heavy short positioning on ETH"
    },
    {
      "asset": "SOL",
      "rate_8h": 0.0012,
      "annualized_pct": 0.44,
      "annualized_rate": 0.0044,
      "sentiment": "neutral",
      "trajectory": "stable",
      "projected_next": "Flat — no strong directional bias in SOL funding"
    }
  ],
  "options": {
    "btc_put_call_ratio": 0.72,
    "btc_open_interest_usd": 18400000000,
    "btc_volume_24h_usd": 1250000000,
    "btc_implied_volatility": 54.2,
    "btc_max_pain": 82000,
    "btc_options_sentiment": "Moderately bearish — put/call below 1 but max pain well below spot suggests downside gravitational pull",
    "eth_put_call_ratio": 0.68,
    "eth_open_interest_usd": 6800000000,
    "eth_options_sentiment": "Neutral to bearish — lower OI suggests less conviction in ETH options",
    "nearest_expiry": "2026-03-28T08:00:00Z"
  },
  "leverage_signal": "leveraged_short",
  "derivatives_summary": "Negative funding across BTC and ETH indicates short-heavy positioning. BTC max pain at $82,000 is $2,000 below spot — options market is pulling price down. High OI near expiry increases volatility risk. SOL is the outlier with neutral funding.",
  "agent_guidance": "Short-heavy positioning creates squeeze potential if a catalyst hits. However, the trend is your friend — don't fight negative funding without a clear reversal signal. Max pain expiry tomorrow could create a gravitational pull toward $82,000. Reduce exposure into the expiry window.",
  "response_time_ms": 1890
}
```

**Key insight for bot builders:** `btc_max_pain` is the price at which the most options expire worthless. Price tends to gravitate toward max pain near expiry. If `nearest_expiry` is within 48 hours and spot is far from max pain, expect mean-reversion toward that level.

---

## get_event_catalyst_timeline

Upcoming market-moving events with impact ratings and trading notes.

```json
{
  "current_date": "2026-03-27",
  "next_24h": [
    {
      "event": "Monthly Options Expiry (BTC + ETH)",
      "date": "2026-03-28",
      "days_until": 1,
      "hours_until": 18,
      "impact": "high",
      "category": "options",
      "expected_direction": "Pin toward max pain, then volatility expansion after settlement",
      "historical_volatility": "Options expiry days average 3-5% intraday range",
      "trading_note": "Reduce position sizes into expiry. Expect a volatility squeeze followed by a directional move post-settlement. BTC max pain at $82,000."
    }
  ],
  "next_7d": [
    {
      "event": "Monthly Options Expiry (BTC + ETH)",
      "date": "2026-03-28",
      "days_until": 1,
      "hours_until": 18,
      "impact": "high",
      "category": "options",
      "expected_direction": "Pin toward max pain, then volatility expansion after settlement",
      "historical_volatility": "Options expiry days average 3-5% intraday range",
      "trading_note": "Reduce position sizes into expiry."
    },
    {
      "event": "US PCE Price Index (February)",
      "date": "2026-03-31",
      "days_until": 4,
      "hours_until": 96,
      "impact": "high",
      "category": "economic_data",
      "expected_direction": "Hot print = bearish for crypto (tightening fears). Cool print = bullish (rate cut path confirmed)",
      "historical_volatility": "PCE releases move BTC 2-4% in the 4 hours after release",
      "trading_note": "Core PCE is the Fed's preferred inflation gauge. Deviation from consensus creates the largest moves. Reduce leverage before the print."
    }
  ],
  "next_30d": [
    {
      "event": "US Jobs Report (March NFP)",
      "date": "2026-04-03",
      "days_until": 7,
      "hours_until": 168,
      "impact": "high",
      "category": "economic_data",
      "expected_direction": "Strong jobs = hawkish Fed = bearish crypto. Weak jobs = rate cut catalyst = bullish",
      "historical_volatility": "NFP has moved BTC 2-6% on release day in 2025-2026",
      "trading_note": "Trade the reaction, not the prediction. Wait 30 minutes after release for the real direction."
    },
    {
      "event": "FOMC Rate Decision",
      "date": "2026-04-29",
      "days_until": 33,
      "hours_until": 792,
      "impact": "critical",
      "category": "monetary_policy",
      "expected_direction": "Market pricing 25bps cut — a hold would be a hawkish surprise and bearish for risk assets",
      "historical_volatility": "FOMC days have averaged 4-8% BTC range since 2023",
      "trading_note": "De-risk 48 hours before FOMC. The press conference matters more than the decision — watch for changes in forward guidance language."
    }
  ],
  "catalyst_density": "busy",
  "risk_windows": [
    "Options expiry in 18 hours — expect volatility",
    "PCE + NFP within 7 days — back-to-back macro risk"
  ],
  "agent_guidance": "Busy catalyst window ahead. Options expiry tomorrow creates pin risk followed by volatility expansion. PCE and NFP within the next week will set the macro tone. Reduce position sizes and avoid opening new leveraged positions until after April 3. FOMC in 33 days — start planning de-risk strategy by April 25.",
  "response_time_ms": 420
}
```

---

## get_signal_history

View Fathom's signal log with accuracy tracking. Use this to weight current signals by past performance.

```json
{
  "recent_signals": [
    {
      "timestamp": "2026-03-27T14:00:00Z",
      "tool": "get_reality_check",
      "regime": "risk-off",
      "posture": "defensive",
      "risk_score": 62,
      "fear_greed": 31,
      "accuracy_verdict": "pending"
    },
    {
      "timestamp": "2026-03-27T10:00:00Z",
      "tool": "get_reality_check",
      "regime": "risk-off",
      "posture": "defensive",
      "risk_score": 58,
      "fear_greed": 33,
      "accuracy_verdict": "correct"
    },
    {
      "timestamp": "2026-03-26T22:00:00Z",
      "tool": "get_reality_check",
      "regime": "risk-off",
      "posture": "defensive",
      "risk_score": 55,
      "fear_greed": 35,
      "accuracy_verdict": "correct"
    },
    {
      "timestamp": "2026-03-26T14:00:00Z",
      "tool": "get_asset_momentum",
      "regime": "risk-off",
      "posture": "defensive",
      "risk_score": 53,
      "fear_greed": 37,
      "accuracy_verdict": "correct"
    },
    {
      "timestamp": "2026-03-26T10:00:00Z",
      "tool": "get_reality_check",
      "regime": "transitional",
      "posture": "moderate",
      "risk_score": 48,
      "fear_greed": 42,
      "accuracy_verdict": "incorrect"
    }
  ],
  "accuracy": {
    "evaluated_signals": 47,
    "win_rate_pct": 72.3
  },
  "total_signals_logged": 312,
  "agent_guidance": "72.3% win rate across 47 evaluated signals. Current defensive posture signal has been consistent for 3 consecutive readings — regime stability is high. The transitional call from yesterday was revised to risk-off within 4 hours. Weight the current risk-off signal heavily given multi-reading confirmation.",
  "response_time_ms": 180
}
```

**Pro tip for bot builders:** Use `win_rate_pct` to dynamically weight Fathom signals in your probability model. If win rate is above 70%, increase the weight. If below 60%, reduce it and rely more on your own indicators.

---

## get_stablecoin_flows

Stablecoin supply tracking — a leading indicator of capital entering or leaving crypto.

```json
{
  "total_supply_usd": 178500000000,
  "change_24h_usd": -340000000,
  "change_7d_usd": -1200000000,
  "change_30d_usd": 2800000000,
  "change_24h_pct": -0.19,
  "change_7d_pct": -0.67,
  "change_30d_pct": 1.59,
  "net_flow_signal": "outflow",
  "top_stablecoins": [
    {
      "symbol": "USDT",
      "circulating_usd": 118200000000,
      "change_7d_pct": -0.42,
      "peg_price": 0.9998,
      "depeg_risk": false
    },
    {
      "symbol": "USDC",
      "circulating_usd": 42800000000,
      "change_7d_pct": -1.12,
      "peg_price": 1.0001,
      "depeg_risk": false
    },
    {
      "symbol": "DAI",
      "circulating_usd": 5200000000,
      "change_7d_pct": -0.89,
      "peg_price": 0.9997,
      "depeg_risk": false
    }
  ],
  "depeg_warnings": [],
  "liquidity_summary": "Short-term outflows across all major stablecoins. USDC seeing the largest percentage decline — typically indicates institutional redemptions. 30-day trend is still positive, suggesting this is a pullback within a longer inflow trend, not a reversal.",
  "agent_guidance": "Net stablecoin outflow over the past 7 days. This is a leading bearish signal — capital is leaving the crypto ecosystem. However, 30-day flows remain positive, so the medium-term picture is still constructive. Watch for USDT outflows specifically — USDT leads retail sentiment. No depeg risk detected.",
  "response_time_ms": 1450
}
```

---

## get_watchlist_report

Batch analyze multiple assets at once. Max 10 assets per call.

```json
{
  "assets": [
    {
      "asset": "bitcoin",
      "price_usd": 84000,
      "cycle_position": "distribution",
      "risk_level": "moderate",
      "volume_health": "normal",
      "price_trend": "downtrend",
      "holder_behavior": "Long-term holders showing slight distribution — profit-taking at cycle highs",
      "changed_since_last_check": true,
      "change_detail": "cycle_position changed from markup to distribution"
    },
    {
      "asset": "ethereum",
      "price_usd": 2100,
      "cycle_position": "markdown",
      "risk_level": "high",
      "volume_health": "thin",
      "price_trend": "strong_downtrend",
      "holder_behavior": "Active selling pressure — ETH underperforming BTC significantly",
      "changed_since_last_check": true,
      "change_detail": "risk_level elevated from moderate to high"
    },
    {
      "asset": "solana",
      "price_usd": 135,
      "cycle_position": "distribution",
      "risk_level": "moderate",
      "volume_health": "elevated",
      "price_trend": "downtrend",
      "holder_behavior": "Mixed — ecosystem activity holding but price under pressure",
      "changed_since_last_check": false,
      "change_detail": "No state changes since last check"
    },
    {
      "asset": "avalanche-2",
      "price_usd": 22.5,
      "cycle_position": "markdown",
      "risk_level": "high",
      "volume_health": "thin",
      "price_trend": "strong_downtrend",
      "holder_behavior": "Low conviction — volume declining with price",
      "changed_since_last_check": false,
      "change_detail": "No state changes since last check"
    }
  ],
  "state_changes": ["bitcoin", "ethereum"],
  "elevated_volume_assets": ["solana"],
  "highest_risk_asset": "ethereum",
  "lowest_risk_asset": "bitcoin",
  "total_assets": 4,
  "agent_guidance": "2 of 4 watchlist assets changed state — BTC entered distribution and ETH elevated to high risk. ETH is the weakest asset with thin volume and strong downtrend — avoid new ETH longs. SOL shows elevated volume which could indicate a bottom or further selling — monitor closely. BTC is the relative safe haven in this watchlist. AVAX is in markdown with thin volume — do not catch this falling knife.",
  "response_time_ms": 3200
}
```

---

## Quick Reference: What to Call When

| Scenario | Tools to Call |
|----------|--------------|
| Before any trade | `get_reality_check` + `get_asset_momentum` for the asset |
| Daily briefing | `get_reality_check` |
| Timing an entry | `get_asset_momentum` (15m + 4h) + `get_derivatives_context` |
| Near FOMC/CPI | `get_event_catalyst_timeline` + `get_macro_context` |
| Portfolio check | `set_portfolio_context` then `get_portfolio_analysis` |
| Multi-asset comparison | `get_watchlist_report` with up to 10 assets |
| Stablecoin liquidity | `get_stablecoin_flows` |
| DeFi safety | `get_defi_health` + `get_chain_context` for specific chains |
| Contrarian signals | `get_sentiment_state` + `get_alternative_signals` |
| Backtest conditions | `get_historical_context` with a specific date |
| Signal accuracy | `get_signal_history` |
