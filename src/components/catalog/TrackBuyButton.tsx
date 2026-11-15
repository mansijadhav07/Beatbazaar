"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type LicenseTier } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, ArrowRight } from "lucide-react";

interface TrackBuyButtonProps {
  trackId: string;
  trackTitle: string;
  producerName: string;
  coverKey?: string | null;
  licenseTier: LicenseTier;
  isExclusive: boolean;
  isSoldExclusive: boolean;
  priceFormatted: string;
}

export function TrackBuyButton({
  trackId,
  trackTitle,
  producerName,
  coverKey,
  licenseTier,
  isExclusive,
  isSoldExclusive,
  priceFormatted,
}: TrackBuyButtonProps) {
  const router = useRouter();
  const { addToCart, cart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  if (isSoldExclusive) {
    return (
      <button
        disabled
        className="w-full rounded border border-border bg-surface-muted py-2.5 text-xs font-semibold text-steel cursor-not-allowed"
      >
        Sold Exclusively
      </button>
    );
  }

  const alreadyInCart = cart.some(
    (c) => c.trackId === trackId && c.licenseTier === licenseTier
  );

  const handleAction = () => {
    addToCart({
      trackId,
      licenseTier,
      trackTitle,
      producerName,
      coverKey: coverKey || undefined,
    });

    if (isExclusive) {
      router.push("/cart");
    } else {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

  if (alreadyInCart) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/cart")}
          className="w-full gap-2 border-border text-ink hover:bg-mist"
        >
          <Check aria-hidden="true" className="h-4 w-4 text-steel-dark" />
          <span>In Cart - View Cart</span>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleAction}
      variant={isExclusive ? "default" : "outline"}
      className="w-full text-xs gap-1.5"
    >
      {justAdded ? (
        <>
          <Check aria-hidden="true" className="h-4 w-4 text-status-success" />
          <span>Added to Cart</span>
        </>
      ) : isExclusive ? (
        <>
          <span>Buy Exclusive ({priceFormatted})</span>
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </>
      ) : (
        <>
          <ShoppingCart aria-hidden="true" className="h-4 w-4" />
          <span>Add to Cart ({priceFormatted})</span>
        </>
      )}
    </Button>
  );
}
