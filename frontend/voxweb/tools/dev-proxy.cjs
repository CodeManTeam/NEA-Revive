// VW-003 dev proxy: serves dist/ on :18080 and forwards /api/ and /block/
// to the box3-server on :14323 (same-origin, avoids CORS for the wasm page).
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.resolve(process.env.VOXWEB_DIST || "dist");
const BACKEND = { host: "127.0.0.1", port: 14323 };
const PORT = 18080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".json": "application/json",
};

function proxyToBackend(req, res) {
  const proxy = http.request(
    {
      host: BACKEND.host,
      port: BACKEND.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${BACKEND.host}:${BACKEND.port}` },
    },
    (pRes) => {
      const headers = {
        "content-type": pRes.headers["content-type"] || "application/octet-stream",
        "access-control-allow-origin": "*",
      };
      if (pRes.headers["content-length"] !== undefined) {
        headers["content-length"] = pRes.headers["content-length"];
      }
      res.writeHead(pRes.statusCode || 502, headers);
      pRes.pipe(res);
    }
  );
  proxy.on("error", (e) => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end(`proxy error: ${e.message}`);
  });
  req.pipe(proxy);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  if (p.startsWith("/api/") || p.startsWith("/avatar/") || p.startsWith("/block/")) {
    return proxyToBackend(req, res);
  }
  // static files
  let file = path.join(DIST, p === "/" ? "start.html" : p);
  if (!fs.existsSync(file)) {
    // fallback: single-page index
    file = path.join(DIST, "start.html");
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "access-control-allow-origin": "*",
      "cache-control": "no-store, no-cache, must-revalidate",
      pragma: "no-cache",
      expires: "0",
    });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[nea-proxy] http://127.0.0.1:${PORT} (dist + backend proxy)`);
});
