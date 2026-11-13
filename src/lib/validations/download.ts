import { z } from "zod";

export const DownloadTokenSchema = z.object({
  id: z.string().optional(),
  orderId: z.string(),
  itemId: z.string(),
  token: z.string(),
  issuedAt: z.date().default(() => new Date()),
  expiresAt: z.date(),
  ipHash: z.string().default(""),
  downloadCount: z.number().int().nonnegative().default(0),
});

export type DownloadToken = z.infer<typeof DownloadTokenSchema>;

