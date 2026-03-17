# Fathom Agent Prompt Templates

Ten ready-to-use prompts you can paste directly into any AI agent that has Fathom MCP tools connected. Each prompt is designed to produce specific, actionable output.

---

## 1. Pre-Trade Risk Assessment

```
Before I execute this trade, call get_reality_check and get_asset_context for {ASSET}.

Evaluate whether current market conditions support entering a {LONG/SHORT} position on {ASSET}. Specifically tell me:
- Is the suggested_posture compatible with opening new risk?
- What is the risk_score, and is it below 50 (acceptable) or above (caution)?
- What is the asset's cycle_position — am I buying into distribution or accumulation?
- Are there macro headwinds (check macro.macro_crypto_impact)?
- What is the volume_health — is there enough liquidity for my position size?

Give me a GO / CAUTION / NO-GO verdict with your reasoning. If NO-GO, tell me what conditions would need to change.
```

---

## 2. Daily Market Briefing

```
Run get_reality_check and give me a morning briefing in this format:

**Market Regime:** [regime + confidence]
**Risk Score:** [X/100] | **Opportunity Score:** [X/100]
**Suggested Posture:** [posture]
**Fear & Greed:** [score + label + 7-day trend]
**Cycle Phase:** [phase + progress %]
**Macro Impact:** [tailwind/neutral/headwind]
**DeFi TVL Trend:** [expanding/stable/contracting]
**Top Narrative:** [dominant theme from top_narratives]

**Key Risks:** [bullet list from key_risks]
**Key Opportunities:** [bullet list from key_opportunities]
**Action Items for Today:** [2-3 specific things I should do or watch based on this data]
```

---

## 3. Portfolio Rebalancing Check

```
I hold the following portfolio:
- BTC: {X}%
- ETH: {X}%
- SOL: {X}%
- Stablecoins: {X}%

Call get_reality_check, then call get_asset_context for each asset I hold.

Based on the current suggested_posture and risk_score, tell me:
1. Is my stablecoin allocation appropriate for the current risk environment?
2. Which assets are in a favorable cycle_position for holding vs. trimming?
3. Should I increase or decrease any position based on volume_health and price_trend?
4. What would the "ideal" allocation look like given current conditions?

Be specific with numbers. If you recommend changes, explain exactly why using Fathom's data.
```

---

## 4. Narrative Rotation Tracker

```
Call get_narrative_pulse and analyze the current narrative landscape.

I need to understand:
1. Which narratives are ACCELERATING — rank them by momentum_score and list their 7-day change.
2. Which narratives are DECELERATING — should I exit positions in these sectors?
3. Are there EMERGING narratives that are not yet widely known but showing early signals?
4. What is the overall narrative cycle_phase? Are we in early (new narratives forming), mid (narratives maturing), late (narratives exhausting), or exhausted (rotation incoming)?
5. What is the dominant_theme right now, and what does it tell me about market psychology?

Based on this, give me 2-3 specific sector rotation trades I should consider.
```

---

## 5. Macro-Aware Entry Timing

```
I want to buy {ASSET} but I want to time my entry with macro conditions.

Call get_reality_check, get_macro_context, and get_asset_context for {ASSET}.

Analyze:
- Is the Fed cutting, holding, or hiking? How does this affect crypto risk appetite?
- Is the dollar (DXY) strengthening or weakening? A strong dollar is typically bearish for crypto.
- Is the yield curve inverted? What does the recession_probability suggest?
- What is the net macro_crypto_impact — tailwind, neutral, or headwind?
- Given all this, is NOW a good entry, or should I wait for a specific macro catalyst?

If I should wait, tell me exactly what to watch for (e.g., "wait for the next Fed meeting" or "enter if DXY drops below X"). If I should enter now, suggest position sizing relative to the risk_score.
```

---

## 6. DeFi Yield Safety Check

```
I'm considering deploying {AMOUNT} into DeFi yield strategies.

Call get_defi_health and get_reality_check.

Evaluate:
1. Is the DeFi ecosystem healthy? What is the defi_health_score?
2. Is TVL expanding or contracting? A contracting TVL environment means protocols are losing capital — yields may not be sustainable.
3. What is the ecosystem_concentration? If it's "concentrated" or "dangerous," my capital is at higher smart contract risk.
4. Is the protocol_revenue_trend growing or declining? Declining revenue means yields are being subsidized by emissions, not real demand.
5. Given the overall risk_score from get_reality_check, is this a safe time to have capital in DeFi contracts, or should I stay in stablecoins on a CEX?

Rate the safety of deploying capital into DeFi right now on a scale of 1-10 and explain your reasoning.
```

---

## 7. Bitcoin Cycle Positioning

```
Call get_temporal_context and get_reality_check.

I need a full Bitcoin cycle analysis:
1. Where are we in the halving cycle? Days since last halving, cycle progress percentage.
2. What is the estimated_cycle_phase (accumulation, early_bull, mid_bull, late_bull, early_bear, etc.)?
3. What do historical analogs from cycles 1, 2, and 3 suggest about where we go from here?
4. What is the typical_duration_remaining in this phase?
5. Based on the current regime and risk_score, are we tracking the historical pattern or deviating?

Give me a specific recommendation: should I be accumulating BTC, holding, or taking profit? If accumulating, suggest a DCA schedule. If taking profit, suggest percentage to sell and trigger levels.
```

---

## 8. Contrarian Opportunity Scanner

```
Call get_reality_check and get_sentiment_state.

I'm looking for contrarian opportunities — moments when the crowd is wrong.

Analyze:
1. Is extreme_fear_opportunity active? If fear & greed is below 20, historically this has been a buying opportunity.
2. Is extreme_greed_warning active? If above 80, this is often a distribution zone.
3. What does the contrarian_signal say?
4. Are there narratives in get_narrative_pulse that are decelerating hard but might be oversold?
5. Is the risk_score above 70 (extreme fear) while the regime is not actually capitulation? This mismatch suggests the market is pricing in more risk than exists.

If you find a contrarian setup, give me the specific trade: asset, direction, reasoning, and what would invalidate the thesis.
```

---

## 9. Full Due Diligence on a Specific Asset

```
I'm researching {ASSET} for a potential position. Run a complete due diligence check.

Call get_asset_context for {ASSET}, get_reality_check, get_narrative_pulse, and get_macro_context.

Provide:
1. **Price Context:** Current price vs. ATH and ATL. Where is it in its cycle (accumulation/markup/distribution/markdown)?
2. **Trend:** What is the price_trend? Is volume confirming or diverging (volume_health)?
3. **Risk Level:** What is the asset's risk_level? How does it compare to the broader market risk_score?
4. **Narrative Tailwind:** Is this asset part of an accelerating or decelerating narrative? Is sector momentum supporting it?
5. **Macro Alignment:** Are macro conditions (rates, DXY, yield curve) supportive of this asset class?
6. **Market Regime Fit:** Given the current regime, does this asset fit the profile of what outperforms in this environment?
7. **Verdict:** Rate this as a STRONG BUY / BUY / HOLD / REDUCE / SELL with conviction level (1-10) and key catalysts to watch.
```

---

## 10. Emergency Market Condition Alert

```
Call get_reality_check immediately.

Check for emergency conditions:
- Is the risk_score above 75? → RED ALERT: Capital preservation mode.
- Is the regime "capitulation"? → Extreme stress. No new entries.
- Is the suggested_posture "sideline"? → Fathom says get out. Respect it.
- Is the macro_crypto_impact "strong_headwind"? → Macro is actively working against crypto.
- Is the DeFi tvl_trend "collapsing"? → Systemic DeFi risk. Exit yield positions.
- Is extreme_greed_warning true while regime is "euphoric"? → Blow-off top risk.

If ANY of these conditions are true, provide:
1. An urgency rating: CRITICAL / HIGH / MODERATE
2. Specific actions to take RIGHT NOW (e.g., "close leveraged positions," "move 50% to stables")
3. What to monitor for the all-clear signal
4. A timeline estimate for when conditions might normalize

If none of these conditions are met, simply confirm: "No emergency conditions detected. Current posture: {posture}. Risk: {score}/100."
```
