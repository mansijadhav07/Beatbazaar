import Link from "next/link";
import { UploadCloud, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs font-medium text-steel-dark">Active Uploads</span>
            <CardTitle className="text-2xl font-bold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-steel-dark">Tracks live in catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs font-medium text-steel-dark">License Orders</span>
            <CardTitle className="text-2xl font-bold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-steel-dark">Purchases and downloads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs font-medium text-steel-dark">Gross Earnings</span>
            <CardTitle className="text-2xl font-bold">₹0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-steel-dark">Ready for monthly payout</p>
          </CardContent>
        </Card>
      </div>

      {/* Primary Action Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Producer Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs sm:text-sm text-steel-dark leading-relaxed">
            The Phase 2 audio pipeline will enable direct browser-to-R2 audio uploads with
            automated background preview generation, audio watermarking, and waveform peak extraction.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" className="gap-2" disabled>
              <UploadCloud className="h-4 w-4" />
              <span>Upload New Beat (Phase 2)</span>
            </Button>
            <Link href="/tracks">
              <Button size="sm" variant="outline" className="gap-1.5">
                <span>Browse Storefront</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
