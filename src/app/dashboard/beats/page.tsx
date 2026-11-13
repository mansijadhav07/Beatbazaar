export const dynamic = "force-dynamic";

import { requireRole } from "@/server/auth/guards";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import BeatsTable from "./BeatsTable";

export const metadata = {
  title: "My Beats | Beatbazaar",
  description: "Manage your uploaded beats, moderation status, and processing queue.",
};

export default async function ProducerBeatsPage() {
  await requireRole(["producer", "admin"]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 mb-6 gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">My Beats</h2>
          <p className="text-xs text-steel-dark">
            Manage your audio catalog, check processing and moderation status, or upload a new beat.
          </p>
        </div>
        <Link href="/dashboard/beats/new">
          <Button className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Upload New Beat
          </Button>
        </Link>
      </div>

      <BeatsTable />
    </div>
  );
}

