import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Download,
  Headphones,
  Plus,
  ScrollText,
} from "lucide-react";
import { BeatCard, type BeatCardTrack } from "@/components/catalog/BeatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { HeroShowcase } from "@/components/home/HeroShowcase";
import { NumberTicker } from "@/components/motion/number-ticker";
import { siteConfig } from "@/config/site";
import {
  getProducerDirectoryEntries,
  getPublicHomeCatalog,
} from "@/server/catalog/repository";
import type { ITrack } from "@/server/db/models/Track";
import { slugifyPublicLabel } from "@/lib/public-catalog";
import { getVisibleHomeSections } from "@/lib/home-catalog";
import { getPublicAssetUrl } from "@/lib/public-asset-url";
import { serializeJsonLd } from "@/lib/json-ld";
import "./home.css";

export const metadata: Metadata = {
  title: `${siteConfig.name} | Original beats and licenses`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const defaultGenres = [
  "Trap",
  "Hip Hop",
  "Drill",
  "R&B",
  "Lo-fi",
  "Afrobeats",
  "Punjabi",
  "Bollywood",
  "Electronic",
  "Pop",
];

const faqs = [
  {
    question: "Can I listen before I buy?",
    answer:
      "Yes. Every beat has a free preview. Previews carry an audio tag so the original files stay with the producer until you license them.",
  },
  {
    question: "What do I get with a license?",
    answer:
      "Each producer sets the files, usage rights and price for their own beats. The listing shows the exact files and terms for every tier before you pay.",
  },
  {
    question: "When can I download my files?",
    answer:
      "As soon as the payment is verified. Your files sit on the order page, and you can sign in and download them again whenever you need.",
  },
  {
    question: "What happens when someone buys an exclusive?",
    answer:
      "The beat comes off sale and its other licenses are withdrawn. Anything already purchased stays valid for the buyer who paid for it.",
  },
  {
    question: "What if something goes wrong with my order?",
    answer:
      "Read the refund policy for what is covered, then contact support with your order number.",
  },
];

function toBeatCardTrack(
  track: ITrack,
  producerUsername?: string,
  producerName?: string
): BeatCardTrack {
  const license = track.licenses
    .filter(
      (item) =>
        item.enabled &&
        item.price.currency === "INR" &&
        item.termsText.trim()
    )
    .sort((left, right) => left.price.amount - right.price.amount)[0];
  return {
    id: track._id.toString(),
    title: track.title,
    slug: track.slug,
    genre: track.genre,
    bpm: track.bpm,
    coverKey: track.coverKey,
    producerName: producerName || track.producerName,
    producerUsername,
    waveform: track.waveform,
    previewKey: track.files.find((file) => file.kind === "preview")?.r2Key,
    lowestPriceAmount: license?.price.amount ?? null,
    lowestPriceCurrency: license?.price.currency ?? "INR",
    playCount: track.playCount,
  };
}

function SectionHeading({
  id,
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="font-data text-xs uppercase tracking-[0.18em] text-brass-light">{eyebrow}</p>
        <h2
          id={id}
          className="mt-2 font-display text-2xl font-black leading-tight text-ink sm:text-3xl"
        >
          {title}
        </h2>
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-brass-light"
        >
          {linkLabel}
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
          />
        </Link>
      ) : null}
    </div>
  );
}

export default async function HomePage() {
  const catalog = await getPublicHomeCatalog();
  const seen = new Set<string>();
  const allTracks = [...catalog.featured, ...catalog.trending, ...catalog.newest].filter(
    (track) => {
      const id = track._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }
  );
  const producers = await getProducerDirectoryEntries([
    ...new Set(allTracks.map((track) => track.producerId)),
  ]);
  const toCard = (track: ITrack) => {
    const producer = producers.get(track.producerId);
    return toBeatCardTrack(track, producer?.username, producer?.displayName);
  };
  const showcase = allTracks.slice(0, 4).map(toCard);
  const sections = getVisibleHomeSections(catalog);
  const totalBeats = catalog.genres.reduce((sum, genre) => sum + genre.count, 0);
  const genreLabels = catalog.genres.length
    ? catalog.genres.map((genre) => genre.label)
    : defaultGenres;
  const marqueeLabels = Array.from(
    { length: Math.max(genreLabels.length, 10) },
    (_, index) => genreLabels[index % genreLabels.length]
  );
  const leadProducer = [...producers.values()][0];
  const downloadMinutes = Math.max(1, Math.round(siteConfig.downloadLinkExpirySeconds / 60));

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="home-stage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />

      <section
        aria-labelledby="home-title"
        className="mx-auto grid w-full max-w-container grid-cols-[minmax(0,1fr)] gap-10 px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:px-8 lg:pb-20 lg:pt-16"
      >
        <div className="hero-enter min-w-0">
          <p className="inline-flex items-center gap-2 border border-border-strong px-3 py-1 font-data text-xs uppercase tracking-[0.16em] text-brass-light">
            <span aria-hidden="true" className="pulse-dot h-1.5 w-1.5 rounded-full bg-brass-light" />
            Original beats by {siteConfig.name}
          </p>
          <h1
            id="home-title"
            className="mt-5 font-display text-[1.75rem] font-black leading-[1.12] tracking-[-0.04em] text-ink sm:text-[2.5rem]"
          >
            Original beats for your next release
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-steel-dark sm:text-lg">
            Preview every beat free, compare the license terms, and download your files
            the moment payment clears.
          </p>
          <form action="/tracks" method="GET" className="mt-7 flex w-full max-w-xl items-center gap-2">
            <label htmlFor="home-search" className="sr-only">
              Search by genre, mood, artist, or type beat
            </label>
            <Input
              id="home-search"
              name="q"
              type="search"
              placeholder="Try &quot;dark trap&quot; or &quot;Arijit type beat&quot;"
              className="min-w-0 flex-1 border-border-strong bg-surface-muted"
            />
            <Button type="submit">Search</Button>
          </form>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Suggested searches">
            {genreLabels.slice(0, 5).map((label) => (
              <li key={label}>
                <Link
                  href={`/tracks?q=${encodeURIComponent(`${label} type beat`)}`}
                  className="inline-flex min-h-9 items-center border border-border px-3 text-sm text-steel-dark hover:border-brass-light hover:text-ink"
                >
                  {label} type beat
                </Link>
              </li>
            ))}
          </ul>
          <dl className="mt-9 grid max-w-xl grid-cols-3 gap-4 border-t border-border pt-5">
            <div>
              <dt className="text-xs text-steel-dark">Beats on sale</dt>
              <dd className="mt-1 font-display text-2xl font-black text-ink">
                <NumberTicker value={totalBeats} locale />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-steel-dark">Genres</dt>
              <dd className="mt-1 font-display text-2xl font-black text-ink">
                <NumberTicker value={catalog.genres.length} locale />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-steel-dark">License tiers</dt>
              <dd className="mt-1 font-display text-2xl font-black text-ink">
                <NumberTicker value={3} />
              </dd>
            </div>
          </dl>
        </div>
        <HeroShowcase tracks={showcase} />
      </section>

      <section aria-label="Genres" className="border-y border-border bg-band-dark py-4">
        <div className="marquee" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee-track">
              {marqueeLabels.map((label, labelIndex) => (
                <span
                  key={`${copy}-${labelIndex}`}
                  className="flex items-center gap-8 whitespace-nowrap font-display text-xl font-black uppercase tracking-tight text-ink/80"
                >
                  {label}
                  <span className="h-2 w-2 rotate-45 bg-brass" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-container flex-col gap-16 px-4 py-14 sm:gap-24 sm:px-6 sm:py-20 lg:px-8">
        {sections.map((section) => (
          <ScrollReveal key={section.title}>
            <section aria-labelledby={`${slugifyPublicLabel(section.title)}-heading`} className="space-y-6">
              <SectionHeading
                id={`${slugifyPublicLabel(section.title)}-heading`}
                eyebrow="Listen"
                title={section.title}
                href="/tracks"
                linkLabel="Browse all beats"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {section.tracks.map((track) => (
                  <BeatCard key={track._id.toString()} track={toCard(track)} />
                ))}
              </div>
            </section>
          </ScrollReveal>
        ))}

        {catalog.genres.length > 0 ? (
          <ScrollReveal>
            <section aria-labelledby="home-genres-heading" className="space-y-6">
              <SectionHeading
                id="home-genres-heading"
                eyebrow="Genres"
                title="Browse by genre"
                href="/tracks"
                linkLabel="All beats"
              />
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {catalog.genres.map(({ label, count }, index) => (
                  <li key={label}>
                    <Link
                      href={`/beats/genre/${slugifyPublicLabel(label)}`}
                      className="lift group flex min-h-24 flex-col justify-between border border-border bg-surface-muted p-4"
                    >
                      <span className="font-data text-xs text-brass-light">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex items-end justify-between gap-2">
                        <span className="font-display text-lg font-bold text-ink">{label}</span>
                        <span className="font-data text-xs text-steel-dark">
                          {count} {count === 1 ? "beat" : "beats"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </ScrollReveal>
        ) : null}

        <ScrollReveal>
        <section aria-labelledby="home-how-heading" className="border border-border-strong bg-band p-6 sm:p-10">
          <SectionHeading id="home-how-heading" eyebrow="How it works" title="From preview to release" />
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              [Headphones, "Find a sound", "Search the catalog by genre, mood, BPM or an artist's type beat, and play any preview."],
              [ScrollText, "Pick a license", "Free, non-exclusive or exclusive. Files, rights and price are written out before you buy."],
              [Download, "Download after checkout", `Pay by UPI, card or net banking. Files unlock when payment is verified, with ${downloadMinutes} minute signed links.`],
            ].map(([Icon, title, body], index) => {
              const StepIcon = Icon as typeof Headphones;
              return (
                <li key={title as string} className="border-t border-border-strong pt-5">
                  <div className="flex items-center justify-between">
                    <StepIcon aria-hidden="true" className="h-6 w-6 text-brass-light" />
                    <span className="font-data text-xs text-steel-dark">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-ink">{title as string}</h3>
                  <p className="mt-2 text-base leading-7 text-steel-dark">{body as string}</p>
                </li>
              );
            })}
          </ol>
        </section>
        </ScrollReveal>

        <ScrollReveal>
        <section aria-labelledby="home-license-heading" className="space-y-6">
          <SectionHeading
            id="home-license-heading"
            eyebrow="Licenses"
            title="Choose the license that fits"
            href="/license-overview"
            linkLabel="Compare in detail"
          />
          <ul className="grid gap-3 md:grid-cols-3">
            {[
              ["Free", "Preview and use with credit", "No payment. The producer's terms still apply, including credit and limits on use."],
              ["Non-exclusive", "License a beat others can license too", "Files, price and usage rights vary by beat. The listing shows them in full."],
              ["Exclusive", "Take the beat off the market", "When an exclusive sale completes, the beat leaves sale and its other licenses are withdrawn."],
            ].map(([tier, line, body], index) => (
              <li
                key={tier}
                className={`lift flex flex-col border p-6 ${
                  index === 2 ? "border-brass bg-band" : "border-border bg-surface-muted"
                }`}
              >
                <p className="font-data text-xs uppercase tracking-[0.16em] text-brass-light">{line}</p>
                <h3 className="mt-3 font-display text-2xl font-black text-ink">{tier}</h3>
                <p className="mt-3 text-base leading-7 text-steel-dark">{body}</p>
              </li>
            ))}
          </ul>
        </section>
        </ScrollReveal>

        {leadProducer ? (
          <section
            aria-labelledby="home-producers-heading"
            className="grid gap-6 border border-border bg-surface-muted p-6 sm:p-10 md:grid-cols-[auto_1fr_auto] md:items-center"
          >
            <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brass font-display text-3xl font-black text-white">
              {leadProducer.avatarKey ? (
                <Image
                  src={getPublicAssetUrl(leadProducer.avatarKey)}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                leadProducer.displayName.slice(0, 1).toUpperCase()
              )}
            </span>
            <div>
              <p className="font-data text-xs uppercase tracking-[0.18em] text-brass-light">The producer</p>
              <h2
                id="home-producers-heading"
                className="mt-2 font-display text-xl font-black text-ink sm:text-2xl"
              >
                Every beat here is made by {leadProducer.displayName}
              </h2>
              <p className="mt-2 text-base leading-7 text-steel-dark">
                {[leadProducer.city, leadProducer.state].filter(Boolean).join(", ") || "India"}
              </p>
            </div>
            <Button asChild variant="outline" size="lg">
              <Link href={`/producer/${leadProducer.username}`}>View the producer page</Link>
            </Button>
          </section>
        ) : null}

        <ScrollReveal>
        <section aria-labelledby="home-faq-heading" className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <SectionHeading id="home-faq-heading" eyebrow="FAQ" title="Before you buy" />
            <p className="mt-4 max-w-sm text-base leading-7 text-steel-dark">
              Short answers on previews, licenses and downloads. The full policies are linked in the footer.
            </p>
          </div>
          <div className="border-t border-border">
            {faqs.map((item) => (
              <details key={item.question} className="faq-item border-b border-border">
                <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 font-display text-base font-bold text-ink">
                  {item.question}
                  <Plus aria-hidden="true" className="faq-chevron h-5 w-5 shrink-0 text-brass-light" />
                </summary>
                <p className="pb-5 pr-8 text-base leading-7 text-steel-dark">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
        </ScrollReveal>

        <section
          aria-labelledby="home-producer-heading"
          className="relative grid gap-6 overflow-hidden border border-brass bg-band p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div className="cta-bars" aria-hidden="true">
            {[55, 80, 40, 95, 60, 75, 35, 90, 50, 70, 45, 85, 62, 38, 78, 52, 92, 44, 68, 58].map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="relative">
            <p className="font-data text-xs uppercase tracking-[0.18em] text-brass-light">Ready when you are</p>
            <h2
              id="home-producer-heading"
              className="mt-2 font-display text-xl font-black text-ink sm:text-2xl"
            >
              Found a sound? Pick a license and download
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-steel-dark">
              Questions about which license suits your release? Ask before you buy.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/tracks">Browse beats</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">Contact</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
