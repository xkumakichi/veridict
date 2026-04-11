/**
 * Veridict — AI Agent Trust Decision Layer
 * Type definitions
 */

/** Failure type classification */
export type FailureType = "timeout" | "error" | "validation" | "unknown";

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
  failureType?: FailureType;
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
  failureBreakdown: Record<string, number>;
}

/** Trust judgment result */
export interface TrustVerdict {
  verdict: "yes" | "caution" | "no" | "unknown";
  /** Trust score (0-1). Blended rate: recent 70% + all-time 30%. */
  score: number;
  reason: string;
  stats?: ToolStats;
  recentSuccessRate?: number;
  recentExecutions?: number;
  failureBreakdown?: Record<string, number>;
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
  /** Static analysis baseline from MCP Trust Kit (--json-out). Enhances trust judgment with pre-deployment risk context. */
  baseline?: StaticBaseline;
}

/** Static analysis baseline from Layer 1 (e.g., MCP Trust Kit --json-out) */
export interface StaticBaseline {
  /** Aggregate trust score from static analysis (0-100, higher = safer). Maps to MCP Trust Kit's total_score. */
  score?: number;
  /** Timestamp of when the scan was performed (ISO 8601). Maps to MCP Trust Kit v0.5.0 scan_timestamp. */
  scanTimestamp?: string;
  /** Tool-specific risk flags from static analysis */
  risks?: StaticRisk[];
  /** Raw JSON from the scanner (preserved for Layer 3 consumption) */
  raw?: Record<string, unknown>;
}

/** A risk flag from static analysis */
export interface StaticRisk {
  /** Tool or capability name */
  tool: string;
  /** Risk type (e.g., "dangerous_fs_write", "network_access") */
  type: string;
  /** Severity: low, medium, high, critical */
  severity: "low" | "medium" | "high" | "critical";
}
