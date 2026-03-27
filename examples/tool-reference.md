# Fathom Tool Reference

> Complete API reference for all 31 Fathom MCP tools. Every parameter, every output field.

## Table of Contents

- [Core Intelligence](#core-intelligence)
- [Market Data](#market-data)
- [DeFi & On-Chain](#defi--on-chain)
- [Macro](#macro)
- [Portfolio & Strategy](#portfolio--strategy)
- [Alerts & Automation](#alerts--automation)
- [History & Intelligence](#history--intelligence)
- [Configuration](#configuration)

---

## Core Intelligence

### get_reality_check
**The master tool.** Synthesizes ALL data sources into one unified briefing. Call before any consequential decision.

**Tier:** Free (paid tiers add derivatives, stablecoin flows, TradFi correlation, alternative signals)
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `executive_summary` | string | Plain English market summary |
| `risk_score` | number (0-100) | Overall risk level. >70 = elevated, >85 = extreme |
| `opportunity_score` | number (0-100) | Opportunity level |
| `suggested_posture` | string | `aggressive` / `moderate` / `defensive` / `sideline` |
| `regime` | object | Regime classification with confidence, evidence, historical analog |
| `cycle` | object | Bitcoin halving cycle phase and progress |
| `defi` | object | TVL, health score, trend |
| `macro` | object | Fed rate, DXY, yield curve, crypto impact |
| `sentiment` | object | Fear/Greed, contrarian signals, extremes |
| `onchain` | object | Mempool, mining, network activity |
| `top_narratives` | array | Accelerating narratives with momentum scores |
| `derivatives` | object | Funding rates, options, leverage (paid) |
| `stablecoin_flows` | object | Supply changes, net flow signal (paid) |
| `tradfi_correlation` | object | BTC vs S&P 500 / Gold correlation (paid) |
| `alternative_signals` | object | Weather, political cycle, seasonality (paid) |
| `key_risks` | string[] | Top risk factors |
| `key_opportunities` | string[] | Top opportunities |
| `agent_guidance` | string | Specific, actionable positioning advice |
| `sources_used` | string[] | Data sources used in this briefing |

---

### get_market_regime
Classify the current market regime with evidence and historical analog.

**Tier:** Free
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `regime` | string | `euphoric` / `risk-on` / `transitional` / `risk-off` / `capitulation` |
| `confidence` | number (0-100) | Confidence in classification |
| `evidence` | string[] | Supporting evidence |
| `historical_analog` | string | Reference to similar historical period |
| `fear_greed_score` | number (0-100) | Current Fear & Greed |
| `fear_greed_label` | string | Extreme Fear / Fear / Neutral / Greed / Extreme Greed |
| `btc_dominance` | number | BTC dominance % |
| `btc_dominance_trend` | string | `rising` / `stable` / `falling` |
| `total_market_cap_usd` | number | Total crypto market cap |
| `market_cap_change_24h` | number | 24h change % |
| `agent_guidance` | string | Regime-specific positioning advice |

---

### get_sentiment_state
Fear & Greed with trend analysis and contrarian signals.

**Tier:** Free
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `fear_greed_current` | number (0-100) | Current score |
| `fear_greed_7d_ago` | number | Score 7 days ago |
| `fear_greed_trend` | string | `improving` / `stable` / `deteriorating` |
| `fear_greed_label` | string | Human-readable sentiment label |
| `sentiment_narrative` | string | Descriptive narrative |
| `extreme_fear_opportunity` | boolean | True when score < 20 |
| `extreme_greed_warning` | boolean | True when score > 80 |
| `contrarian_signal` | string | Contrarian trading signal |
| `agent_guidance` | string | Sentiment-based advice |

---

### get_account_status
Check your tier, usage, and available tools.

**Tier:** Free
**Parameters:** None

Returns: current tier, requests used this hour, available tools, locked tools, cache freshness, upgrade options.

---

## Market Data

### get_asset_context
Deep context on any crypto asset.

**Tier:** Starter+
**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `asset` | string | Yes | Asset name or symbol (e.g., `"bitcoin"`, `"btc"`, `"sol"`, `"avax"`) |

| Output Field | Type | Description |
|---|---|---|
| `asset` | string | Asset name |
| `coingecko_id` | string | Resolved CoinGecko ID |
| `price_usd` | number | Current price |
| `market_cap_usd` | number | Market cap |
| `volume_24h` | number | 24h volume |
| `cycle_position` | string | `accumulation` / `markup` / `distribution` / `markdown` |
| `vs_ath_percentage` | number | % from all-time high |
| `vs_atl_percentage` | number | % from all-time low |
| `volume_health` | string | `thin` / `normal` / `elevated` / `extreme` |
| `volume_vs_30d_average` | number | Volume vs 30d average ratio |
| `price_trend` | string | `strong_uptrend` / `uptrend` / `neutral` / `downtrend` / `strong_downtrend` |
| `holder_behavior` | string | Description of holder behavior |
| `risk_level` | string | `low` / `moderate` / `high` / `extreme` |
| `agent_guidance` | string | Asset-specific positioning advice |

**Supported assets:** BTC, ETH, SOL, BNB, XRP, ADA, DOGE, DOT, AVAX, MATIC, LINK, UNI, ATOM, LTC, NEAR, ARB, OP, APT, SUI, SEI, PEPE, SHIB, and any valid CoinGecko ID.

---

### get_asset_momentum
Short-term momentum signal. Essential for timing entries and exits.

**Tier:** Starter+
**Parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `asset` | string | Yes | — | Asset name or symbol |
| `timeframe` | string | No | `"4h"` | `15m` / `1h` / `4h` / `1d` / `7d` |

| Output Field | Type | Description |
|---|---|---|
| `direction` | string | `strongly_bullish` / `bullish` / `neutral` / `bearish` / `strongly_bearish` |
| `strength` | number (0-100) | Signal strength |
| `confidence` | number (0-100) | Confidence level |
| `confidence_score` | number (-100 to +100) | Signed confidence. Positive = bullish, negative = bearish |
| `price_change_percent` | number | % change over timeframe |
| `price_start` | number | Price at start of timeframe |
| `price_current` | number | Current price |
| `volume_trend` | string | `increasing` / `stable` / `decreasing` |
| `momentum_score` | number (-100 to +100) | Overall momentum |
| `rsi_14` | number | RSI(14) value |
| `atr_percentile` | number (0-100) | ATR percentile — measures volatility vs history |
| `bollinger_bandwidth` | number | Bollinger Band width % |
| `volatility_state` | string | `compressed` / `normal` / `expanding` / `extreme` |
| `consecutive_direction` | number | Consecutive bars in current direction |
| `agent_guidance` | string | Entry/exit timing advice |

---

### get_narrative_pulse
Sector rotation and narrative momentum tracking.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `accelerating` | array | Narratives gaining momentum. Each has `narrative`, `momentum_score`, `change_24h`, `change_7d`, `signal` |
| `decelerating` | array | Narratives losing momentum (same fields) |
| `emerging` | array | New/trending narratives with `narrative`, `signal`, `why_notable` |
| `dominant_theme` | string | Current dominant market narrative |
| `cycle_phase` | string | `early` / `mid` / `late` / `exhausted` |
| `agent_guidance` | string | Sector rotation advice |

---

### get_temporal_context
Bitcoin halving cycle positioning with historical analogs.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `last_halving_date` | string | Date of last halving |
| `next_halving_estimated` | string | Estimated next halving |
| `days_since_last_halving` | number | Days since last halving |
| `cycle_progress_percentage` | number | % through current cycle |
| `estimated_cycle_phase` | string | `accumulation` / `early_bull` / `mid_bull` / `late_bull` / `early_bear` / `mid_bear` / `late_bear` |
| `phase_confidence` | number | Confidence in phase classification |
| `cycle_1_analog` | string | What happened at this point in cycle 1 |
| `cycle_2_analog` | string | Cycle 2 analog |
| `cycle_3_analog` | string | Cycle 3 analog |
| `typical_duration_remaining` | string | Estimated time remaining in phase |
| `agent_guidance` | string | Cycle-based strategy advice |

---

### get_derivatives_context
Funding rates, options data, and leverage positioning from Deribit.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `funding_rates` | array | Per-asset funding. Each has `asset`, `rate_8h`, `annualized_pct`, `sentiment`, `trajectory`, `projected_next` |
| `options.btc_put_call_ratio` | number | BTC put/call ratio |
| `options.btc_open_interest_usd` | number | BTC options open interest |
| `options.btc_volume_24h_usd` | number | BTC options 24h volume |
| `options.btc_implied_volatility` | number | BTC implied volatility % |
| `options.btc_max_pain` | number | BTC max pain price |
| `options.btc_options_sentiment` | string | BTC options sentiment narrative |
| `options.eth_put_call_ratio` | number | ETH put/call ratio (nullable) |
| `options.eth_open_interest_usd` | number | ETH open interest (nullable) |
| `options.eth_options_sentiment` | string | ETH sentiment (nullable) |
| `options.nearest_expiry` | string | Nearest options expiry date |
| `leverage_signal` | string | `overleveraged_long` / `leveraged_long` / `neutral` / `leveraged_short` / `overleveraged_short` |
| `derivatives_summary` | string | Summary narrative |
| `agent_guidance` | string | Derivatives-based positioning advice |

---

### get_stablecoin_flows
Stablecoin supply tracking — leading indicator of capital entering/leaving crypto.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `total_supply_usd` | number | Total stablecoin supply |
| `change_24h_usd` / `change_7d_usd` / `change_30d_usd` | number | USD change over period |
| `change_24h_pct` / `change_7d_pct` / `change_30d_pct` | number | % change over period |
| `net_flow_signal` | string | `strong_inflow` / `inflow` / `neutral` / `outflow` / `strong_outflow` |
| `top_stablecoins` | array | Each has `symbol`, `circulating_usd`, `change_7d_pct`, `peg_price`, `depeg_risk` |
| `depeg_warnings` | string[] | Active depeg warnings |
| `liquidity_summary` | string | Liquidity conditions narrative |
| `agent_guidance` | string | Capital flow advice |

---

### get_correlation_matrix
BTC correlation with S&P 500 and Gold.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `btc_sp500_correlation` | number (-1 to 1) | 30-day Pearson correlation |
| `btc_sp500_classification` | string | `decoupled` / `weakly_correlated` / `moderately_correlated` / `tightly_coupled` / `negatively_correlated` |
| `btc_gold_correlation` | number (-1 to 1) | Correlation with gold |
| `btc_gold_classification` | string | Same classifications |
| `sp500_price` | number | S&P 500 price |
| `gold_price` | number | Gold price USD/oz |
| `macro_risk_appetite` | string | `risk_on` / `neutral` / `risk_off` |
| `agent_guidance` | string | TradFi spillover advice |

---

### get_alternative_signals
Unconventional signals: weather, political cycle, seasonality, macro calendar.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `weather` | object | `weather_bias`, `financial_centers` analyzed, `sunny_count` |
| `political_cycle` | object | `term_year` (1-4), `term_year_label`, `term_day` |
| `seasonality` | object | `month`, `monthly_bias`, `active_effects` |
| `day_of_week` | object | `day`, `crypto_bias`, `volume_expectation` |
| `trading_session` | object | `session`, `volume_expectation` |
| `macro_calendar` | object | `next_fomc`, `next_cpi`, `next_options_expiry`, `calendar_risk`, `calendar_guidance` |
| `composite_alternative_bias` | string | `bullish` / `neutral` / `bearish` |
| `bullish_signals` / `bearish_signals` | string[] | Active signals in each direction |
| `agent_guidance` | string | Alternative signal advice |

---

### get_event_catalyst_timeline
Upcoming market-moving events with impact ratings and trading notes.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `next_24h` / `next_7d` / `next_30d` | array | Catalysts bucketed by time. Each has: |
| — `event` | string | Event name |
| — `date` | string | Event date |
| — `days_until` / `hours_until` | number | Time until event |
| — `impact` | string | `critical` / `high` / `medium` / `low` |
| — `category` | string | `monetary_policy` / `economic_data` / `options` / `crypto_specific` / `political` |
| — `expected_direction` | string | Expected market reaction |
| — `historical_volatility` | string | Historical vol pattern for this event type |
| — `trading_note` | string | Specific trading recommendation |
| `catalyst_density` | string | `quiet` / `normal` / `busy` / `critical` |
| `risk_windows` | string[] | Upcoming risk windows |
| `agent_guidance` | string | Calendar-based strategy advice |

---

## DeFi & On-Chain

### get_defi_health
DeFi ecosystem health assessment.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `total_tvl_usd` | number | Total DeFi TVL |
| `tvl_change_24h` / `tvl_change_7d` | number | TVL change % |
| `tvl_trend` | string | `expanding` / `stable` / `contracting` / `collapsing` |
| `top_chains` | array | Each has `name`, `tvl_usd`, `tvl_change_7d`, `dominance_percentage` |
| `top_protocols` | array | Each has `name`, `tvl_usd`, `category`, `change_7d` |
| `defi_health_score` | number (0-100) | Overall DeFi health |
| `protocol_revenue_trend` | string | `growing` / `stable` / `declining` |
| `ecosystem_concentration` | string | `healthy` / `concentrated` / `dangerous` |
| `agent_guidance` | string | DeFi deployment advice |

---

### get_onchain_pulse
Bitcoin on-chain network health.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `block_height` | number | Current block height |
| `mempool_congestion` | string | `empty` / `normal` / `busy` / `congested` |
| `recommended_fee_sats` | number | Recommended fee sat/vB |
| `miner_distribution` | array | Top mining pools with `pool_name`, `share_percentage` |
| `network_security` | string | `weak` / `normal` / `strong` |
| `mining_economics` | string | `profitable` / `marginal` / `stressed` |
| `onchain_activity` | string | `low` / `normal` / `high` |
| `agent_guidance` | string | On-chain context advice |

---

### get_chain_context
Per-chain DeFi intelligence.

**Tier:** Starter+
**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `chain` | string | Yes | Chain name: `ethereum`, `solana`, `base`, `arbitrum`, `optimism`, `polygon`, `avalanche`, `bsc`, `tron`, `bitcoin` |

| Output Field | Type | Description |
|---|---|---|
| `chain_tvl_usd` | number | Chain TVL |
| `chain_dominance_pct` | number | % of total DeFi TVL |
| `tvl_change_7d` / `tvl_change_30d` | number | TVL change % |
| `tvl_trend` | string | `expanding` / `stable` / `contracting` / `collapsing` |
| `top_protocols` | array | Each has `name`, `tvl_usd`, `category`, `dominance_on_chain` |
| `protocol_count` | number | Total protocols on chain |
| `chain_dominance_shift` | string | `gaining` / `stable` / `losing` |
| `agent_guidance` | string | Chain-specific advice |

---

## Macro

### get_macro_context
Macro economic backdrop for crypto.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `fed_funds_rate` | number | Current Federal Funds Rate % |
| `fed_funds_trend` | string | `hiking` / `holding` / `cutting` |
| `dxy_value` | number | Dollar Index |
| `dxy_trend` | string | `strengthening` / `stable` / `weakening` |
| `yield_curve` | number | 10Y-2Y spread |
| `yield_curve_state` | string | `normal` / `flat` / `inverted` |
| `recession_probability` | string | `low` / `moderate` / `elevated` / `high` |
| `macro_crypto_impact` | string | `tailwind` / `neutral` / `headwind` / `strong_headwind` |
| `macro_summary` | string | Summary narrative |
| `agent_guidance` | string | Macro-adjusted strategy advice |

---

## Portfolio & Strategy

### set_portfolio_context
Save your holdings for personalized guidance.

**Tier:** Starter+
**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `holdings` | array | Yes | Array of holdings |
| — `asset` | string | Yes | Asset name or symbol |
| — `amount` | number | Yes | Amount held |
| — `entry_price_usd` | number | No | Average entry price |

Returns: `success`, `holdings_count`, `updated_at`, `agent_guidance`

---

### get_portfolio_analysis
Personalized portfolio analysis. Requires `set_portfolio_context` first.

**Tier:** Pro+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `market_context` | object | Current regime, posture, risk/opportunity scores |
| `holdings` | array | Holdings with current values |
| `total_value_usd` | number | Total portfolio value |
| `allocation_percentages` | object | % per asset |
| `concentration_risk` | string | Concentration risk level |
| `rebalancing_suggestions` | array | Specific rebalancing actions |
| `pnl_summary` | string | PnL narrative |
| `agent_guidance` | string | Portfolio-specific advice |

---

### evaluate_strategy
Test a strategy against live conditions.

**Tier:** Starter+
**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `strategy` | string | Yes | Strategy name. Built-in: `conservative_dca`, `momentum_rider`, `macro_aligned`, `fear_accumulator`, `full_defensive`. Or a custom strategy name. |

| Output Field | Type | Description |
|---|---|---|
| `strategy_name` | string | Strategy tested |
| `conditions_met` | boolean | Whether all conditions pass |
| `conditions` | array | Each has `field`, `operator`, `threshold`, `current_value`, `met` |
| `recommendation` | string | Action recommendation |
| `confidence_score` | number (0-100) | Confidence in recommendation |
| `signals_supporting` / `signals_against` | string[] | Supporting and opposing signals |
| `agent_guidance` | string | Strategy-specific advice |

---

### set_custom_strategy
Create custom strategies with your own condition rules.

**Tier:** Pro+
**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Strategy name |
| `conditions` | array | Yes | Array of conditions |
| — `field` | string | Yes | Condition field (e.g., `fear_greed`, `risk_score`, `regime`) |
| — `operator` | string | Yes | `<` / `>` / `<=` / `>=` / `==` / `!=` |
| — `threshold` | string or number | Yes | Threshold value |

Returns: `success`, `strategy_name`, `conditions_count`, `agent_guidance`

---

### get_watchlist_report
Batch analyze up to 10 assets with state change detection.

**Tier:** Starter+
**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `assets` | string[] | Yes | Array of asset names/symbols (max 10) |

| Output Field | Type | Description |
|---|---|---|
| `assets` | array | Each has `asset`, `price_usd`, `cycle_position`, `risk_level`, `volume_health`, `price_trend`, `holder_behavior`, `changed_since_last_check`, `change_detail` |
| `state_changes` | string[] | Assets that changed state since last check |
| `elevated_volume_assets` | string[] | Assets with elevated volume |
| `highest_risk_asset` / `lowest_risk_asset` | string | Risk extremes |
| `agent_guidance` | string | Watchlist analysis advice |

---

## Alerts & Automation

### set_alert
Define custom alert conditions.

**Tier:** Starter+
**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `alerts` | array | Yes | Array of alert conditions |
| — `field` | string | Yes | `fear_greed`, `risk_score`, `regime`, `posture`, `cycle_phase`, `tvl_change_7d`, etc. |
| — `operator` | string | Yes | `<` / `>` / `<=` / `>=` / `==` / `!=` |
| — `threshold` | string or number | Yes | Threshold value |
| — `label` | string | No | Human-readable label |

Returns: `success`, `alerts_count`, `updated_at`, `agent_guidance`

---

### get_alerts
Check which alerts are currently triggered.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `total_alerts` | number | Total configured |
| `triggered_count` | number | Currently triggered |
| `triggered` | array | Triggered alerts with `label`, `field`, `current_value`, `operator`, `threshold` |
| `not_triggered` | array | Non-triggered alerts (same fields) |
| `agent_guidance` | string | Alert status and action advice |

---

### set_webhook
Register webhooks that fire when conditions are met. Evaluated every 60 seconds.

**Tier:** Unlimited
**Parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | string | Yes | — | HTTPS URL to POST to |
| `conditions` | array | Yes | — | Same format as `set_alert` conditions |
| `label` | string | No | — | Human-readable label |
| `cooldown_minutes` | number | No | 60 | Minimum minutes between triggers |

**Available condition fields:** `fear_greed`, `risk_score`, `opportunity_score`, `regime`, `posture`, `cycle_phase`, `tvl_change_7d`, `defi_health`, `macro_impact`, `net_flow_signal`, `leverage_signal`, `btc_put_call`, `btc_sp500_correlation`, `macro_risk_appetite`

Returns: `webhook_id`, `url`, `conditions`, `cooldown_minutes`, `agent_guidance`

---

### manage_webhooks
List or remove webhooks.

**Tier:** Unlimited
**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `action` | string | Yes | `list` or `remove` |
| `webhook_id` | string | For remove | Webhook ID to remove |

Returns (list): `webhooks` array with `id`, `url`, `label`, `conditions`, `trigger_count`, `last_triggered`
Returns (remove): `status` (`removed` / `not_found`)

---

## History & Intelligence

### get_signal_history
Fathom's signal log with accuracy tracking.

**Tier:** Pro+
**Parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | number | No | 20 | Number of recent signals to return |

| Output Field | Type | Description |
|---|---|---|
| `recent_signals` | array | Each has `timestamp`, `tool`, `regime`, `posture`, `risk_score`, `fear_greed`, `accuracy_verdict` |
| `accuracy` | object | `evaluated_signals`, `win_rate_pct` |
| `total_signals_logged` | number | Total signals in history |
| `agent_guidance` | string | Signal accuracy and usage advice |

---

### get_historical_context
What were market conditions on a specific past date?

**Tier:** Pro+
**Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string | Yes | ISO date (e.g., `"2026-03-01"`) |

| Output Field | Type | Description |
|---|---|---|
| `requested_date` | string | Date queried |
| `regime` | string | Regime on that date |
| `fear_greed` | number | Fear & Greed on that date |
| `risk_score` | number | Risk score on that date |
| `suggested_posture` | string | Posture on that date |
| `btc_price_usd` | number | BTC price on that date |
| `total_tvl_usd` | number | DeFi TVL on that date |
| `cycle_phase` | string | Cycle phase on that date |
| `agent_guidance` | string | Historical comparison advice |

---

### get_crowd_intelligence
Aggregate behavior of all Fathom-connected agents. [BETA]

**Tier:** Pro+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `total_agents_24h` | number | Active agents in 24h |
| `aggregate_posture_distribution` | object | % in `aggressive` / `moderate` / `defensive` / `sideline` |
| `consensus_strength_pct` | number | How aligned agents are |
| `most_queried_assets` | string[] | Most popular assets |
| `average_fear_greed` | number | Average Fear & Greed across agents |
| `dominant_regime` | string | Most common regime classification |
| `crowd_bias` | string | `bullish` / `neutral` / `bearish` |
| `agent_guidance` | string | Crowd-based signal advice |

---

## Configuration

### set_signal_preferences
Customize which signals feed into your reality check.

**Tier:** Starter+
**Parameters:** All optional booleans (default: `true`):

| Param | Description |
|---|---|
| `cycle` | Bitcoin halving cycle data |
| `defi` | DeFi TVL and health |
| `macro` | Fed rates, DXY, yield curve |
| `onchain` | Bitcoin on-chain data |
| `narratives` | Sector rotation and narratives |
| `weather` | Weather in financial centers |
| `political_cycle` | Presidential cycle |
| `seasonality` | Monthly/seasonal patterns |
| `macro_calendar` | FOMC, CPI, options expiry dates |

Returns: `success`, `preferences` (all current settings), `agent_guidance`

---

### rotate_api_key
Self-service key rotation. Max 3 per day.

**Tier:** Starter+
**Parameters:** None

| Output Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether rotation succeeded |
| `new_key` | string | Your new API key |
| `old_key_deactivated` | boolean | Whether old key is inactive |
| `agent_guidance` | string | Instructions to update your config |
