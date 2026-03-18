# Fathom — Product Hunt Launch

---

## Tagline
Financial reality awareness for AI agents

## Description (under 260 chars)
MCP server that gives AI agents interpreted crypto market intelligence — regime classification, risk scores, cycle positioning, and plain English guidance — instead of raw data. Free tier available. Works with Claude, Cursor, and any MCP client.

---

## Full Description

### The Problem

Every AI agent operating in crypto markets today has the same blind spot: data without understanding.

Your trading bot knows BTC is $82,000. It does not know that the market is in a risk-off regime, that the Fear & Greed Index is at 28 and falling, that BTC dominance is rising as capital rotates to safety, that DeFi TVL dropped 8% this week, or that the yield curve just re-inverted. It sees prices but has zero awareness of the financial environment those prices exist within.

This is not a data availability problem. Every API in crypto is free or cheap. The problem is interpretation — turning raw signals into the kind of contextual understanding that experienced traders carry in their heads.

### What Fathom Does

Fathom is an MCP (Model Context Protocol) server that synthesizes 5 real-time data sources into interpreted financial intelligence. Instead of numbers your agent has to figure out on its own, Fathom returns:

- **Regime classification**: Is the market euphoric, risk-on, transitional, risk-off, or in capitulation?
- **Risk and opportunity scores**: 0-100 composite scores drawn from sentiment, macro, on-chain, and cycle data.
- **Suggested posture**: Aggressive, moderate, defensive, or sideline — with specific guidance on position sizing, stop losses, and capital allocation.
- **Plain English `agent_guidance`**: Every response includes a directive the AI can act on immediately. No parsing. No guesswork.

Fathom covers nine dimensions of financial reality across nine MCP tools: market regime, sentiment state, Bitcoin halving cycle position, DeFi ecosystem health, macro context (Fed policy, dollar strength, yield curve), on-chain signals (mempool, mining, fees), sector rotation and narrative momentum, and deep asset-level context.

### Data Sources

All five data sources are free or near-free:

- CoinGecko (free tier) — prices, market caps, categories, trending
- Alternative.me (free forever) — Fear & Greed Index
- DeFiLlama (free forever) — DeFi TVL and protocol data
- FRED / Federal Reserve (free forever) — rates, DXY, yield curve
- Mempool.space (free forever) — Bitcoin network health

No paid API subscriptions required. The value is the intelligence layer, not the data.

### How to Get Started

Add Fathom to your Claude Desktop or Cursor config with two free API keys (CoinGecko and FRED). Your agent gets financial reality awareness in under two minutes.

Free tier: 3 core tools at 10 requests/hour. No credit card required.

---

## 3 Key Features

### 1. Interpreted Intelligence, Not Raw Data
Every Fathom response includes an `agent_guidance` field — a plain English directive that tells your AI agent exactly what the data means and how to act on it. Your agent doesn't need to interpret what "Fear & Greed at 28 with rising BTC dominance and an inverted yield curve" means. Fathom translates that into a risk score, posture recommendation, and specific action guidance.

### 2. Nine Dimensions of Financial Reality
One API call to `get_reality_check` synthesizes market regime, sentiment, Bitcoin cycle position, DeFi health, macro conditions, on-chain signals, and sector momentum into a unified briefing with a composite risk score (0-100) and suggested posture. Nine specialized tools let agents drill into any dimension.

### 3. Graceful Degradation and Transparent Confidence
When a data source fails, Fathom doesn't silently return bad data. It tells the agent exactly what's missing, provides last-known-good values where available, and adjusts confidence scores. Your agent never makes decisions on incomplete information without knowing it.

---

## Maker Comment

I built Fathom because I kept watching AI agents make financial decisions with the confidence of a senior trader and the market awareness of someone who just woke up from a coma.

The technical problem was clear: agents have access to price APIs but no framework for understanding what those prices mean in context. Is $82,000 BTC expensive or cheap? That depends on the regime, the cycle position, the macro backdrop, DeFi health, sentiment extremes, and on-chain signals. No single data point answers it.

Fathom synthesizes all of that into something an agent can actually use — a risk score, a posture recommendation, and plain English guidance grounded in real data from real sources.

Every data source is free. The intelligence layer is the product. Free tier is genuinely useful (I run my own workflows on it). If you're building anything that touches crypto and uses AI agents, give `get_reality_check` one call and see what your agent has been missing.

https://fathom.fyi
