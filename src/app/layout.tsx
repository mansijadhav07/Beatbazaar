import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { serializeJsonLd } from "@/lib/json-ld";
import { buildSiteStructuredData } from "@/lib/structured-data";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AudioPlayerProvider } from "@/components/player/AudioPlayerContext";
import { PersistentPlayer } from "@/components/player/PersistentPlayer";
import { CartProvider } from "@/components/cart/CartContext";
import { getCurrentUser } from "@/server/auth/guards";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2C3947",
};

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Licensed beats from independent producers`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_IN",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en-IN">
      <body className="flex min-h-[100dvh] flex-col bg-surface text-ink antialiased">
        <AudioPlayerProvider>
          <CartProvider>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: serializeJsonLd(
                  buildSiteStructuredData(
                    siteConfig.url,
                    siteConfig.name,
                    siteConfig.description
                  )
                ),
              }}
            />
            <Header role={user?.role ?? null} />
            <main className="flex-1 pb-24 md:pb-20">{children}</main>
            <Footer />
            <PersistentPlayer />
            <MobileNav role={user?.role ?? null} />
          </CartProvider>
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
