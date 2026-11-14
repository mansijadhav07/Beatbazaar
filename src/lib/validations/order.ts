import { z } from "zod";
import { CurrencyCodeSchema, LicenseTierSchema, MoneySchema } from "./track";

export const OrderStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "refunded",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderItemSnapshotSchema = z.object({
  trackId: z.string(),
  title: z.string(),
  producerId: z.string(),
  producerName: z.string(),
  licenseTier: LicenseTierSchema,
  termsText: z.string(),
  termsVersion: z.string(),
  pricePaid: MoneySchema,
});
export type OrderItemSnapshot = z.infer<typeof OrderItemSnapshotSchema>;

export const OrderSchema = z.object({
  id: z.string().optional(),
  buyerId: z.string(),
  status: OrderStatusSchema.default("pending"),
  currency: CurrencyCodeSchema,
  totalAmount: z.number().int().nonnegative(),
  taxAmount: z.number().int().nonnegative().nullable().default(null),
  platformFeeAmount: z.number().int().nonnegative().default(0),
  paymentProvider: z.enum(["razorpay", "stripe"]).optional(),
  paymentRef: z.string().optional(),
  items: z.array(OrderItemSnapshotSchema).min(1),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Order = z.infer<typeof OrderSchema>;
