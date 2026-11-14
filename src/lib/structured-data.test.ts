import { describe, expect, it } from "vitest";
import {
  buildFaqStructuredData,
  buildSiteStructuredData,
  buildTrackStructuredData,
  getIndexRobots,
} from "./structured-data";

const trackLicense = {
  tier: "non_exclusive" as const,
  name: "Non-Exclusive",
  price: { amount: 1500, currency: "INR" as const },
  includedFiles: ["mp3" as const],
  termsText: "Fixture terms for this test only.",
  termsVersion: "1",
  enabled: true,
};

describe("public structured data", () => {
  it("provides Organization and WebSite SearchAction data", () => {
    const graph = buildSiteStructuredData(
      "https://beatbazaar.example",
      "Beatbazaar",
      "Licensed beats"
    )["@graph"];
    expect(graph.map((item) => item["@type"])).toEqual(["Organization", "WebSite"]);
    expect(graph[1].potentialAction).toMatchObject({
      "@type": "SearchAction",
      target: "https://beatbazaar.example/tracks?q={search_term_string}",
    });
  });

  it("provides MusicRecording, Product offers, and breadcrumbs for a track", () => {
    const graph = buildTrackStructuredData({
      siteUrl: "https://beatbazaar.example",
      id: "507f1f77bcf86cd799439011",
      slug: "fixture-track",
      title: "Fixture Track",
      genre: "Hip Hop",
      key: "C",
      producerName: "Fixture Producer",
      producerUsername: "fixture-producer",
      coverUrl: null,
      soldExclusive: false,
      licenses: [trackLicense],
    })["@graph"];
    expect(graph.map((item) => item["@type"])).toEqual([
      "MusicRecording",
      "Product",
      "BreadcrumbList",
    ]);
    const product = graph.find((item) => item["@type"] === "Product");
    const offers = product && "offers" in product ? product.offers : [];
    expect(offers).toEqual([
      expect.objectContaining({
        "@type": "Offer",
        price: "15.00",
        priceCurrency: "INR",
      }),
    ]);
    expect(graph[2]!.itemListElement).toHaveLength(3);
  });

  it("does not advertise offers for an exclusive sale", () => {
    const graph = buildTrackStructuredData({
      siteUrl: "https://beatbazaar.example",
      id: "507f1f77bcf86cd799439011",
      slug: "fixture-track",
      title: "Fixture Track",
      genre: "Hip Hop",
      key: "C",
      producerName: "Fixture Producer",
      coverUrl: null,
      soldExclusive: true,
      licenses: [trackLicense],
    })["@graph"];
    expect(graph[1].offers).toEqual([]);
  });

  it("adds FAQPage data only from the FAQ content input", () => {
    const faq = buildFaqStructuredData([
      { question: "Can I preview?", answer: "Yes, use the player." },
    ]);
    expect(faq["@type"]).toBe("FAQPage");
    expect(faq.mainEntity[0]).toMatchObject({
      "@type": "Question",
      acceptedAnswer: { "@type": "Answer" },
    });
  });

  it("sets indexing policy explicitly", () => {
    expect(getIndexRobots(false)).toEqual({ index: false, follow: true });
    expect(getIndexRobots(true)).toEqual({ index: true, follow: true });
  });
});
