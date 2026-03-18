/**
 * Trading Bot Skeleton — Fathom as the Intelligence Layer
 *
 * This is an ILLUSTRATIVE skeleton showing how a trading bot would use Fathom
 * MCP server for market intelligence. It is NOT a working bot. It demonstrates
 * the pattern: connect to Fathom, poll for reality checks, and route decisions
 * through Fathom's risk framework.
 *
 * You would replace the placeholder exchange calls with your actual exchange SDK
 * (e.g., ccxt, Binance SDK, Hyperliquid SDK, etc.).
 *
 * Prerequisites:
 *   npm install @modelcontextprotocol/sdk
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// ── Types matching Fathom's output ──

type SuggestedPosture = "aggressive" | "moderate" | "defensive" | "sideline";
type RiskEnvironment = "green" | "yellow" | "orange" | "red";

interface RealityCheck {
  timestamp: string;
  executive_summary: string;
  overall_risk_environment: RiskEnvironment;
  risk_score: number;
  opportunity_score: number;
  suggested_posture: SuggestedPosture;
  key_risks: string[];
  key_opportunities: string[];
  agent_guidance: string;
  regime: { regime: string; confidence: number };
  sentiment: { fear_greed_current: number; extreme_fear_opportunity: boolean };
  macro: { macro_crypto_impact: string };
  data_warnings: string[];
}

// ── Configuration ──

const CONFIG = {
  // How often to poll Fathom for a fresh reality check (in milliseconds).
  // Fathom caches internally, so polling every 5 minutes is reasonable.
  POLL_INTERVAL_MS: 5 * 60 * 1000,

  // Maximum position size as a fraction of portfolio, keyed by posture.
  MAX_POSITION_SIZE: {
    aggressive: 0.25,
    moderate: 0.15,
    defensive: 0.05,
    sideline: 0.0,
  } as Record<SuggestedPosture, number>,

  // Risk score threshold above which the bot will not open new positions.
  RISK_CEILING: 65,

  // Path to the built Fathom MCP server.
  FATHOM_PATH: "./dist/index.js",
};

// ── Fathom MCP Client ──

let mcpClient: Client;

/**
 * Connect to Fathom's MCP server over stdio.
 * The server is spawned as a child process.
 */
async function connectToFathom(): Promise<void> {
  const transport = new StdioClientTransport({
    command: "node",
    args: [CONFIG.FATHOM_PATH],
    env: {
      ...process.env,
      CG_API_KEY: process.env.CG_API_KEY ?? "",
      FRED_API_KEY: process.env.FRED_API_KEY ?? "",
      FATHOM_API_KEY: process.env.FATHOM_API_KEY ?? "",
    },
  });

  mcpClient = new Client({ name: "trading-bot", version: "1.0.0" });
  await mcpClient.connect(transport);
  log("Connected to Fathom MCP server");
}

/**
 * Call a Fathom tool and parse the JSON response.
 */
async function callFathomTool<T>(toolName: string, args: Record<string, unknown> = {}): Promise<T> {
  const response = await mcpClient.callTool({ name: toolName, arguments: args });
  const text = (response.content as Array<{ type: string; text: string }>)[0].text;
  return JSON.parse(text) as T;
}

/**
 * Fetch the master reality check from Fathom.
 */
async function getRealityCheck(): Promise<RealityCheck> {
  return callFathomTool<RealityCheck>("get_reality_check");
}

// ── Decision Engine ──

interface TradeDecision {
  action: "buy" | "sell" | "hold" | "reduce" | "exit_all";
  reason: string;
  maxPositionSize: number;
}

/**
 * Core decision logic. Maps Fathom's output to a concrete trading action.
 * This is where you encode YOUR strategy — Fathom provides the awareness,
 * you provide the rules.
 */
function decideAction(rc: RealityCheck): TradeDecision {
  const { suggested_posture, risk_score, opportunity_score } = rc;

  // Rule 1: If Fathom says sideline, respect it unconditionally.
  if (suggested_posture === "sideline") {
    return {
      action: "exit_all",
      reason: `Fathom posture is SIDELINE (risk: ${risk_score}/100). Exiting all positions.`,
      maxPositionSize: 0,
    };
  }

  // Rule 2: If risk is above our ceiling, do not open new positions.
  if (risk_score > CONFIG.RISK_CEILING) {
    return {
      action: "reduce",
      reason: `Risk score ${risk_score} exceeds ceiling of ${CONFIG.RISK_CEILING}. Reducing exposure.`,
      maxPositionSize: CONFIG.MAX_POSITION_SIZE.defensive,
    };
  }

  // Rule 3: High opportunity + low risk = buy signal.
  if (opportunity_score > 60 && risk_score < 40) {
    return {
      action: "buy",
      reason: `Favorable conditions — opportunity ${opportunity_score}/100, risk ${risk_score}/100, posture: ${suggested_posture}.`,
      maxPositionSize: CONFIG.MAX_POSITION_SIZE[suggested_posture],
    };
  }

  // Rule 4: Extreme fear can be a contrarian buy signal.
  if (rc.sentiment.extreme_fear_opportunity && suggested_posture !== "sideline") {
    return {
      action: "buy",
      reason: `Extreme fear detected (F&G: ${rc.sentiment.fear_greed_current}). Contrarian entry opportunity.`,
      maxPositionSize: CONFIG.MAX_POSITION_SIZE.defensive, // small size on contrarian plays
    };
  }

  // Rule 5: Default — hold current positions, no new entries.
  return {
    action: "hold",
    reason: `Neutral conditions — risk ${risk_score}/100, posture: ${suggested_posture}. Holding.`,
    maxPositionSize: CONFIG.MAX_POSITION_SIZE[suggested_posture],
  };
}

// ── Execution Stubs ──
// Replace these with your actual exchange integration.

async function executeDecision(decision: TradeDecision): Promise<void> {
  switch (decision.action) {
    case "buy":
      log(`[EXECUTE] Would open position — max size: ${(decision.maxPositionSize * 100).toFixed(0)}% of portfolio`);
      // await exchange.createOrder('BTC/USDT', 'limit', 'buy', amount, price);
      break;

    case "sell":
    case "reduce":
      log(`[EXECUTE] Would reduce positions`);
      // await exchange.createOrder('BTC/USDT', 'limit', 'sell', amount, price);
      break;

    case "exit_all":
      log(`[EXECUTE] Would close ALL positions and move to stablecoins`);
      // await exchange.closeAllPositions();
      break;

    case "hold":
      log(`[EXECUTE] No action — holding current positions`);
      break;
  }
}

// ── Logging ──

function log(message: string): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${message}`);
}

function logRealityCheck(rc: RealityCheck): void {
  log("─── Fathom Reality Check ───");
  log(`Regime: ${rc.regime.regime} (${rc.regime.confidence}% confidence)`);
  log(`Risk: ${rc.risk_score}/100 | Opportunity: ${rc.opportunity_score}/100`);
  log(`Environment: ${rc.overall_risk_environment.toUpperCase()}`);
  log(`Posture: ${rc.suggested_posture.toUpperCase()}`);
  log(`Fear & Greed: ${rc.sentiment.fear_greed_current}`);
  log(`Macro Impact: ${rc.macro.macro_crypto_impact}`);
  log(`Risks: ${rc.key_risks.join(" | ")}`);
  log(`Opportunities: ${rc.key_opportunities.join(" | ")}`);
  if (rc.data_warnings.length > 0) {
    log(`Warnings: ${rc.data_warnings.join(" | ")}`);
  }
  log("────────────────────────────");
}

// ── Main Loop ──

async function runCycle(): Promise<void> {
  try {
    // Step 1: Get the current reality from Fathom
    const rc = await getRealityCheck();
    logRealityCheck(rc);

    // Step 2: Run through decision engine
    const decision = decideAction(rc);
    log(`Decision: ${decision.action.toUpperCase()} — ${decision.reason}`);

    // Step 3: Execute (or simulate)
    await executeDecision(decision);
  } catch (err) {
    log(`Cycle failed: ${err instanceof Error ? err.message : String(err)}`);
    log("Fathom is unavailable. Skipping this cycle. NO trades will be made without data.");
  }
}

async function main(): Promise<void> {
  log("Starting trading bot with Fathom intelligence layer...");
  await connectToFathom();

  // Run immediately, then on interval
  await runCycle();

  setInterval(async () => {
    await runCycle();
  }, CONFIG.POLL_INTERVAL_MS);

  log(`Bot running. Polling Fathom every ${CONFIG.POLL_INTERVAL_MS / 1000}s.`);
  log("Press Ctrl+C to stop.");
}

main().catch((err) => {
  log(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
