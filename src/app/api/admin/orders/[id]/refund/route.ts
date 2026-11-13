import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { requireRole } from "@/server/auth/guards";
import { refundOrder } from "@/server/payments/refunds";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["admin"]);

    const { id: orderId } = await params;
    if (!mongoose.isValidObjectId(orderId)) {
      return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
    }

    let reason = "Admin manual refund";
    try {
      const body = await request.json();
      if (body?.reason && typeof body.reason === "string") {
        reason = body.reason.trim();
      }
    } catch {
      // Body is optional
    }

    const result = await refundOrder(orderId, session.user.id, reason);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to refund order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

