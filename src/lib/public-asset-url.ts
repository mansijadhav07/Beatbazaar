import { siteConfig } from "@/config/site";

export function getPublicAssetUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, "");
  if (cleanKey.startsWith("local-demo/")) {
    return `/demo/${cleanKey.slice("local-demo/".length)}`;
  }
  return `${siteConfig.publicR2Domain}/${cleanKey}`;
}
