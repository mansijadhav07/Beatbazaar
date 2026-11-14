import { siteConfig } from "@/config/site";

export function getAppUrl(path: string, baseUrl = siteConfig.url): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("App links must be root-relative paths.");
  }
  return new URL(path, baseUrl).toString();
}
