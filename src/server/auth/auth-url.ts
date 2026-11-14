import { siteConfig } from "@/config/site";

export function getAuthBaseUrl(
  env: {
    BETTER_AUTH_URL?: string;
    NEXT_PUBLIC_APP_URL?: string;
  } = {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }
): string {
  const configuredUrl =
    env.BETTER_AUTH_URL?.trim() ||
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    siteConfig.url;
  const url = new URL(configuredUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Auth base URL must be an HTTP(S) URL without credentials.");
  }
  return url.toString().replace(/\/$/, "");
}
