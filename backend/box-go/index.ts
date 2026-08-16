import { analyzeCapture, findLatestCapture } from "./src/capture"
import { startLocalServer } from "./src/local-server"
import { analyzePackets } from "./src/packet-analysis"
import { runBrowserCapture } from "./src/browser-capture"

const command = Bun.argv[2] ?? "server"
const capturePath = Bun.argv[3] ?? findLatestCapture()

if (command === "analyze") {
  const summary = await analyzeCapture(capturePath)
  console.log(JSON.stringify(summary, null, 2))
} else if (command === "packets") {
  const report = await analyzePackets(capturePath)
  console.log(JSON.stringify(report, null, 2))
} else if (command === "browser-test") {
  const output = await runBrowserCapture({ sourceCapturePath: capturePath })
  console.log(`Browser capture saved: ${output}`)
} else if (command === "server") {
  await startLocalServer({ capturePath })
} else if (command === "help" || command === "--help" || command === "-h") {
  console.log("Box-GO local runtime")
  console.log("  bun run index.ts analyze [capture.json]")
  console.log("  bun run index.ts packets [capture.json]")
  console.log("  bun run index.ts browser-test [capture.json]")
  console.log("  bun run index.ts server  [capture.json]")
} else {
  console.error(`Unknown command: ${command}`)
  process.exitCode = 1
}
