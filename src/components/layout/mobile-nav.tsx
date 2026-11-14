"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Music2, Search, UploadCloud, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/validations/user";

export function MobileNav({ role }: { role: UserRole | null }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/", icon: Music2 },
    { label: "Tracks", href: "/tracks", icon: Search },
    {
      label: role === "producer" ? "Upload" : "Sell",
      href: role === "producer" ? "/dashboard/beats/new" : "/login?intent=producer",
      icon: UploadCloud,
    },
    { label: "Account", href: role ? "/dashboard" : "/login", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface pb-safe md:hidden">
      <div className="flex h-14 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 w-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors touch-manipulation",
                isActive ? "text-ink font-semibold" : "text-steel-dark hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
