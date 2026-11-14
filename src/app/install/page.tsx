import type { Metadata } from "next";
import { SupportArticle, SupportSection } from "@/components/support/SupportArticle";

export const metadata: Metadata = {
  title: "Install Beatbazaar",
  description: "Add Beatbazaar to your device from a supported browser.",
  alternates: { canonical: "/install" },
};

export default function InstallPage() {
  return (
    <SupportArticle
      title="Use Beatbazaar from your home screen"
      intro="Beatbazaar is a website. Supported browsers may let you add it to your device home screen."
    >
      <SupportSection title="iPhone and iPad">
        <p>
          Open Beatbazaar in Safari, use the Share menu, then choose Add to Home
          Screen if that option is available.
        </p>
      </SupportSection>
      <SupportSection title="Android">
        <p>
          Open Beatbazaar in Chrome and use the browser menu to choose Install app
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
