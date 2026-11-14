import { describe, expect, it } from "vitest";
import { buildTrackOpenGraphData } from "./track-open-graph";

describe("buildTrackOpenGraphData", () => {
  it("uses the lowest enabled INR license with producer terms", () => {
    const data = buildTrackOpenGraphData({
      title: "Quiet Beat",
      producerName: "Producer One",
      genre: "Hip Hop",
      bpm: 90,
      licenses: [
        {
          enabled: true,
          termsText: "Credit the producer.",
          price: { amount: 12500, currency: "INR" },
        },
        {
          enabled: true,
          termsText: "Credit the producer.",
          price: { amount: 0, currency: "INR" },
        },
        {
          enabled: true,
          termsText: "International terms.",
          price: { amount: 50, currency: "USD" },
        },
      ],
    });

    expect(data.priceLabel).toBe("Free");
    expect(data.producerLabel).toBe("Producer One");
  });

  it("does not invent a producer or price when they are unavailable", () => {
    const data = buildTrackOpenGraphData({
      title: "Quiet Beat",
      producerName: "",
      genre: "Hip Hop",
      bpm: 90,
      licenses: [],
    });

    expect(data.producerLabel).toBe("Producer name not listed");
    expect(data.priceLabel).toBe("No active license");
  });
});
