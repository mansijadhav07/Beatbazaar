import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole } from "@/server/auth/guards";
import {
  safePayoutErrorName,
  submitPayoutOnboarding,
} from "@/server/payouts/onboarding";
import { createRouteGateway } from "@/server/payouts/route-gateway";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["producer"], {
      requireVerifiedEmail: true,
    });
    const body: unknown = await request.json();
    const status = await submitPayoutOnboarding(
      session.user.id,
      session.user.email,
      body,
      (input) => createRouteGateway().createLinkedAccount(input)
    );
    return NextResponse.json({ status });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Check the payout details and try again." },
        { status: 400 }
      );
    }
    if (
      error instanceof Error &&
      error.message === "Payout onboarding has already been submitted."
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(
      "[Payout Onboarding] Request failed.",
      safePayoutErrorName(error)
    );
    return NextResponse.json(
      { error: "Payout onboarding could not be submitted. Try again later." },
      { status: 502 }
    );
  }
}
