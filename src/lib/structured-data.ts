import type { ILicenseOption } from "@/server/db/models/Track";

export function buildSiteStructuredData(
  siteUrl: string,
  name: string,
  description: string
) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name,
        url: siteUrl,
        areaServed: { "@type": "Country", name: "India" },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name,
        description,
        url: siteUrl,
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/tracks?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function buildTrackStructuredData(input: {
  siteUrl: string;
  id: string;
  slug: string;
  title: string;
  genre: string;
  key: string;
  producerName: string;
  producerUsername?: string;
  coverUrl: string | null;
  soldExclusive: boolean;
  licenses: ILicenseOption[];
}) {
  const url = `${input.siteUrl}/track/${input.id}/${input.slug}`;
  const offers = input.soldExclusive
    ? []
    : input.licenses
        .filter(
          (license) =>
            license.enabled &&
            license.price.currency === "INR" &&
            Boolean(license.termsText?.trim())
        )
        .map((license) => ({
          "@type": "Offer",
          name: license.name,
          price: (license.price.amount / 100).toFixed(2),
          priceCurrency: license.price.currency,
          availability: "https://schema.org/InStock",
          url,
        }));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicRecording",
        "@id": `${url}#audio`,
        name: input.title,
        genre: input.genre,
        byArtist: {
          "@type": "MusicGroup",
          name: input.producerName,
          ...(input.producerUsername
            ? { url: `${input.siteUrl}/producer/${input.producerUsername}` }
            : {}),
        },
        image: input.coverUrl,
        inLanguage: "en-IN",
      },
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: `${input.title} (License & Audio)`,
        description: `License options and included files for ${input.title}.`,
        image: input.coverUrl,
        offers,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: input.siteUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "Tracks",
            item: `${input.siteUrl}/tracks`,
          },
          { "@type": "ListItem", position: 3, name: input.title, item: url },
        ],
      },
    ],
  };
}

export function buildFaqStructuredData(
  questions: ReadonlyArray<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function getIndexRobots(indexable: boolean) {
  return indexable
    ? { index: true, follow: true }
    : { index: false, follow: true };
}
