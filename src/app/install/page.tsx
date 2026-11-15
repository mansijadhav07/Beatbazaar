import type { Metadata } from "next";
import { SupportArticle, SupportSection } from "@/components/support/SupportArticle";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Install ${siteConfig.name}`,
  description: `Add ${siteConfig.name} to your device from a supported browser.`,
  alternates: { canonical: "/install" },
};

export default function InstallPage() {
  return (
    <SupportArticle
      title={`Use ${siteConfig.name} from your home screen`}
      intro={`${siteConfig.name} is a website. Supported browsers may let you add it to your device home screen.`}
    >
      <SupportSection title="iPhone and iPad">
        <p>
          Open {siteConfig.name} in Safari, use the Share menu, then choose Add to Home
          Screen if that option is available.
        </p>
      </SupportSection>
      <SupportSection title="Android">
        <p>
          Open {siteConfig.name} in Chrome and use the browser menu to choose Install app
          or Add to Home screen when offered.
        </p>
      </SupportSection>
      <p>
        Menu labels and availability depend on your browser and operating
        system. Offline access is not provided.
      </p>
    </SupportArticle>
  );
}
