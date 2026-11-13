import { z } from "zod";

export const UserRoleSchema = z.enum(["buyer", "producer", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: UserRoleSchema.default("buyer"),
  emailVerified: z.boolean().default(false),
  image: z.string().url().optional().nullable(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type User = z.infer<typeof UserSchema>;

export const SignUpInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  role: z.enum(["buyer", "producer"]).default("buyer"),
});

export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export const SignInInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignInInput = z.infer<typeof SignInInputSchema>;

export const PasswordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

export type PasswordResetConfirm = z.infer<typeof PasswordResetConfirmSchema>;

