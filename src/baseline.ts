/**
 * Veridict — Layer 1 baseline parser
 * Converts MCP Trust Kit v0.5.0 JSON output into Veridict's StaticBaseline format.
 *
 * Usage:
 *   import { parseLayer1Report } from "veridict";
 *   const report = JSON.parse(fs.readFileSync("layer1-baseline.json", "utf-8"));
 *   withVeridict(server, { name: "my-server", baseline: parseLayer1Report(report) });
 */

import { StaticBaseline, StaticRisk } from "./types";

/** Severity mapping from MCP Trust Kit findings to Veridict risk levels */
const SEVERITY_MAP: Record<string, StaticRisk["severity"]> = {
  error: "high",
  warning: "medium",
  info: "low",
};

/**
 * Parse a MCP Trust Kit JSON report (v0.4.0+ / v0.5.0+) into Veridict's StaticBaseline.
 *
 * Extracts:
 * - score from total_score (or score.total_score)
 * - scanTimestamp from scan_timestamp (v0.5.0) or generated_at (v0.4.0 fallback)
 * - risks from findings[] with severity "error" (capability-level risks)
 * - raw: the full report for Layer 3 passthrough
 */
export function parseLayer1Report(report: Record<string, unknown>): StaticBaseline {
  if (!report || typeof report !== "object") {
    throw new Error("parseLayer1Report: expected a JSON object from MCP Trust Kit --json-out");
  }

  // Extract score
  let score: number | undefined;
  if (typeof report.total_score === "number") {
    score = report.total_score;
  } else if (
    report.score &&
    typeof report.score === "object" &&
    typeof (report.score as any).total_score === "number"
  ) {
    score = (report.score as any).total_score;
  }

  // Extract timestamp (v0.5.0 canonical field, v0.4.0 fallback)
  const scanTimestamp =
    (typeof report.scan_timestamp === "string" ? report.scan_timestamp : null) ||
    (typeof report.generated_at === "string" ? report.generated_at : undefined);

  // Extract risks from findings
  const risks: StaticRisk[] = [];
  if (Array.isArray(report.findings)) {
    for (const f of report.findings) {
      if (!f || typeof f !== "object") continue;
      // Only surface capability-level findings (not hygiene warnings)
      if (f.category === "capability" || f.severity === "error") {
        risks.push({
          tool: f.tool_name || "unknown",
          type: f.rule_id || f.risk_category || "unknown",
          severity: SEVERITY_MAP[f.severity] || "medium",
        });
      }
    }
  }

  return {
    score,
    scanTimestamp,
    risks: risks.length > 0 ? risks : undefined,
    raw: report,
  };
}
