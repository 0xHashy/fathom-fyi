---
description: Test every MCP tool returns valid JSON and no errors
---

## Get tool list

!`cd "$PWD" && echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node --env-file=.env dist/index.js 2>/dev/null | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);j.result.tools.forEach(t=>console.log(t.name))"`

## Test each free tool

Test each tool listed above by calling it via MCP JSON-RPC. For tools that require arguments (like get_asset_context needs {asset: "bitcoin"}), provide reasonable defaults.

For each tool:
1. Call it
2. Verify the response is valid JSON
3. Verify it contains either real data OR a proper error with agent_guidance
4. Report pass/fail

Flag any tool that crashes, returns invalid JSON, or returns empty responses.
