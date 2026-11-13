import { describe, it, expect } from "vitest";
import { SignUpInputSchema } from "@/lib/validations/user";

describe("Admin Role Rejection on Sign-up", () => {
  it("rejects admin role in SignUpInputSchema validation", () => {
    const adminAttempt = SignUpInputSchema.safeParse({
      email: "attacker@example.com",
      password: "securePassword123",
      name: "Bad Actor",
      role: "admin",
    });

    expect(adminAttempt.success).toBe(false);
    if (!adminAttempt.success) {
      expect(adminAttempt.error.issues[0].path).toContain("role");
    }
  });

  it("permits buyer and producer roles in SignUpInputSchema", () => {
    const buyerAttempt = SignUpInputSchema.safeParse({
      email: "buyer@example.com",
      password: "securePassword123",
      name: "Beat Buyer",
      role: "buyer",
    });
    expect(buyerAttempt.success).toBe(true);

    const producerAttempt = SignUpInputSchema.safeParse({
      email: "producer@example.com",
      password: "securePassword123",
      name: "Beat Producer",
      role: "producer",
    });
    expect(producerAttempt.success).toBe(true);
  });
});
