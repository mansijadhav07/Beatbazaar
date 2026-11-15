import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./motion.css";
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
import { Outfit, Space_Mono, Unbounded } from "next/font/google";

const displayFont = Unbounded({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  display: "swap",
  variable: "--font-display",
});

const textFont = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-text",
});

const dataFont = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-data",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09080D",
};

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Beats and licenses by Astrylix`,
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
      <body
        className={`${displayFont.variable} ${textFont.variable} ${dataFont.variable} flex min-h-[100dvh] flex-col bg-surface text-ink antialiased`}
      >
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
            <main className="page-content flex-1 pb-24 md:pb-20">{children}</main>
            <Footer />
            <PersistentPlayer />
            <MobileNav role={user?.role ?? null} />
          </CartProvider>
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
