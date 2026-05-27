import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

// --- Config ---
const HEADLESS = true;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;
const NAVIGATION_TIMEOUT_MS = 30000;
const PROVIDER_MESSAGE_SELECTORS = {
  chatgpt:
    '[data-message-author-role="user"], [data-message-author-role="assistant"]',
  claude:
    '[data-testid="user-message"], [data-testid="assistant-message"], [data-is-streaming]',
};
const DEBUG_SCRAPER = process.env.DEBUG_SCRAPE_LLM_SHARE_URL === "1";

const PLATFORMS = [
  // Windows profiles
  {
    platform: "Win32",
    platformVersion: "10.0.0",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    platform: "Win32",
    platformVersion: "10.0.0",
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
    timezoneId: "America/Chicago",
  },
  {
    platform: "Win32",
    platformVersion: "10.0.0",
    viewport: { width: 1536, height: 864 },
    locale: "en-GB",
    timezoneId: "Europe/London",
  },
  // macOS profiles
  {
    platform: "MacIntel",
    platformVersion: "13.0.0",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
  },
  {
    platform: "MacIntel",
    platformVersion: "13.0.0",
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    platform: "MacIntel",
    platformVersion: "13.0.0",
    viewport: { width: 1680, height: 1050 },
    locale: "en-AU",
    timezoneId: "Australia/Sydney",
  },
  // Linux profiles
  {
    platform: "Linux x86_64",
    platformVersion: "",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    platform: "Linux x86_64",
    platformVersion: "",
    viewport: { width: 1280, height: 720 },
    locale: "en-US",
    timezoneId: "Europe/Berlin",
  },
];

// WebGL vendor/renderer pairs that match common real-world hardware
const WEBGL_PROFILES = [
  {
    vendor: "Intel Inc.",
    renderer: "Intel Iris OpenGL Engine",
  },
  {
    vendor: "Intel Open Source Technology Center",
    renderer: "Mesa DRI Intel(R) HD Graphics 620",
  },
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer:
      "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0)",
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)",
  },
  {
    vendor: "Apple",
    renderer: "Apple M1",
  },
];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomPlatform = () => randomItem(PLATFORMS);
const randomWebGLProfile = () => randomItem(WEBGL_PROFILES);

// --- Helpers ---
function patchWebGLFingerprint(scope, vendor, renderer) {
  const patchWebGL = (Ctor) => {
    if (!Ctor) return;
    const orig = Ctor.prototype.getParameter;
    Ctor.prototype.getParameter = function (param) {
      if (param === 37445) return vendor; // UNMASKED_VENDOR_WEBGL
      if (param === 37446) return renderer; // UNMASKED_RENDERER_WEBGL
      return orig.call(this, param);
    };
  };

  patchWebGL(scope?.WebGLRenderingContext);
  patchWebGL(scope?.WebGL2RenderingContext);
}

/**
 * Human-paced delay with a skewed distribution:
 * 15% chance of a long pause (5–13 s), otherwise 1–3 s.
 * This avoids the statistically detectable uniform window.
 */
const randomDelay = () => {
  const ms =
    Math.random() < 0.15
      ? 5000 + Math.random() * 8000
      : MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
};

function isSupportedShareUrl(value) {
  return getShareUrlProvider(value) !== null;
}

function getShareUrlProvider(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const isChatGptHost =
    hostname === "chatgpt.com" || hostname === "www.chatgpt.com";
  const isClaudeHost = hostname === "claude.ai" || hostname === "www.claude.ai";
  const isSharePath = pathname.startsWith("/share/");

  if (!isSharePath) return null;
  if (isChatGptHost) return "chatgpt";
  if (isClaudeHost) return "claude";
  return null;
}

function isLlmShareUrl(value) {
  return isSupportedShareUrl(value);
}

function isChatGptShareUrl(value) {
  return isLlmShareUrl(value);
}

// Block resources you don't need (speeds up scraping significantly).
// Keep "image" enabled so signed estuary image requests can be observed.
const BLOCKED_RESOURCE_TYPES = ["font", "media", "stylesheet"];

async function setupPage(context) {
  const page = await context.newPage();

  await page.route("**/*", (route) => {
    if (BLOCKED_RESOURCE_TYPES.includes(route.request().resourceType())) {
      route.abort();
    } else {
      route.continue();
    }
  });

  return page;
}

function debugLog(...args) {
  if (DEBUG_SCRAPER) {
    console.log("[scrape-llm-share-url]", ...args);
  }
}

/**
 * Move the mouse in a loose organic arc before scrolling.
 * Arriving on a page and immediately scrolling is a bot signal.
 */
async function humanizeMouseMovement(page) {
  if (typeof page.viewportSize !== "function") return;
  const { width, height } = page.viewportSize();
  if (typeof width !== "number" || typeof height !== "number") return;

  // 2–4 gentle drifts across the viewport
  const moves = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < moves; i++) {
    await page.mouse.move(
      width * 0.2 + Math.random() * width * 0.6,
      height * 0.2 + Math.random() * height * 0.6,
      { steps: 8 + Math.floor(Math.random() * 12) },
    );
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 400));
  }
}

async function triggerImageRequests(page) {
  // Humanise before touching the scroll wheel
  await humanizeMouseMovement(page);

  if (typeof page.mouse?.wheel !== "function") return;
  // Shared chats can lazily fetch images. A small scroll often forces image
  // requests to fire without needing brittle selector dependencies.
  await page.mouse.wheel(0, 2000);
  await page.mouse.wheel(0, -2000);
  await randomDelay();
}

function toCanonicalEstuaryUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return "";
  }
  if (!parsed.pathname.includes("/backend-anon/files/download")) return "";
  return parsed.toString();
}

// --- Main scraper logic ---
async function scrapePage(page, url, estuaryUrls) {
  const provider = getShareUrlProvider(url);
  const messageSelector = PROVIDER_MESSAGE_SELECTORS[provider];
  if (!messageSelector) {
    const error = new Error(`No message selector configured for ${provider}`);
    error.status = 500;
    throw error;
  }

  debugLog("Scraping URL", { provider, url });

  // Register the listener BEFORE navigation so no early requests are missed
  if (typeof page.on === "function") {
    const captureEstuaryUrl = (rawUrl) => {
      const normalized = toCanonicalEstuaryUrl(rawUrl);
      if (normalized) estuaryUrls.add(normalized);
    };

    page.on("request", (request) => {
      captureEstuaryUrl(request.url());
    });

    page.on("response", (response) => {
      captureEstuaryUrl(response.url());
    });
  }

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: NAVIGATION_TIMEOUT_MS,
  });
  debugLog("Navigation complete");

  // Wait for key message nodes before extracting
  await page.waitForSelector(messageSelector, { timeout: 10000 });
  debugLog("Message selector found");
  await triggerImageRequests(page);

  // Mimic human pacing before extraction
  await randomDelay();

  const html = await page.content();
  debugLog("Captured page content", {
    htmlLength: html.length,
    estuaryUrlCount: estuaryUrls.size,
  });
  return {
    html,
    estuaryUrls: [...estuaryUrls],
  };
}

// --- Entry point ---
async function scrapeLlmShareData(url) {
  if (!isSupportedShareUrl(url)) {
    const error = new Error(
      "chat_url must be a valid ChatGPT or Claude public share URL",
    );
    error.status = 400;
    throw error;
  }

  let browser;

  try {
    browser = await chromium.launch({ headless: HEADLESS });
    const profile = randomPlatform();
    const webgl = randomWebGLProfile();

    const context = await browser.newContext({
      // No userAgent set — Playwright uses the real browser UA.
      // userAgentMetadata aligns Sec-CH-UA-Platform with our spoofed
      // navigator.platform so the two signals never contradict each other.
      userAgentMetadata: {
        platform: profile.platform,
        platformVersion: profile.platformVersion,
        architecture: profile.platform.includes("x86") ? "x86" : "",
        model: "",
        mobile: false,
      },
      viewport: profile.viewport,
      locale: profile.locale,
      timezoneId: profile.timezoneId,
    });

    // Spoof navigator.platform + harden WebGL fingerprint
    if (typeof context.addInitScript === "function") {
      await context.addInitScript(
        ({ platform, vendor, renderer }) => {
          const scope = globalThis.window || globalThis;

          // navigator.platform
          Object.defineProperty(scope.navigator, "platform", {
            get: () => platform,
          });

          // WebGL vendor / renderer (UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL)
          const patchWebGL = (Ctor) => {
            if (!Ctor) return;
            const orig = Ctor.prototype.getParameter;
            Ctor.prototype.getParameter = function (param) {
              if (param === 37445) return vendor; // UNMASKED_VENDOR_WEBGL
              if (param === 37446) return renderer; // UNMASKED_RENDERER_WEBGL
              return orig.call(this, param);
            };
          };
          patchWebGL(scope.WebGLRenderingContext);
          patchWebGL(scope.WebGL2RenderingContext);
        },
        {
          platform: profile.platform,
          vendor: webgl.vendor,
          renderer: webgl.renderer,
        },
      );
    }

    const page = await setupPage(context);
    const estuaryUrls = new Set();
    return await scrapePage(page, url, estuaryUrls);
  } catch (err) {
    const message = String(err?.message || "");
    if (message.includes("Timeout")) {
      const provider = getShareUrlProvider(url);
      const timeoutError = new Error(
        `Timed out while loading the ${provider || "LLM"} shared conversation`,
      );
      timeoutError.status = 500;
      timeoutError.provider = provider || "unknown";
      timeoutError.debugHint =
        "Set DEBUG_SCRAPE_LLM_SHARE_URL=1 for verbose scraper logs";
      throw timeoutError;
    }
    throw err;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function scrapeLlmShareHtml(url) {
  const { html } = await scrapeLlmShareData(url);
  return html;
}

async function scrapeChatGptShareData(url) {
  return scrapeLlmShareData(url);
}

async function scrapeChatGptShareHtml(url) {
  return scrapeLlmShareHtml(url);
}

async function runFromCli() {
  const args = process.argv.slice(2);
  const showHtml = args.includes("--html");
  const positionalArgs = args.filter((arg) => !arg.startsWith("--"));
  const [url] = positionalArgs;

  if (!url) {
    console.error(
      "Usage: node lib/scrape-llm-share-url.js <chatgpt-or-claude-share-url> [--html]",
    );
    process.exitCode = 1;
    return;
  }

  try {
    if (showHtml) {
      const html = await scrapeLlmShareHtml(url);
      process.stdout.write(`${html}\n`);
      return;
    }

    const result = await scrapeLlmShareData(url);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (err) {
    const message = err?.message || String(err);
    const status = Number.isInteger(err?.status) ? err.status : 1;
    console.error(message);
    process.exitCode = status > 0 ? status : 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runFromCli();
}

export {
  getShareUrlProvider,
  isLlmShareUrl,
  isChatGptShareUrl,
  patchWebGLFingerprint,
  scrapeLlmShareData,
  scrapeLlmShareHtml,
  scrapeChatGptShareData,
  scrapeChatGptShareHtml,
  toCanonicalEstuaryUrl,
};
