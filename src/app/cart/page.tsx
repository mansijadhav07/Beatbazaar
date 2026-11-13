import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { CartClient } from "./CartClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Shopping Cart | ${siteConfig.name}`,
  description: "Review your selected music licenses, stems, and commercial production contracts.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return <CartClient />;
}

