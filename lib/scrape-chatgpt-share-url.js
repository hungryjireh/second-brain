import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

// --- Config ---
const HEADLESS = true;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;
const NAVIGATION_TIMEOUT_MS = 30000;
const MESSAGE_SELECTOR =
  '[data-message-author-role="user"], [data-message-author-role="assistant"]';

// Rotate only the platform/OS and viewport — the browser version comes from
// Playwright's actual Chromium binary, so UA and Sec-CH-UA headers stay
// perfectly in sync with no risk of mismatch getting you blocked.
const PLATFORMS = [
  // Windows profiles
  {
    platform: "Win32",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    platform: "Win32",
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
    timezoneId: "America/Chicago",
  },
  {
    platform: "Win32",
    viewport: { width: 1536, height: 864 },
    locale: "en-GB",
    timezoneId: "Europe/London",
  },
  // macOS profiles
  {
    platform: "MacIntel",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
  },
  {
    platform: "MacIntel",
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    platform: "MacIntel",
    viewport: { width: 1680, height: 1050 },
    locale: "en-AU",
    timezoneId: "Australia/Sydney",
  },
  // Linux profiles
  {
    platform: "Linux x86_64",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    platform: "Linux x86_64",
    viewport: { width: 1280, height: 720 },
    locale: "en-US",
    timezoneId: "Europe/Berlin",
  },
];

const randomPlatform = () =>
  PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];

// --- Helpers ---
const randomDelay = () =>
  new Promise((resolve) =>
    setTimeout(
      resolve,
      MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS),
    ),
  );

function isChatGptShareUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  return (
    (hostname === "chatgpt.com" || hostname === "www.chatgpt.com") &&
    pathname.startsWith("/share/")
  );
}

// Block resources you don't need (speeds up scraping significantly)
const BLOCKED_RESOURCE_TYPES = ["image", "font", "media", "stylesheet"];

async function setupPage(context) {
  const page = await context.newPage();

  // Block unnecessary resources
  await page.route("**/*", (route) => {
    if (BLOCKED_RESOURCE_TYPES.includes(route.request().resourceType())) {
      route.abort();
    } else {
      route.continue();
    }
  });

  return page;
}

// --- Main scraper logic ---
async function scrapePage(page, url) {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: NAVIGATION_TIMEOUT_MS,
  });

  // Wait for key message nodes before extracting
  await page.waitForSelector(MESSAGE_SELECTOR, { timeout: 10000 });

  // Mimic human pacing before extraction
  await randomDelay();

  return page.content();
}

// --- Entry point ---
async function scrapeChatGptShareHtml(url) {
  if (!isChatGptShareUrl(url)) {
    const error = new Error(
      "chat_url must be a valid ChatGPT public share URL",
    );
    error.status = 400;
    throw error;
  }

  let browser;

  try {
    browser = await chromium.launch({ headless: HEADLESS });
    const profile = randomPlatform();
    const context = await browser.newContext({
      // No userAgent set — Playwright uses the real browser UA
      viewport: profile.viewport,
      locale: profile.locale,
      timezoneId: profile.timezoneId,
    });

    // Spoof navigator.platform to match our chosen profile
    await context.addInitScript((platform) => {
      Object.defineProperty(navigator, "platform", { get: () => platform });
    }, profile.platform);

    const page = await setupPage(context);
    return await scrapePage(page, url);
  } catch (err) {
    const message = String(err?.message || "");
    if (message.includes("Timeout")) {
      const timeoutError = new Error(
        "Timed out while loading the ChatGPT shared conversation",
      );
      timeoutError.status = 500;
      throw timeoutError;
    }
    throw err;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export { isChatGptShareUrl, scrapeChatGptShareHtml };
