#!/usr/bin/env node
/**
 * Veridict CLI — View execution stats and trust judgments
 *
 * Usage:
 *   npx veridict                    # Show all servers
 *   npx veridict stats              # Show all servers
 *   npx veridict stats my-server    # Show specific server
 *   npx veridict trust my-server    # Trust judgment
 */

import { VerdictStore } from "./store";
import { canITrust } from "./trust";

const VERDICTS: Record<string, string> = {
  yes: "\u2705 TRUSTWORTHY",
  caution: "\u26a0\ufe0f  CAUTION",
  no: "\u274c UNTRUSTED",
  unknown: "\u2753 UNKNOWN",
};

async function showStats(serverName?: string): Promise<void> {
  const store = new VerdictStore();

  if (!serverName) {
    // Show all servers
    const servers = await store.getServers();
    if (servers.length === 0) {
      console.log("\nNo execution data yet. Add Veridict to an MCP server to start logging.\n");
      console.log("  import { withVeridict } from \"veridict\";");
      console.log("  withVeridict(server, { name: \"my-server\" });\n");
      await store.close();
      return;
    }

    console.log("\n\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
    console.log("\u2502  Veridict \u2014 Agent Trust Dashboard                  \u2502");
    console.log("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n");

    for (const name of servers) {
      const stats = await store.getStats(name);
      const verdict = await canITrust(store, name);
      const pct = (stats.successRate * 100).toFixed(1);
      console.log(`  ${VERDICTS[verdict.verdict]}  ${name}`);
      console.log(`     ${stats.totalExecutions} executions | ${pct}% success | avg ${stats.avgLatencyMs}ms\n`);
    }
  } else {
    // Show specific server
    const stats = await store.getStats(serverName);
    const verdict = await canITrust(store, serverName);
    const breakdown = await store.getToolBreakdown(serverName);

    if (stats.totalExecutions === 0) {
      console.log(`\nNo execution data for "${serverName}".\n`);
      await store.close();
      return;
    }

    const pct = (stats.successRate * 100).toFixed(1);

    console.log("\n\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
    console.log(`\u2502  Server: ${serverName.padEnd(40)}\u2502`);
    console.log("\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524");
    console.log(`\u2502  Verdict: ${VERDICTS[verdict.verdict].padEnd(39)}\u2502`);
    console.log(`\u2502  Total Executions: ${String(stats.totalExecutions).padEnd(30)}\u2502`);
    console.log(`\u2502  Success Rate: ${(pct + "%").padEnd(34)}\u2502`);
    console.log(`\u2502  Avg Latency: ${(stats.avgLatencyMs + "ms").padEnd(35)}\u2502`);
    if (stats.lastFailure) {
      console.log(`\u2502  Last Failure: ${stats.lastFailure.slice(0, 19).padEnd(34)}\u2502`);
    }
    console.log("\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524");
    console.log("\u2502  Tool Breakdown:                                    \u2502");

    for (const tool of breakdown) {
      const tPct = (tool.successRate * 100).toFixed(1);
      const line = `    ${tool.toolName}`.padEnd(25) + `${tPct}%`.padStart(6) + `  (${tool.totalExecutions} calls)`;
      console.log(`\u2502  ${line.padEnd(48)}\u2502`);
    }

    console.log("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n");
  }

  await store.close();
}

async function showTrust(serverName: string, toolName?: string): Promise<void> {
  const store = new VerdictStore();
  const verdict = await canITrust(store, serverName, toolName);

  console.log(`\n  can_I_trust("${serverName}"${toolName ? `, "${toolName}"` : ""})?\n`);
  console.log(`  ${VERDICTS[verdict.verdict]}`);
  console.log(`  Score: ${(verdict.score * 100).toFixed(1)}%`);
  console.log(`  Reason: ${verdict.reason}\n`);

  await store.close();
}

// --- Main ---
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || "stats";

  switch (command) {
    case "stats":
      await showStats(args[1]);
      break;
    case "trust":
      if (!args[1]) {
        console.log("\nUsage: veridict trust <server_name> [tool_name]\n");
        process.exit(1);
      }
      await showTrust(args[1], args[2]);
      break;
    case "help":
    case "--help":
    case "-h":
      console.log(`
Veridict — Know if you can trust your MCP server.

Commands:
  veridict                     Show all tracked servers
  veridict stats               Show all tracked servers
  veridict stats <server>      Show detailed stats for a server
  veridict trust <server>      Trust judgment for a server
  veridict trust <server> <tool>  Trust judgment for a specific tool
`);
      break;
    default:
      // Treat unknown command as server name for stats
      await showStats(command);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
