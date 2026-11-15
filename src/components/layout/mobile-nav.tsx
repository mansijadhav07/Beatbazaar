"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Search, ShoppingBag, UploadCloud, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/validations/user";

export function MobileNav({ role }: { role: UserRole | null }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/", icon: House },
    { label: "Tracks", href: "/tracks", icon: Search },
    { label: "Cart", href: "/cart", icon: ShoppingBag },
    {
      label: role === "producer" ? "Upload" : "Sell",
      href: role === "producer" ? "/dashboard/beats/new" : "/login?intent=producer",
      icon: UploadCloud,
    },
    {
      label: role === "admin" ? "Admin" : "Account",
      href: role === "admin" ? "/admin" : role ? "/dashboard" : "/login",
      icon: UserRound,
    },
  ];

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface pb-safe md:hidden"
    >
      <div className="mx-auto flex h-14 max-w-container items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors touch-manipulation",
                isActive ? "text-ink font-semibold" : "text-steel-dark hover:text-ink"
              )}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
