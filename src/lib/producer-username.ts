export const RESERVED_PRODUCER_USERNAMES = [
  "admin",
  "api",
  "beats",
  "cart",
  "checkout",
  "contact",
  "dashboard",
  "delivery",
  "faq",
  "help",
  "install",
  "login",
  "orders",
  "privacy",
  "producer",
  "producer-guidelines",
  "producers",
  "report",
  "copyright-and-takedown",
  "license-overview",
  "refunds",
  "reset-password",
  "terms",
  "track",
  "tracks",
  "sitemaps",
  "sitemap.xml",
  "robots.txt",
  "verify-email",
] as const;

const reservedProducerUsernames = new Set<string>(RESERVED_PRODUCER_USERNAMES);

export function isReservedProducerUsername(username: string): boolean {
  return reservedProducerUsernames.has(username.toLowerCase());
}
