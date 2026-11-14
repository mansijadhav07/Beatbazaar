import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireRole } from "@/server/auth/guards";
import { refundOrder } from "@/server/payments/refunds";
import { consumeAdminStepUpToken, isSameOriginRequest } from "@/server/admin/step-up";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 });
  }
  const parsed = z.object({
    reason: z.string().trim().min(3).max(500),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A refund reason is required." }, { status: 400 });
  }
  const sessionContext = await requireRole(["admin"]);
  const { id: orderId } = await params;
  if (!mongoose.isValidObjectId(orderId)) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }
  try {
    await consumeAdminStepUpToken({
      request,
      session: sessionContext,
      action: "order_refund",
      targetId: orderId,
    });
    const result = await refundOrder(orderId, sessionContext.user.id, parsed.data.reason);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refund order.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
