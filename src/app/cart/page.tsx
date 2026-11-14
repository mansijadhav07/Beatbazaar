import type { Metadata } from "next";
import { CartClient } from "./CartClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shopping cart",
  description: "Review selected beats, producer-provided license terms, and included files.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return <CartClient />;
}
