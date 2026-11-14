import Link from "next/link";
import { ArrowUpRight, Music, ShoppingBag, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/server/auth/guards";

export default async function DashboardPage() {
  const { user } = await requireRole(["producer", "buyer", "admin"]);

  if (user.role === "producer") {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-ink">Producer workspace</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Manage your catalog</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/dashboard/beats/new">
              <Button className="gap-2">
                <UploadCloud aria-hidden="true" className="h-4 w-4" />
                Upload a beat
              </Button>
            </Link>
            <Link href="/dashboard/beats">
              <Button variant="outline" className="gap-2">
                <Music aria-hidden="true" className="h-4 w-4" />
                Your beats
              </Button>
            </Link>
            <Link href="/dashboard/payouts">
              <Button variant="outline">Earnings and payouts</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === "admin") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Administration</h2>
        <p className="text-base text-ink">
          Review moderation, reports, orders, payouts, and account settings.
        </p>
        <Link href="/admin">
          <Button className="gap-2">
            Open admin workspace
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-ink">Your music account</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Purchased licenses</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/orders">
            <Button className="gap-2">
              <ShoppingBag aria-hidden="true" className="h-4 w-4" />
              View your orders
            </Button>
          </Link>
          <Link href="/tracks">
            <Button variant="outline">Browse beats</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
