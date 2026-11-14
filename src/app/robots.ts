import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/dashboard",
        "/dashboard/",
        "/api",
        "/api/",
        "/cart",
        "/checkout",
        "/orders",
        "/orders/",
        "/login",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
