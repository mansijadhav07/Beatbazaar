export const dynamic = "force-dynamic";

import { requireRole } from "@/server/auth/guards";
import UploadBeatWizard from "./UploadBeatWizard";

export const metadata = {
  title: "Upload Beat | Beatbazaar",
  description: "Upload your beat, audio files, stems, and set licensing options on Beatbazaar.",
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

