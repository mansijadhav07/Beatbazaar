"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { ChevronDown, UserRound } from "lucide-react";
import { signOut } from "@/server/auth/auth-client";
import type { UserRole } from "@/lib/validations/user";

function menuItemClassName() {
  return "flex min-h-11 items-center px-3 text-sm text-ink outline-none focus:bg-mist";
}

export function AccountMenu({ role }: { role: UserRole | null }) {
  if (!role) {
    return (
      <Link
        href="/login"
        className="inline-flex h-11 items-center gap-2 border border-border px-3 text-sm font-medium text-ink hover:bg-surface-muted sm:h-10"
      >
        <UserRound aria-hidden="true" className="h-4 w-4" />
        Sign in
      </Link>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="inline-flex h-11 items-center gap-2 border border-border px-3 text-sm font-medium text-ink hover:bg-surface-muted data-[state=open]:bg-mist sm:h-10">
        <UserRound aria-hidden="true" className="h-4 w-4" />
        Account
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 border border-border bg-surface py-1 text-ink shadow-lg"
        >
          <DropdownMenu.Label className="px-3 py-2 text-sm text-steel-dark">
            {role === "admin" ? "Administrator" : role === "producer" ? "Producer" : "Buyer"}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link href="/dashboard" className={menuItemClassName()}>
              Dashboard
            </Link>
          </DropdownMenu.Item>
          {role === "admin" && (
            <DropdownMenu.Item asChild>
              <Link href="/admin" className={menuItemClassName()}>
                Admin
              </Link>
            </DropdownMenu.Item>
          )}
          {role === "buyer" && (
            <DropdownMenu.Item asChild>
              <Link href="/dashboard/orders" className={menuItemClassName()}>
                Orders
              </Link>
            </DropdownMenu.Item>
          )}
          {role === "producer" && (
            <>
              <DropdownMenu.Item asChild>
                <Link href="/dashboard/beats" className={menuItemClassName()}>
                  My beats
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/dashboard/payouts" className={menuItemClassName()}>
                  Payout status
                </Link>
              </DropdownMenu.Item>
            </>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            className={menuItemClassName()}
            onSelect={async () => {
              await signOut();
              window.location.assign("/");
            }}
          >
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
