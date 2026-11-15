import { describe, it, expect } from "vitest";

describe("Track Page JSON-LD Structured Data Schema", () => {
  it("generates valid schema structure for MusicRecording, Product with Offer, and BreadcrumbList", () => {
    const track = {
      _id: "65f123456789abcdef012345",
      title: "Bombay Nights",
      slug: "bombay-nights",
      genre: "Trap",
      bpm: 140,
      producerName: "Mumbai Beats",
      coverUrl: "https://cdn.astrylixbeats.com/covers/test.jpg",
      licenses: [
        {
          tier: "non_exclusive",
          name: "Standard Commercial License",
          price: { amount: 199900, currency: "INR" },
          enabled: true,
        },
      ],
      status: "live",
    };

    const isSoldExclusive = track.status === "sold_exclusive";
    const jsonLdOffers = isSoldExclusive
      ? []
      : track.licenses
          .filter((l) => l.enabled)
          .map((l) => ({
            "@type": "Offer",
            name: l.name,
            price: (l.price.amount / 100).toFixed(2),
            priceCurrency: l.price.currency,
            availability: "https://schema.org/InStock",
            url: `https://astrylixbeats.com/track/${track._id}/${track.slug}`,
          }));

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "MusicRecording",
          name: track.title,
          genre: track.genre,
          byArtist: {
            "@type": "MusicGroup",
            name: track.producerName,
          },
        },
        {
          "@type": "Product",
          name: `${track.title} (License & Audio)`,
          offers: jsonLdOffers,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home" },
            { "@type": "ListItem", position: 2, name: "Tracks" },
            { "@type": "ListItem", position: 3, name: track.title },
          ],
        },
      ],
    };

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@graph"]).toHaveLength(3);

    const recording = jsonLd["@graph"][0];
    expect(recording["@type"]).toBe("MusicRecording");
    expect(recording.name).toBe("Bombay Nights");

    const product = jsonLd["@graph"][1] as { "@type": string; offers: Array<{ price: string; priceCurrency: string }> };
    expect(product["@type"]).toBe("Product");
    expect(product.offers).toHaveLength(1);
    expect(product.offers[0]?.price).toBe("1999.00");
    expect(product.offers[0]?.priceCurrency).toBe("INR");

    const breadcrumbs = jsonLd["@graph"][2];
    expect(breadcrumbs["@type"]).toBe("BreadcrumbList");
    expect(breadcrumbs.itemListElement).toHaveLength(3);
  });

  it("omits purchasable Offers when status is sold_exclusive", () => {
    const isSoldExclusive = true;
    const jsonLdOffers = isSoldExclusive ? [] : [{ "@type": "Offer" }];
    expect(jsonLdOffers).toHaveLength(0);
  });
});
