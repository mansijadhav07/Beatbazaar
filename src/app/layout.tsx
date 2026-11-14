import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { serializeJsonLd } from "@/lib/json-ld";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-[100dvh] flex-col bg-surface text-ink antialiased">
        <AudioPlayerProvider>
          <CartProvider>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: serializeJsonLd({
                  "@context": "https://schema.org",
                  "@graph": [
                    {
                      "@type": "Organization",
                      "@id": `${siteConfig.url}/#organization`,
                      name: siteConfig.name,
                      url: siteConfig.url,
                      areaServed: {
                        "@type": "Country",
                        name: "India",
                      },
                    },
                    {
                      "@type": "WebSite",
                      "@id": `${siteConfig.url}/#website`,
                      name: siteConfig.name,
                      url: siteConfig.url,
                      publisher: {
                        "@id": `${siteConfig.url}/#organization`,
                      },
                      potentialAction: {
                        "@type": "SearchAction",
                        target: `${siteConfig.url}/tracks?q={search_term_string}`,
                        "query-input": "required name=search_term_string",
                      },
                    },
                  ],
                }),
              }}
            />
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
