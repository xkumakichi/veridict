/**
 * Veridict — Trust judgment logic
 * Combines runtime stats (with time decay) and optional static baseline.
 */

import { VerdictStore } from "./store";
import { TrustVerdict, StaticBaseline } from "./types";

const DEFAULT_MIN_EXECUTIONS = 10;
const RECENT_DAYS = 7;
const RECENT_WEIGHT = 0.7;
const ALLTIME_WEIGHT = 0.3;
const MIN_RECENT_FOR_BLEND = 3;

/** Find the most common failure type from breakdown */
function dominantFailure(breakdown?: Record<string, number>): string | null {
  if (!breakdown) return null;
  let max = 0;
  let dominant: string | null = null;
  for (const [type, count] of Object.entries(breakdown)) {
    if (count > max) {
      max = count;
      dominant = type;
    }
  }
  return dominant;
}

/**
 * Judge whether a server/tool can be trusted.
 *
 * Logic:
 * - Blends recent (7-day, 70% weight) and all-time (30% weight) success rates
 * - < minExecutions → "unknown" (insufficient data)
 * - >= 95% blended rate → "yes" (downgraded to "caution" if critical static risks)
 * - >= 80% blended rate → "caution"
 * - < 80% blended rate → "no"
 * - Failure breakdown (timeout/error/validation) included in verdict
 */
export async function canITrust(
  store: VerdictStore,
  serverName: string,
  toolName?: string,
  minExecutions: number = DEFAULT_MIN_EXECUTIONS,
  baseline?: StaticBaseline
): Promise<TrustVerdict> {
  const stats = await store.getStats(serverName, toolName);
  const recent = await store.getRecentStats(serverName, toolName, RECENT_DAYS);

  // Compute blended success rate (recent-weighted)
  let effectiveRate: number;
  if (recent.totalExecutions >= MIN_RECENT_FOR_BLEND) {
    effectiveRate = recent.successRate * RECENT_WEIGHT + stats.successRate * ALLTIME_WEIGHT;
  } else {
    effectiveRate = stats.successRate;
  }

  const failureBreakdown = Object.keys(stats.failureBreakdown).length > 0
    ? stats.failureBreakdown
    : undefined;

  const recentInfo = recent.totalExecutions > 0
    ? { recentSuccessRate: recent.successRate, recentExecutions: recent.totalExecutions }
    : {};

  const dominant = dominantFailure(failureBreakdown);

  // Not enough data to judge
  if (stats.totalExecutions < minExecutions) {
    if (baseline?.risks?.some((r) => r.severity === "critical")) {
      return {
        verdict: "caution",
        score: 0,
        reason: "insufficient data + critical static risks",
        stats,
        failureBreakdown,
        ...recentInfo,
      };
    }

    return {
      verdict: "unknown",
      score: 0,
      reason: "insufficient data",
      stats,
      failureBreakdown,
      ...recentInfo,
    };
  }

  const hasCriticalRisks = baseline?.risks?.some((r) => r.severity === "critical");
  const hasHighRisks = baseline?.risks?.some((r) => r.severity === "high" || r.severity === "critical");

  // High trust — but downgrade if static baseline flags critical risks
  if (effectiveRate >= 0.95) {
    if (hasCriticalRisks) {
      return {
        verdict: "caution",
        score: effectiveRate,
        reason: "reliable but critical static risks",
        stats,
        failureBreakdown,
        ...recentInfo,
      };
    }

    return {
      verdict: "yes",
      score: effectiveRate,
      reason: "reliable",
      stats,
      failureBreakdown,
      ...recentInfo,
    };
  }

  // Moderate trust
  if (effectiveRate >= 0.8) {
    const failureHint = dominant ? `elevated ${dominant} rate` : "some failures detected";
    return {
      verdict: "caution",
      score: effectiveRate,
      reason: `${failureHint}${hasHighRisks ? " + static risks" : ""}`,
      stats,
      failureBreakdown,
      ...recentInfo,
    };
  }

  // Low trust
  const failureHint = dominant ? `high ${dominant} rate` : "high failure rate";
  return {
    verdict: "no",
    score: effectiveRate,
    reason: failureHint,
    stats,
    failureBreakdown,
    ...recentInfo,
  };
}
