export function resolvePlaywrightBaseUrl(configuredUrl) {
  const url = new URL(configuredUrl || "http://127.0.0.1:3456");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Playwright base URL must be an HTTP(S) URL without credentials.");
  }
  return url.origin;
}
