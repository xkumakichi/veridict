/**
 * Veridict — Trust judgment logic
 * Intentionally simple. Combines runtime stats with optional static baseline.
 */

import { VerdictStore } from "./store";
import { TrustVerdict, StaticBaseline } from "./types";

const DEFAULT_MIN_EXECUTIONS = 10;

/**
 * Judge whether a server/tool can be trusted.
 *
 * Logic:
 * - < minExecutions → "unknown" (insufficient data)
 * - >= 95% success → "yes" (downgraded to "caution" if static baseline has critical risks)
 * - >= 80% success → "caution"
 * - < 80% success → "no"
 */
export async function canITrust(
  store: VerdictStore,
  serverName: string,
  toolName?: string,
  minExecutions: number = DEFAULT_MIN_EXECUTIONS,
  baseline?: StaticBaseline
): Promise<TrustVerdict> {
  const stats = await store.getStats(serverName, toolName);

  // Not enough data to judge
  if (stats.totalExecutions < minExecutions) {
    // If we have a static baseline with critical risks, flag it even without runtime data
    if (baseline?.risks?.some((r) => r.severity === "critical")) {
      return {
        verdict: "caution",
        confidence: 0,
        reason: `Insufficient runtime data (${stats.totalExecutions} executions) but static analysis found critical risks`,
        stats,
      };
    }

    return {
      verdict: "unknown",
      confidence: 0,
      reason: `Insufficient data: ${stats.totalExecutions} executions (need ${minExecutions})`,
      stats,
    };
  }

  const pct = (stats.successRate * 100).toFixed(1);
  const hasCriticalRisks = baseline?.risks?.some((r) => r.severity === "critical");
  const hasHighRisks = baseline?.risks?.some((r) => r.severity === "high" || r.severity === "critical");

  // High trust — but downgrade if static baseline flags critical risks
  if (stats.successRate >= 0.95) {
    if (hasCriticalRisks) {
      return {
        verdict: "caution",
        confidence: stats.successRate,
        reason: `success_rate ${pct}% but static analysis found critical risks`,
        stats,
      };
    }

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
      reason: `success_rate ${pct}% — some failures detected (${stats.failureCount} failures)${hasHighRisks ? " + static risks" : ""}`,
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
