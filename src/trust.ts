/**
 * Veridict — Trust judgment logic
 * Intentionally simple. "雑でいい" — GPT's wisdom.
 */

import { VerdictStore } from "./store";
import { TrustVerdict } from "./types";

const DEFAULT_MIN_EXECUTIONS = 10;

/**
 * Judge whether a server/tool can be trusted.
 *
 * Logic (intentionally simple):
 * - < minExecutions → "unknown" (insufficient data)
 * - >= 95% success → "yes"
 * - >= 80% success → "caution"
 * - < 80% success → "no"
 */
export async function canITrust(
  store: VerdictStore,
  serverName: string,
  toolName?: string,
  minExecutions: number = DEFAULT_MIN_EXECUTIONS
): Promise<TrustVerdict> {
  const stats = await store.getStats(serverName, toolName);

  // Not enough data to judge
  if (stats.totalExecutions < minExecutions) {
    return {
      verdict: "unknown",
      confidence: 0,
      reason: `Insufficient data: ${stats.totalExecutions} executions (need ${minExecutions})`,
      stats,
    };
  }

  const pct = (stats.successRate * 100).toFixed(1);

  // High trust
  if (stats.successRate >= 0.95) {
    return {
      verdict: "yes",
      confidence: stats.successRate,
      reason: `success_rate ${pct}% over ${stats.totalExecutions} executions`,
      stats,
    };
  }

  // Moderate trust
  if (stats.successRate >= 0.8) {
    return {
      verdict: "caution",
      confidence: stats.successRate,
      reason: `success_rate ${pct}% — some failures detected (${stats.failureCount} failures)`,
      stats,
    };
  }

  // Low trust
  return {
    verdict: "no",
    confidence: stats.successRate,
    reason: `success_rate ${pct}% — high failure rate (${stats.failureCount}/${stats.totalExecutions} failed)`,
    stats,
  };
}
