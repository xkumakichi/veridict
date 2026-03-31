/**
 * Veridict — AI Agent Trust Decision Layer
 *
 * Know if you can trust your MCP server.
 *
 * Usage:
 *   import { withVeridict } from "veridict";
 *   withVeridict(server, { name: "my-server" });
 *
 * @module veridict
 */

export { withVeridict } from "./middleware";
export { VerdictStore } from "./store";
export { canITrust } from "./trust";
export { parseLayer1Report } from "./baseline";
export type { TrustVerdict, ExecutionEntry, ToolStats, VerdictOptions, StaticBaseline, StaticRisk } from "./types";
