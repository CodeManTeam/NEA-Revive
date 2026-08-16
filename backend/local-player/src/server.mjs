import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { loadClientRuntime } from "./client-runtime.mjs";
import { attachWebSocketBoundary } from "./websocket.mjs";

const root = resolve(import.meta.dirname, "..");
const runtimeRoot = join(root, "runtime");
const archiveRoot = join(root, "archive");
const manifest = JSON.parse(await readFile(join(runtimeRoot, "cache-manifest.json"), "utf8"));
const clientRuntime = await loadClientRuntime(join(root, "archive/project/bedwars/client-runtime"));
const port = Number(process.env.PORT || 4317);
const responseMap = new Map();
const missing = new Map();
const websocketState = { connections: 0, frames: 0, lastSession: null, lastFrame: null };

for (const item of manifest.responses) {
  responseMap.set(item.url, item);
  responseMap.set(item.normalizedUrl, item);
}

function contentType(path) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  })[extname(path).toLowerCase()] || "application/octet-stream";
}

function rewriteText(text, origin) {
  return text
    .replaceAll('"apiRoot":"https://code-api-pc.{domain}/"', `"apiRoot":"${origin}/__api/"`)
    .replaceAll('"gameRoot":"https://view.{domain}/"', `"gameRoot":"${origin}/__player/"`)
    .replaceAll("https://dao3.fun", origin)
    .replaceAll("https://code-api-pc.dao3.fun/", `${origin}/__api/`)
    .replaceAll("https://view.dao3.fun/", `${origin}/__player/`)
    .replaceAll("https://assets.box3.fun/engine/m/", `${origin}/__assets/engine/m/`)
    .replaceAll("https://assets.box3.fun/avatar/m/", `${origin}/__assets/avatar/m/`);
}

async function sendFile(response, path, origin) {
  const type = contentType(path);
  const body = await readFile(path);
  response.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  if (origin && /(?:text|javascript|json)/.test(type)) response.end(rewriteText(body.toString("utf8"), origin));
  else response.end(body);
}

function sendJson(response, value, status = 200) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(value, null, 2)}\n`);
}

const server = createServer(async (request, response) => {
  try {
    const origin = `http://${request.headers.host}`;
    const url = new URL(request.url || "/", origin);
    if (url.pathname === "/") {
      response.writeHead(302, { location: `/play/${clientRuntime.manifest.gameName}?contentId=${clientRuntime.manifest.contentId}` });
      response.end();
      return;
    }
    if (url.pathname === `/play/${clientRuntime.manifest.gameName}`) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(clientRuntime.renderLauncher());
      return;
    }
    if (clientRuntime.matchesPagePath(url.pathname)) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(clientRuntime.renderShell(origin));
      return;
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith("/_next/")) {
      const asset = await clientRuntime.get(url.pathname);
      if (!asset) {
        sendJson(response, { error: "player_asset_not_found", path: url.pathname }, 404);
        return;
      }
      response.writeHead(200, {
        "content-type": asset.contentType,
        "content-length": asset.bytes.length,
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : asset.bytes);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/createSession") {
      request.resume();
      sendJson(response, { config: {
        prefetchHashes: ["QmTn4FL6hBnoD469zujDAFMpQtZMNwF5Wcc4LtHTqWNYHZ.png"],
        sessionId: `local-${randomUUID()}`,
        socketServerUrl: `${origin.replace(/^http/, "ws")}/__ws`,
        maxSockets: 3,
        configuredAudioHashes: [],
        admin: false,
      }});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/getMapInfo") {
      sendJson(response, clientRuntime.renderShell ? {
        contentId: clientRuntime.manifest.contentId,
        name: "NEA Local Player",
        backgroundImage: `${origin}/block/QmTn4FL6hBnoD469zujDAFMpQtZMNwF5Wcc4LtHTqWNYHZ.png`,
      } : {});
      return;
    }
    if (request.method === "GET" && (url.pathname === `/content/auth/guest/${clientRuntime.manifest.contentId}` || url.pathname === `/content/view/increase/${clientRuntime.manifest.contentId}`)) {
      sendJson(response, { code: 200, data: { value: true } });
      return;
    }
    if (request.method === "GET" && url.pathname === "/sticker/all") {
      sendJson(response, []);
      return;
    }
    if (request.method === "POST" && url.pathname === "/statistics/content/online") {
      request.resume();
      sendJson(response, { code: 200, data: { value: true } });
      return;
    }
    const archivePrefix = [
      ["/block/", "block"],
      ["/engine/m/", "engine/m"],
      ["/avatar/m/", "avatar/m"],
    ].find(([prefix]) => url.pathname.startsWith(prefix));
    if ((request.method === "GET" || request.method === "HEAD") && archivePrefix) {
      const [prefix, namespace] = archivePrefix;
      const key = decodeURIComponent(url.pathname.slice(prefix.length));
      if (!/^[A-Za-z0-9._-]+$/.test(key)) {
        sendJson(response, { error: "invalid_asset_key" }, 400);
        return;
      }
      const assetPath = join(archiveRoot, namespace, key);
      await stat(assetPath);
      response.setHeader("access-control-allow-origin", "*");
      response.setHeader("cache-control", "public, max-age=31536000, immutable");
      response.setHeader("x-content-type-options", "nosniff");
      if (request.method === "HEAD") {
        response.writeHead(200, { "content-type": contentType(assetPath) });
        response.end();
      } else {
        await sendFile(response, assetPath);
      }
      return;
    }
    if (url.pathname === "/__local/status" || url.pathname === "/__local/missing") {
      const missingRequests = [...missing.entries()].map(([key, count]) => ({ key, count }));
      sendJson(response, url.pathname.endsWith("status") ? {
        service: "nea-local-player",
        cachedResponses: manifest.responses.length,
        recoveredAssets: manifest.assets.length,
        playerRuntime: "manifest-verified-historical-player",
        playerAssets: clientRuntime.assetCount,
        websocket: websocketState,
        missingRequests,
      } : missingRequests);
      return;
    }
    if (url.pathname === "/__api/auth/user" || url.pathname === "/__api/account") {
      sendJson(response, {
        code: 200,
        msg: "success",
        data: {
          userId: 900000001,
          appId: "1",
          avatar: "",
          birthday: "",
          email: "",
          gender: -1,
          hasSetPwd: false,
          language: "zh",
          nickname: "Local Guest",
          token: "local-guest",
          wallet: "",
          hasAuthenticated: false,
          phone: "",
          authType: 0,
          register: false,
          followerNum: 0,
          followingNum: 0,
          previewUrl: "",
          permission: 0
        }
      });
      return;
    }
    if (url.pathname.startsWith("/__api/")) {
      const upstream = new URL(url.pathname.slice(7) + url.search, "https://code-api-pc.dao3.fun/");
      const cached = responseMap.get(upstream.href);
      if (cached) {
        await sendFile(response, join(runtimeRoot, cached.file), origin);
        return;
      }
      missing.set(upstream.href, (missing.get(upstream.href) || 0) + 1);
      sendJson(response, { code: 200, msg: "success", data: null });
      return;
    }
    if (url.pathname.startsWith("/__assets/")) {
      const assetRoot = join(runtimeRoot, "assets");
      const assetPath = join(assetRoot, normalize(url.pathname.slice(10)));
      if (!assetPath.startsWith(assetRoot)) throw new Error("Invalid asset path");
      await stat(assetPath);
      await sendFile(response, assetPath);
      return;
    }
    const original = new URL(url.pathname + url.search, "https://dao3.fun");
    const normalizedUrl = new URL(original);
    normalizedUrl.searchParams.delete("__WB_REVISION__");
    const cached = responseMap.get(original.href) || responseMap.get(normalizedUrl.href);
    if (cached) {
      await sendFile(response, join(runtimeRoot, cached.file), origin);
      return;
    }
    missing.set(original.href, (missing.get(original.href) || 0) + 1);
    sendJson(response, { error: "uncaptured-response", url: original.href }, 404);
  } catch (error) {
    sendJson(response, { error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

attachWebSocketBoundary(server, websocketState);
server.listen(port, "127.0.0.1", () => {
  console.log(`NEA Local Player: http://127.0.0.1:${port}`);
});
