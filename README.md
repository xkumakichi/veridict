# Veridict

**Know if you can trust your MCP server.**

Veridict is a lightweight middleware that logs MCP tool executions and provides instant trust judgments. Add it to any MCP server in 2 lines.

## Install

```bash
npm install veridict
```

## Usage

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withVeridict } from "veridict";               // ← add this

const server = new McpServer({ name: "my-server", version: "1.0.0" });

// ... register your tools as usual ...

withVeridict(server, { name: "my-server" });            // ← add this
await server.connect(transport);
```

That's it. Every tool call is now logged and two new tools are available:

- **`veridict_stats`** — execution statistics for the server
- **`veridict_can_i_trust`** — trust judgment (YES / CAUTION / NO)

## CLI

```bash
npx veridict                       # Show all tracked servers
npx veridict stats my-server       # Detailed stats
npx veridict trust my-server       # Trust judgment
```

## How it works

1. **Logs every tool execution** — input hash, output hash, success/fail, latency
2. **Stores locally** — SQLite at `~/.veridict/executions.db`
3. **Judges trust** — based on success rate over execution history

```
can_I_trust("my-server")?

  ✅ TRUSTWORTHY
  Confidence: 99.2%
  Reason: success_rate 99.2% over 1247 executions
```

## Trust Judgment Logic

| Success Rate | Verdict | Meaning |
|---|---|---|
| ≥ 95% | ✅ yes | Trustworthy |
| ≥ 80% | ⚠️ caution | Some failures detected |
| < 80% | ❌ no | High failure rate |
| < 10 executions | ❓ unknown | Insufficient data |

## Options

```typescript
withVeridict(server, {
  name: "my-server",            // Required: server identifier
  instanceId: "prod-1",         // Optional: distinguish instances
  dbPath: "./my-logs.db",       // Optional: custom DB path
  minExecutions: 20,            // Optional: min data for judgment (default: 10)
});
```

## Future

Veridict is the trust layer for the AI agent economy. Current version stores logs locally. Future versions will support:

- On-chain audit trails (XRPL)
- Cross-agent trust verification
- Replay verification
- Enterprise compliance reporting

## License

MIT
