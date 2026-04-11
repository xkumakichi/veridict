/**
 * Veridict — MCP middleware
 * Intercepts all tool calls, logs execution, and adds trust judgment tools.
 *
 * Usage (3 lines):
 *   import { withVeridict } from "veridict";
 *   // ... register your tools ...
 *   withVeridict(server, { name: "my-server" });
 *   await server.connect(transport);
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as crypto from "crypto";
import { VerdictStore } from "./store";
import { canITrust } from "./trust";
import { VerdictOptions, FailureType } from "./types";

const TIMEOUT_THRESHOLD_MS = 30_000;

/** Classify a failure based on error message and latency */
function classifyFailure(error: any, latencyMs: number): FailureType {
  const msg = (error?.message || String(error)).toLowerCase();
  if (latencyMs >= TIMEOUT_THRESHOLD_MS || msg.includes("timeout") || msg.includes("etimedout") || msg.includes("timed out") || msg.includes("aborted")) {
    return "timeout";
  }
  if (msg.includes("valid") || msg.includes("schema") || msg.includes("parse") || msg.includes("type error") || msg.includes("expected")) {
    return "validation";
  }
  return "error";
}

/**
 * Hash a value for logging (SHA256, truncated to 16 hex chars)
 */
function hash(value: unknown): string {
  const str = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 16);
}

/**
 * Wrap an MCP server with Veridict execution logging and trust tools.
 *
 * Call this AFTER registering all your tools but BEFORE calling server.connect().
 *
 * NOTE: This accesses McpServer internals (_registeredTools) which may change
 * in future SDK versions. If the SDK adds official middleware hooks, migrate to those.
 */
export function withVeridict(server: McpServer, options: VerdictOptions): VerdictStore {
  const store = new VerdictStore(options.dbPath);
  const serverName = options.instanceId
    ? `${options.name}:${options.instanceId}`
    : options.name;
  const minExecutions = options.minExecutions ?? 10;
  const verbose = options.verbose ?? false;

  const log = (msg: string) => {
    if (verbose) console.error(`[veridict] ${msg}`);
  };

  const baseline = options.baseline;

  log(`monitoring "${serverName}"`);
  if (baseline) {
    log(`static baseline loaded (score: ${baseline.score ?? "n/a"}, risks: ${baseline.risks?.length ?? 0})`);
  }

  // --- Wrap all registered tool handlers ---
  const registeredTools = (server as any)._registeredTools as Map<string, any> | undefined;

  if (registeredTools) {
    for (const [toolName, toolDef] of registeredTools.entries()) {
      // Skip our own tools
      if (toolName.startsWith("veridict_")) continue;

      const originalHandler = toolDef.callback;
      if (!originalHandler) continue;

      toolDef.callback = async (...args: any[]) => {
        const startTime = Date.now();
        const inputData = args[0]; // First arg is the params object
        const inputH = hash(inputData);

        try {
          const result = await originalHandler(...args);
          const latencyMs = Date.now() - startTime;

          await store.logExecution({
            serverName,
            toolName,
            inputHash: inputH,
            outputHash: hash(result),
            success: true,
            latencyMs,
            errorMessage: null,
            timestamp: new Date().toISOString(),
          });

          log(`${toolName} ok ${latencyMs}ms`);
          return result;
        } catch (error: any) {
          const latencyMs = Date.now() - startTime;
          const failureType = classifyFailure(error, latencyMs);

          await store.logExecution({
            serverName,
            toolName,
            inputHash: inputH,
            outputHash: null,
            success: false,
            latencyMs,
            errorMessage: error?.message || String(error),
            failureType,
            timestamp: new Date().toISOString(),
          });

          log(`${toolName} FAIL [${failureType}] ${latencyMs}ms — ${error?.message || error}`);
          throw error;
        }
      };
    }
  }

  // --- Register Veridict's own tools ---

  server.tool(
    "veridict_stats",
    "Get execution statistics for this server and its tools",
    {},
    async () => {
      const stats = await store.getStats(serverName);
      const breakdown = await store.getToolBreakdown(serverName);

      const result = {
        server: serverName,
        overall: stats,
        tools: breakdown,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "veridict_can_i_trust",
    "Judge whether a server or tool can be trusted based on execution history",
    {
      server_name: z.string().describe("Name of the server to check"),
      tool_name: z.string().optional().describe("Specific tool to check (optional)"),
    },
    async ({ server_name, tool_name }) => {
      const verdict = await canITrust(store, server_name, tool_name, minExecutions, baseline);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(verdict, null, 2) }],
      };
    }
  );

  return store;
}
