/**
 * Fathom + LangChain Integration Example
 *
 * This example shows how to connect Fathom's MCP server to a LangChain agent
 * using the @langchain/mcp-adapters package. The agent calls get_reality_check,
 * reads the market assessment, and makes a simple positioning decision.
 *
 * Prerequisites:
 *   npm install @langchain/mcp-adapters @langchain/openai @langchain/core langchain
 *
 * Environment variables:
 *   OPENAI_API_KEY   — Your OpenAI key (or swap for any LangChain-supported LLM)
 *   CG_API_KEY       — CoinGecko API key (passed to Fathom)
 *   FRED_API_KEY     — FRED API key (passed to Fathom)
 */

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";

async function main() {
  // ── Step 1: Create the MCP client that connects to Fathom ──
  // The client spawns Fathom as a child process over stdio.
  // Update the args path to wherever your built Fathom lives.
  const mcpClient = new MultiServerMCPClient({
    fathom: {
      transport: "stdio",
      command: "node",
      args: ["./dist/index.js"],
      env: {
        CG_API_KEY: process.env.CG_API_KEY ?? "",
        FRED_API_KEY: process.env.FRED_API_KEY ?? "",
        API_TIER: process.env.API_TIER ?? "free",
      },
    },
  });

  // ── Step 2: Load all Fathom tools as LangChain-compatible tools ──
  // This call discovers every tool the MCP server exposes
  // (get_reality_check, get_market_regime, get_asset_context, etc.)
  const tools = await mcpClient.getTools();

  console.log(
    "Loaded Fathom tools:",
    tools.map((t) => t.name)
  );

  // ── Step 3: Set up the LLM and agent prompt ──
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a crypto portfolio manager assistant. You have access to Fathom, a
financial reality engine for crypto markets. Before making any recommendation,
you MUST call get_reality_check to get the current market assessment.

Based on the reality check output, provide:
1. A plain-English summary of current conditions
2. Whether now is a good time to deploy capital
3. Specific risks the user should be aware of
4. Your recommended posture (aggressive / moderate / defensive / sideline)

Always cite the risk_score, opportunity_score, and suggested_posture from Fathom.`,
    ],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  // ── Step 4: Create the agent and executor ──
  // The agent can call any Fathom tool, but we instruct it to start with
  // get_reality_check for holistic awareness.
  const agent = createToolCallingAgent({ llm, tools, prompt });
  const executor = new AgentExecutor({ agent, tools, verbose: true });

  // ── Step 5: Run a query ──
  // The agent will autonomously call get_reality_check, read the JSON response,
  // and synthesize a human-friendly answer.
  const result = await executor.invoke({
    input:
      "I have $10,000 in stablecoins. Should I deploy into crypto right now, or wait? Check the market first.",
  });

  console.log("\n=== Agent Response ===");
  console.log(result.output);

  // ── Cleanup ──
  await mcpClient.close();
}

main().catch(console.error);
