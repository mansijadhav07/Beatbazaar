import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AudioPlayerProvider } from "@/components/player/AudioPlayerContext";
import { PersistentPlayer } from "@/components/player/PersistentPlayer";
import { CartProvider } from "@/components/cart/CartContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2C3947",
};

export const metadata: Metadata = {
  title: "Beatbazaar | Licensed Beats and Music Production Marketplace",
  description:
    "Buy and sell licensed beats online. Independent producers upload stems and audio; artists purchase instant commercial licenses with UPI, cards, and international payment options.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "Beatbazaar | Licensed Beats and Music Production Marketplace",
    description:
      "Buy and sell licensed beats online. Commercial music licenses, instant stems downloads, and producer storefronts.",
    url: "https://beatbazaar.com",
    siteName: "Beatbazaar",
    locale: "en_IN",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen min-h-[100dvh] flex-col bg-surface text-ink antialiased">
        <AudioPlayerProvider>
          <CartProvider>
            <Header />
            <main className="flex-1 pb-24 md:pb-20">{children}</main>
            <Footer />
            <PersistentPlayer />
            <MobileNav />
          </CartProvider>
        </AudioPlayerProvider>
      </body>
    </html>
  );
}

