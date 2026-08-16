# Box-GO

Local Box3 protocol analysis and compatibility runtime.

Install dependencies:

```bash
bun install
```

Analyze the newest capture in `dump/downloaded`:

```bash
bun run analyze
bun run packets
```

Start the local runtime:

```bash
bun run server
```

Start the mudb-compatible backend experiment:

```bash
npm run compat
```

It listens on `http://127.0.0.1:8080` with the Box3 WebSocket endpoint at
`ws://127.0.0.1:8080/ws`. This first milestone implements the original mudb
multi-socket handshake, schema validation, all 20 recovered protocol groups,
safe default inbound handlers, and the game-clock ping/pong exchange. It does
not yet implement world initialization or persistence.

Open `http://localhost:8080`. The WebSocket endpoint is
`ws://localhost:8080/ws`. If a capture contains server-to-client packets, they
are replayed with their original relative timing. Captures without inbound
packets run in record-only mode.

Dump ZIP files can be extracted to `dump/runtime-assets`; extracted files are
served from `/assets/*`. Capture files, tokens, session IDs, and extracted game
assets are intentionally ignored by Git.
