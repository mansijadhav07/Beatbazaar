import type { Metadata } from "next";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { requireRole } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { OrderModel } from "@/server/db/models/Order";
import { OrderPageClient } from "./OrderPageClient";

export const dynamic = "force-dynamic";

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: OrderPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Order #${id.slice(-6)}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const session = await requireRole(["buyer", "producer", "admin"]);
  const { id: orderId } = await params;

  if (!mongoose.isValidObjectId(orderId)) {
    notFound();
  }

  await connectMongoose();
  const order = await OrderModel.findById(orderId);

  // Assert ownership: user can only view their own orders (unless admin)
  if (!order || (order.buyerId !== session.user.id && session.user.role !== "admin")) {
    notFound();
  }

  const serializedOrder = {
    id: order._id.toString(),
    status: order.status,
    currency: order.currency,
    totalAmount: order.totalAmount,
    paymentRef: order.paymentRef,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((it) => ({
      trackId: it.trackId.toString(),
      title: it.title,
      producerName: it.producerName,
      licenseTier: it.licenseTier,
      termsVersion: it.termsVersion,
      pricePaid: {
        amount: it.pricePaid.amount,
        currency: it.pricePaid.currency,
      },
    })),
  };

  return <OrderPageClient order={serializedOrder} />;
}
