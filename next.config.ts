import type { NextConfig } from "next";
import path from "path";

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' https:;
    media-src 'self' blob: https:;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const publicR2Url = new URL(
  process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "https://cdn.example.invalid"
);
const publicR2Protocol =
  publicR2Url.protocol === "https:"
    ? "https"
    : publicR2Url.protocol === "http:"
      ? "http"
      : null;
if (
  !publicR2Protocol ||
  publicR2Url.username ||
  publicR2Url.password
) {
  throw new Error("NEXT_PUBLIC_R2_PUBLIC_DOMAIN must be an HTTP(S) URL without credentials.");
}
const publicR2Path = `${publicR2Url.pathname.replace(/\/$/, "")}/**`;

const nextConfig: NextConfig = {
  distDir:
    process.env.PLAYWRIGHT_TEST_AUTH_ENABLED === "true"
      ? ".next-playwright"
      : process.env.NODE_ENV === "development"
        ? ".next-dev"
        : ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: publicR2Protocol,
        hostname: publicR2Url.hostname,
        port: publicR2Url.port,
        pathname: publicR2Path,
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
