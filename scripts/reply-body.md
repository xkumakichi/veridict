@0xbrainkid The OTel semantic conventions #3582 is a great find — if trust provenance attributes land in OTel, Veridict's export path becomes plug-and-play for the entire observability ecosystem. Standard collectors instead of custom integrations. Will follow that thread closely.

On credential refresh cadence: Option 2 (threshold-based) makes the most sense to me. A VC refresh only triggers when the trust verdict actually changes — e.g., an agent crosses from "yes" to "caution." This maps naturally to Veridict's existing verdict tiers and gives the best signal-to-cost ratio for on-chain writes.

I'm in for the shared spec. Happy to take Layer 1→2.

That said — before we go deep into formalizing, I'd love to ground this in real usage first. Would you and @aak204 be open to trying Veridict in an actual setup? Even a rough integration would give us real signals to shape the spec against.

```typescript
import { withVeridict } from "veridict";
withVeridict(server, { name: "your-server" });
```

The spec should describe what we observe, not what we imagine. Real Layer 1→2 data from MCP-Trust-Kit + Veridict running together would be worth more than any design doc.
