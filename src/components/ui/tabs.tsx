import Link from "next/link";
import { cn } from "@/lib/utils";

export interface AdminTabItem {
  href: string;
  label: string;
  current: boolean;
}

export function AdminTabs({
  items,
  label,
}: {
  items: AdminTabItem[];
  label: string;
}) {
  return (
    <nav aria-label={label} className="overflow-x-auto border-b border-border">
      <div className="flex min-w-max gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.current ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center border-b-2 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel",
              item.current
                ? "border-ink font-semibold text-ink"
                : "border-transparent text-steel-dark hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
