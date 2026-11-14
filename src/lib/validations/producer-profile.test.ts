import { describe, expect, it } from "vitest";
import {
  ProducerProfileSchema,
} from "./producer-profile";
import { isReservedProducerUsername } from "@/lib/producer-username";

const validProfile = {
  userId: "producer-1",
  slug: "north-star",
  displayName: "North Star",
  bio: "",
  location: { country: "India", state: "Maharashtra", city: "Pune" },
};

describe("producer profile username validation", () => {
  it("rejects usernames that collide with application routes", () => {
    expect(isReservedProducerUsername("tracks")).toBe(true);
    expect(isReservedProducerUsername("report")).toBe(true);
    expect(isReservedProducerUsername("license-overview")).toBe(true);
    expect(ProducerProfileSchema.safeParse({ ...validProfile, slug: "admin" }).success)
      .toBe(false);
    expect(ProducerProfileSchema.safeParse({ ...validProfile, slug: "login" }).success)
      .toBe(false);
  });

  it("accepts a non-reserved username", () => {
    expect(ProducerProfileSchema.safeParse(validProfile).success).toBe(true);
  });
});
