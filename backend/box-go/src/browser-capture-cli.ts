import { findLatestCapture } from "./capture"
import { runBrowserCapture } from "./browser-capture"

const sourceCapturePath = process.argv[2] ?? findLatestCapture()
const output = await runBrowserCapture({ sourceCapturePath })
console.log(`Browser capture saved: ${output}`)
