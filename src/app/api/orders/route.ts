import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/guards";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { createOrder, CheckoutError } from "@/server/payments/checkout";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        trackId: z.string().min(1),
        licenseTier: z.enum(["free", "non_exclusive", "exclusive"]),
      })
    )
    .min(1, "At least one item is required in the cart."),
  currency: z.enum(["INR", "USD"]).default("INR"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to checkout." },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "A verified email address is required to checkout. Please verify your email." },
        { status: 403 }
      );
    }

    const rateCheck = await checkRateLimit(`checkout:${user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 10,
    });

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many checkout requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid order payload." },
        { status: 400 }
      );
    }

    const returnUrl = `${siteConfig.url}/orders`;

    const result = await createOrder(
      user.id,
      user.email,
      parsed.data.items,
      parsed.data.currency,
      returnUrl
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof CheckoutError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    const message = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

