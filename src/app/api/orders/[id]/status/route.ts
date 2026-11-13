import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { getCurrentUser } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { OrderModel } from "@/server/db/models/Order";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = await params;
    if (!mongoose.isValidObjectId(orderId)) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await connectMongoose();
    const order = await OrderModel.findById(orderId);
    if (!order || order.buyerId !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: order.status,
      paymentProvider: order.paymentProvider,
      paymentRef: order.paymentRef,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve order status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

