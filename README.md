# Veridict

**Know if you can trust your MCP server.**

Agents call tools. Some fail silently. Veridict gives you a signal.

Part of the emerging [Agent Trust Stack](https://github.com/aak204/MCP-Trust-Kit/issues/1) (Runtime Verification Layer).

## Quickstart (30 seconds)

```bash
npm install veridict
```

```typescript
import { withVeridict } from "veridict";               // 1. import
// ... register your tools as usual ...
withVeridict(server, { name: "my-server" });            // 2. wrap
await server.connect(transport);
```

Done. Every tool call is now logged. Two new tools are automatically added:

- **`veridict_stats`** — execution statistics
- **`veridict_can_i_trust`** — trust judgment (YES / CAUTION / NO)

## What you get

```json
{
  "verdict": "yes",
  "score": 0.97,
  "reason": "reliable",
  "recentSuccessRate": 0.98,
  "recentExecutions": 85,
  "failureBreakdown": { "timeout": 2, "error": 1 },
  "stats": {
    "totalExecutions": 1247,
    "successRate": 0.992,
    "avgLatencyMs": 142
  }
}
```

**Two-layer design:**
- **Layer 1 (instant decision):** `verdict` + `score` + `reason` — all an agent needs
- **Layer 2 (details on demand):** `stats` + `failureBreakdown` + `recentSuccessRate` — dig deeper when needed

## v0.2.0 — What's new

- **Failure classification** — failures are categorized as `timeout`, `error`, `validation`, or `unknown`
- **Time decay** — recent executions (last 7 days) are weighted 70%, all-time 30%
- **Trust score** — `score` field (0-1) replaces `confidence` for clearer semantics
- **Failure breakdown** — see exactly what types of failures are occurring
- **Agent-friendly reasons** — short, actionable: `"elevated timeout rate"`, `"reliable"`, `"high error rate"`

## Verbose mode

See executions in real-time:

```typescript
withVeridict(server, { name: "my-server", verbose: true });
```

Output (stderr):

```
[veridict] monitoring "my-server"
[veridict] search_docs ok 120ms
[veridict] create_item ok 85ms
[veridict] fetch_data FAIL [timeout] 30201ms — timeout
[veridict] search_docs ok 94ms
```

## CLI

```bash
npx veridict                       # Show all tracked servers
npx veridict stats my-server       # Detailed stats
npx veridict trust my-server       # Trust judgment
```

## Trust judgment logic

| Blended Rate | Verdict | Meaning |
|---|---|---|
| >= 95% | yes | Trustworthy |
| >= 80% | caution | Some failures detected |
| < 80% | no | High failure rate |
| < 10 executions | unknown | Insufficient data |

**Blended rate** = recent 7-day success rate (70% weight) + all-time rate (30% weight).

Recent performance matters more than history.

## Failure types

| Type | Detected when |
|---|---|
| `timeout` | Latency > 30s, or error contains "timeout"/"ETIMEDOUT" |
| `validation` | Error contains "valid"/"schema"/"parse" |
| `error` | All other failures |
| `unknown` | Legacy data (pre-v0.2.0) |

## Options

```typescript
withVeridict(server, {
  name: "my-server",            // Required: server identifier
  instanceId: "prod-1",         // Optional: distinguish instances
  dbPath: "./my-logs.db",       // Optional: custom DB path (default: ~/.veridict/executions.db)
  minExecutions: 20,            // Optional: min data for judgment (default: 10)
  verbose: true,                // Optional: log to stderr (default: false)
});
```

## Layer 1 integration (MCP Trust Kit)

Combine static analysis with runtime monitoring for full-stack trust:

```bash
# Step 1: Static scan with MCP Trust Kit (v0.5.0+)
npx mcp-trust-kit scan --json-out layer1-baseline.json --cmd node my-server.js
```

```typescript
import { withVeridict, parseLayer1Report } from "veridict";
import report from "./layer1-baseline.json";

withVeridict(server, {
  name: "my-server",
  baseline: parseLayer1Report(report),  // Layer 1 → Layer 2
});
```

What this does:
- Static risks (e.g., `dangerous_fs_write`) are factored into trust judgment
- Critical static risks downgrade a "yes" verdict to "caution" even at 99% success rate
- `scan_timestamp` is preserved for Layer 3 temporal decay logic
- The full Layer 1 report is stored in `baseline.raw` for cross-org consumers

Part of the [Agent Trust Stack](https://github.com/aak204/MCP-Trust-Kit/issues/1):
```
Layer 1: MCP Trust Kit (pre-deploy)  → "Is this server safe to run?"
Layer 2: Veridict (runtime)          → "Is this server actually reliable?"
Layer 3: SATP/XAIP (cross-org)      → "Should I trust this across boundaries?"
```

## How it works

1. Wraps all registered MCP tool handlers
2. Logs every execution: input hash, output hash, success/fail, failure type, latency
3. Stores in local SQLite (`~/.veridict/executions.db`)
4. Provides trust judgment based on time-weighted execution history

## Future

- Cross-agent trust verification
- OpenTelemetry export
- On-chain audit trails
- Enterprise compliance reporting

## Early users welcome

If you're building MCP servers or agents, I'd love your feedback.
Try Veridict and tell me what breaks.

## License

MIT
