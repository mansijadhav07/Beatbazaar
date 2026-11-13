import { z } from "zod";

export const AuditLogSchema = z.object({
  id: z.string().optional(),
  actorId: z.string(),
  actorRole: z.string(),
  action: z.string(),
  targetCollection: z.string(),
  targetId: z.string(),
  before: z.record(z.unknown()).nullable().optional(),
  after: z.record(z.unknown()).nullable().optional(),
  ipAddress: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

