import { EmptyState } from "@/components/ui/admin-data";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

function configValue(value: string | number | boolean | null): string {
  if (value === null) return "Not configured";
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  return String(value);
}

export default function AdminSettingsPage() {
  const settings = [
    { label: "Payout mode", value: siteConfig.payoutMode },
    { label: "Refund hold placeholder", value: `${siteConfig.refundWindowDays} days` },
    { label: "Platform fee", value: siteConfig.platformFeePercent === null ? null : `${siteConfig.platformFeePercent}%` },
    { label: "International payments", value: siteConfig.internationalPaymentsEnabled },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Site settings</h2>
        <p className="mt-1 text-sm leading-6 text-steel-dark">
          Current settings are read from server configuration. They are not editable here, so no
          unapproved business rates or payout rules can be saved.
        </p>
      </div>
      <dl className="divide-y divide-border rounded border border-border bg-surface">
        {settings.map((setting) => (
          <div key={setting.label} className="grid gap-1 px-4 py-4 sm:grid-cols-2 sm:gap-4">
            <dt className="text-sm text-steel-dark">{setting.label}</dt>
            <dd className="text-sm font-medium text-ink">{configValue(setting.value)}</dd>
          </div>
        ))}
      </dl>
      <EmptyState
        title="No database-managed settings"
        description="There is no site settings collection or approved edit workflow in this release. Change server environment settings through the deployment process."
      />
      <p className="text-sm leading-6 text-status-warning">
        The configured refund hold remains a placeholder until the owner approves the policy.
        Tax and invoice fields remain marked LEGAL REVIEW REQUIRED.
      </p>
    </div>
  );
}
