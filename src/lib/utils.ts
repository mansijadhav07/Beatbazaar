import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats minor currency units into human readable currency strings.
 * e.g. (199900, "INR") -> "₹1,999"
 * e.g. (2999, "USD") -> "$29.99"
 */
export function formatMoney(amountMinorUnits: number, currency: "INR" | "USD"): string {
  if (currency === "INR") {
    const rupees = amountMinorUnits / 100;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: amountMinorUnits % 100 === 0 ? 0 : 2,
    }).format(rupees);
  }

  const dollars = amountMinorUnits / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

