import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { CartClient } from "./CartClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Shopping Cart | ${siteConfig.name}`,
  description: "Review selected beats, producer-provided license terms, and included files.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return <CartClient />;
}
