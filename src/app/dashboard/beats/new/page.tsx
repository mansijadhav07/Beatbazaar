export const dynamic = "force-dynamic";

import { requireRole } from "@/server/auth/guards";
import UploadBeatWizard from "./UploadBeatWizard";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: `Upload Beat | ${siteConfig.name}`,
  description: `Upload your beat, audio files, stems, and set licensing options on ${siteConfig.name}.`,
};

export default async function NewBeatPage() {
  await requireRole(["producer", "admin"], { requireVerifiedEmail: true });

  return (
    <div className="max-w-3xl">
      <div className="border-b border-border pb-4 mb-6">
        <h2 className="text-lg font-bold text-ink">Upload New Beat</h2>
        <p className="text-xs text-steel-dark">
          Add audio files, cover art, track parameters, and configure your commercial licenses.
        </p>
      </div>
      <UploadBeatWizard />
    </div>
  );
}
