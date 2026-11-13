import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      {/* Moderation Queue Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Track Moderation Queue
          </CardTitle>
          <p className="text-xs text-steel-dark">
            Submitted beats requiring copyright validation and audio watermark check before going live.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track Title</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>BPM</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-steel-dark">
                    No pending tracks awaiting moderation.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

