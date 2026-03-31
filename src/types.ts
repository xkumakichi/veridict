/**
 * Veridict — AI Agent Trust Decision Layer
 * Type definitions
 */

/** Record of a single tool execution */
export interface ExecutionEntry {
  id?: number;
  serverName: string;
  toolName: string;
  inputHash: string;
  outputHash: string | null;
  success: boolean;
  latencyMs: number;
  errorMessage: string | null;
  timestamp: string;
}

/** Aggregated statistics for a server or tool */
export interface ToolStats {
  serverName: string;
  toolName: string | null;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgLatencyMs: number;
  lastFailure: string | null;
  lastExecution: string | null;
}

/** Trust judgment result */
export interface TrustVerdict {
  verdict: "yes" | "caution" | "no" | "unknown";
  confidence: number;
  reason: string;
  stats?: ToolStats;
}

/** Options for withVeridict() middleware */
export interface VerdictOptions {
  /** Server name used for identification in logs */
  name: string;
  /** Optional instance ID for multiple instances of the same server */
  instanceId?: string;
  /** Custom path to SQLite database file. Default: ~/.veridict/executions.db */
  dbPath?: string;
  /** Minimum executions before trust judgment. Default: 10 */
  minExecutions?: number;
  /** Log tool executions to stderr. Default: false */
  verbose?: boolean;
}
