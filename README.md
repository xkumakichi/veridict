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

```
can_I_trust("my-server")?

  verdict: "yes"
  confidence: 0.99
  success_rate: 0.992
  total_executions: 1247
  reason: "success_rate 99.2% over 1247 executions"
```

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
[veridict] fetch_data FAIL 3201ms — timeout
[veridict] search_docs ok 94ms
```

## CLI

```bash
npx veridict                       # Show all tracked servers
npx veridict stats my-server       # Detailed stats
npx veridict trust my-server       # Trust judgment
```

## Trust judgment logic

| Success Rate | Verdict | Meaning |
|---|---|---|
| >= 95% | yes | Trustworthy |
| >= 80% | caution | Some failures detected |
| < 80% | no | High failure rate |
| < 10 executions | unknown | Insufficient data |

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
2. Logs every execution: input hash, output hash, success/fail, latency
3. Stores in local SQLite (`~/.veridict/executions.db`)
4. Provides trust judgment based on execution history

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
