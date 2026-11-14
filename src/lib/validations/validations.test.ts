import { describe, it, expect } from "vitest";
import { UserRoleSchema, SignUpInputSchema } from "./user";
import { TrackSchema, MoneySchema } from "./track";
import { ProducerProfileSchema } from "./producer-profile";

describe("Validation Schemas", () => {
  it("enforces allowed user roles", () => {
    expect(UserRoleSchema.safeParse("buyer").success).toBe(true);
    expect(UserRoleSchema.safeParse("producer").success).toBe(true);
    expect(UserRoleSchema.safeParse("admin").success).toBe(true);
    expect(UserRoleSchema.safeParse("superuser").success).toBe(false);
  });

  it("validates signup input criteria", () => {
    const valid = SignUpInputSchema.safeParse({
      email: "artist@example.com",
      password: "securePassword123",
      name: "Artist Name",
      role: "buyer",
    });
    expect(valid.success).toBe(true);

    const shortPassword = SignUpInputSchema.safeParse({
      email: "artist@example.com",
      password: "short",
      name: "Artist Name",
    });
    expect(shortPassword.success).toBe(false);
  });

  it("enforces money as integer minor units", () => {
    const validINR = MoneySchema.safeParse({
      amount: 199900, // 1999.00 INR
      currency: "INR",
    });
    expect(validINR.success).toBe(true);

    const floatMoney = MoneySchema.safeParse({
      amount: 1999.99,
      currency: "INR",
    });
    expect(floatMoney.success).toBe(false);
  });

  it("validates track parameters and constraints", () => {
    const validTrack = TrackSchema.safeParse({
      producerId: "507f1f77bcf86cd799439011",
      title: "Midnight Drive",
      slug: "midnight-drive",
      genre: "Trap",
      bpm: 140,
      key: "F# Minor",
      moods: ["Dark", "Energetic"],
      tags: ["trap", "hard"],
      status: "live",
      licenses: [
        {
          tier: "non_exclusive",
          name: "Standard License",
          price: { amount: 249900, currency: "INR" },
          includedFiles: ["mp3", "wav"],
          termsText: "Producer-provided terms for this license.",
          termsVersion: "1.0",
          enabled: true,
        },
      ],
    });
    expect(validTrack.success).toBe(true);

    const invalidBpm = TrackSchema.safeParse({
      producerId: "507f1f77bcf86cd799439011",
      title: "Fast Track",
      slug: "fast-track",
      genre: "Speed",
      bpm: 350, // exceeds 280
      key: "C",
    });
    expect(invalidBpm.success).toBe(false);
  });

  it("enforces clean lowercase slug formats for producer profiles", () => {
    const validProfile = ProducerProfileSchema.safeParse({
      userId: "user_123",
      slug: "mumbai-beats",
      displayName: "Mumbai Beats",
      location: {
        country: "India",
        state: "Maharashtra",
        city: "Mumbai",
      },
    });
    expect(validProfile.success).toBe(true);

    const invalidSlug = ProducerProfileSchema.safeParse({
      userId: "user_123",
      slug: "Mumbai_Beats!",
      displayName: "Mumbai Beats",
      location: {
        country: "India",
        state: "Maharashtra",
        city: "Mumbai",
      },
    });
    expect(invalidSlug.success).toBe(false);
  });
});
