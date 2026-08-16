import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";

function jsonForScript(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function normalizeOrigin(origin) {
  return new URL(origin).origin;
}

function renderLauncherBridge() {
  return `<script>(()=>{"use strict";const origin=window.location.origin;const allowedEvents=new Set(["hashChange","jumpTo","loaded","openStore","openUserProfile","playerContextmenu","screenshot"]);let connected=false;const frame=()=>{const value=document.getElementById("GameIframe");return value instanceof HTMLIFrameElement?value:null};const record=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);const smallValue=(value,depth=0)=>{if(value===null||value===undefined||typeof value==="boolean")return true;if(typeof value==="number")return Number.isFinite(value);if(typeof value==="string")return value.length<=2048;if(depth>=3)return false;if(Array.isArray(value))return value.length<=32&&value.every(item=>smallValue(item,depth+1));if(!record(value))return false;const entries=Object.entries(value);return entries.length<=32&&entries.every(([key,item])=>key.length<=128&&smallValue(item,depth+1))};const validPayload=(name,value)=>name==="screenshot"?record(value)&&value.blob instanceof Blob&&value.blob.size<=4194304:smallValue(value);const reply=(source,id,value)=>source.postMessage({penpal:"reply",id,resolution:"fulfilled",returnValue:value},origin);window.addEventListener("message",event=>{const gameFrame=frame();if(!gameFrame||event.origin!==origin||event.source!==gameFrame.contentWindow||!record(event.data))return;const data=event.data;if(data.penpal==="syn"){connected=false;gameFrame.dataset.localBridge="synack";event.source.postMessage({penpal:"synAck",methodNames:["emit"]},origin);return}if(data.penpal==="ack"){if(Array.isArray(data.methodNames)&&data.methodNames.length<=2&&data.methodNames.includes("emit")&&data.methodNames.every(name=>name==="emit"||name==="receiveHeartbeat")){connected=true;gameFrame.dataset.localBridge="connected"}return}if(!connected||data.penpal!=="call"||data.methodName!=="emit"||!Number.isSafeInteger(data.id)||data.id<1||data.id>2147483647||!Array.isArray(data.args)||data.args.length<1||data.args.length>2||typeof data.args[0]!=="string"||data.args[0].length>80)return;const name=data.args[0];const accepted=allowedEvents.has(name)&&validPayload(name,data.args[1]);if(accepted&&name==="loaded")gameFrame.dataset.localBridge="ready";reply(event.source,data.id,accepted)});})();</script>`;
}

export async function loadClientRuntime(root) {
  const runtimeRoot = resolve(root);
  const manifest = JSON.parse(await readFile(join(runtimeRoot, "manifest.json"), "utf8"));
  if (manifest.format !== "nea-recovered-client-runtime" || manifest.version !== 1) {
    throw new Error("Unsupported recovered client runtime manifest");
  }
  const entries = new Map(manifest.files.map((entry) => [entry.path, entry]));
  const verified = new Map();

  async function get(pathname) {
    const entry = entries.get(pathname);
    if (!entry) return null;
    if (verified.has(pathname)) return verified.get(pathname);
    const filePath = resolve(runtimeRoot, normalize(entry.file));
    if (!filePath.startsWith(runtimeRoot)) throw new Error(`Unsafe runtime path: ${entry.file}`);
    const bytes = await readFile(filePath);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== entry.bytes || sha256 !== entry.sha256) {
      throw new Error(`Recovered Player asset failed verification: ${pathname}`);
    }
    const asset = { bytes, contentType: entry.contentType };
    verified.set(pathname, asset);
    return asset;
  }

  for (const pathname of entries.keys()) await get(pathname);

  function createClientConfig(origin) {
    const localOrigin = normalizeOrigin(origin);
    return {
      APP_EDITION: "box3",
      APP_ENV: "production",
      APP_REGION: "cn",
      ARENA_URL: localOrigin,
      BACKEND_SERVER_URL: localOrigin,
      CDN_PATH: localOrigin,
      CREATERA_BACKEND_SERVER_URL: localOrigin,
      FEATURE_FLAGS: [],
      JAVA_BACKEND_SERVER_URL: localOrigin,
      LOG_LEVEL: "warn",
      MAAS_BACKEND_SERVER_URL: localOrigin,
      MAX_HALF_CHUNKS: 4,
      MAX_Y_HALF_CHUNKS: 1,
      OSS_CDN_URL: localOrigin,
      PLATFORM_URL: localOrigin,
      SCRIPT_WHITELIST: [],
      WEBSITE_URL: localOrigin,
      cacheIPFS: false,
      headless: false,
      mapInfo: {
        contentId: manifest.contentId,
        name: "NEA Local Player",
        backgroundImage: `${localOrigin}/block/QmTn4FL6hBnoD469zujDAFMpQtZMNwF5Wcc4LtHTqWNYHZ.png`,
      },
      mockJavaBackend: true,
      mode: "play",
    };
  }

  function renderShell(origin) {
    const clientConfig = createClientConfig(origin);
    const nextData = {
      buildId: manifest.buildId,
      page: "/p/[gameName]",
      query: { contentId: manifest.contentId, gameName: manifest.gameName },
      props: {
        pageProps: {
          clientConfig,
          loadingConfig: false,
          locale: "zh",
          message: { playLoadingTip: "Loading" },
          userInfo: { id: 0, nickname: "Guest" },
        },
      },
      isFallback: false,
      gssp: true,
      locale: "zh",
      locales: ["zh"],
      defaultLocale: "zh",
    };
    const styles = manifest.initialStyles.map((path) => `<link rel="stylesheet" href="${path}">`).join("");
    const scripts = manifest.initialScripts.map((path) => `<script defer src="${path}"></script>`).join("");
    return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="next-head-count" content="0"><title>NEA Local Player</title>${styles}<script>window.CLIENT_CONFIG=${jsonForScript(clientConfig)};</script></head><body><div id="__next"></div><div id="react-container"></div><script id="__NEXT_DATA__" type="application/json">${jsonForScript(nextData)}</script>${scripts}</body></html>`;
  }

  function renderLauncher() {
    const source = `${manifest.pagePath}?contentId=${encodeURIComponent(manifest.contentId)}`;
    return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEA Local Player</title><style>html,body,#GameIframe{width:100%;height:100%;margin:0;border:0;display:block;overflow:hidden;background:#000}</style></head><body>${renderLauncherBridge()}<iframe id="GameIframe" data-local-bridge="waiting" title="NEA Local Player" src="${source}" allow="autoplay; clipboard-read; clipboard-write; fullscreen; gamepad; pointer-lock" allowfullscreen></iframe></body></html>`;
  }

  return {
    manifest,
    assetCount: entries.size,
    get,
    matchesPagePath: (pathname) => pathname === manifest.pagePath || pathname === `/p/${manifest.gameName}`,
    renderShell,
    renderLauncher,
  };
}
