"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

const adminLinks = [
  { href: "/admin", label: "Moderation" },
  { href: "/admin/reports", label: "Reports and takedowns" },
  { href: "/admin/users", label: "Users and KYC" },
  { href: "/admin/orders", label: "Orders and refunds" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/featured", label: "Featured beats" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit", label: "Audit log" },
];

function AdminLinkList({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="space-y-1">
      {adminLinks.map((item) => {
        const current =
          item.href === "/admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel",
              current
                ? "bg-surface-muted font-semibold text-ink"
                : "text-steel-dark hover:bg-surface-muted hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden w-56 flex-none px-3 py-4 lg:block">
      <p className="mb-5 px-3 text-lg font-semibold text-ink">{siteConfig.name}</p>
      <AdminLinkList />
    </aside>
  );
}

export function AdminMobileNavigation() {
  return (
    <div className="lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span>Admin sections</span>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent aria-describedby="admin-nav-description">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle>Admin sections</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close admin navigation">
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetClose>
          </div>
          <p id="admin-nav-description" className="mb-4 mt-2 text-sm text-steel-dark">
            Choose an area to manage.
          </p>
          <AdminLinkList />
        </SheetContent>
      </Sheet>
    </div>
  );
}
