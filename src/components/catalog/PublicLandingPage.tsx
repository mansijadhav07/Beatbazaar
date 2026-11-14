import Link from "next/link";
import { BeatCard, type BeatCardTrack } from "@/components/catalog/BeatCard";
import { buildLandingJsonLd } from "@/lib/public-catalog";
import { serializeJsonLd } from "@/lib/json-ld";
import { siteConfig } from "@/config/site";
import type { PublicLandingSnapshot } from "@/lib/public-catalog";

function cardFromLandingTrack(
  track: PublicLandingSnapshot["tracks"][number]
): BeatCardTrack {
  return {
    id: track.id,
    title: track.title,
    slug: track.slug,
    genre: track.genre,
    bpm: track.bpm,
    coverKey: track.coverKey,
    producerName: track.producerName,
    producerUsername: track.producerUsername,
    waveform: track.waveform,
    previewKey: track.previewKey,
    lowestPriceAmount: track.lowestPriceAmount,
    lowestPriceCurrency: "INR",
    playCount: track.playCount,
  };
}

function scopeLabel(snapshot: PublicLandingSnapshot): string {
  if (snapshot.path.startsWith("/producers/")) {
    return `Producers in ${snapshot.label}`;
  }
  if (snapshot.path.startsWith("/beats/in/")) {
    return `Beats from ${snapshot.label}`;
  }
  return `${snapshot.label} beats`;
}

export function PublicLandingPage({
  snapshot,
}: {
  snapshot: PublicLandingSnapshot;
}) {
  const indexableCount = snapshot.path.startsWith("/producers/")
    ? snapshot.producers.length
    : snapshot.trackCount;
  const indexable = indexableCount >= snapshot.threshold;
  const jsonLd = buildLandingJsonLd(snapshot, siteConfig.url);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-steel-dark">
          <ol className="flex flex-wrap gap-2">
            <li><Link href="/" className="underline-offset-4 hover:underline">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/tracks" className="underline-offset-4 hover:underline">Beats</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{scopeLabel(snapshot)}</li>
          </ol>
        </nav>

        <header className="max-w-3xl border-b border-border pb-7">
          <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {scopeLabel(snapshot)}
          </h1>
          {snapshot.path.startsWith("/producers/") ? (
            <p className="mt-4 text-base leading-7 text-ink">
              {snapshot.producers.length} producers with published beats in {snapshot.label}.
              {snapshot.trackCount > 0
                ? ` Their catalog includes ${snapshot.trackCount} live beats.`
                : " There are no live beats in this location yet."}
            </p>
          ) : (
            <p className="mt-4 text-base leading-7 text-ink">
              {snapshot.trackCount} live beats{snapshot.producerCount > 0
                ? ` from ${snapshot.producerCount} producers`
                : ""} in this catalog.
            </p>
          )}
          {indexable && (
            <p className="mt-2 text-sm text-steel-dark">
              Catalog data reflects published listings and producer profile locations.
            </p>
          )}
        </header>

        <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
          <section aria-labelledby="landing-beats-heading">
            <h2 id="landing-beats-heading" className="mb-4 text-xl font-semibold text-ink">
              {snapshot.path.startsWith("/producers/")
                ? "Beats from this area"
                : "Top beats"}
            </h2>
            {snapshot.tracks.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {snapshot.tracks.map((track, index) => (
                  <BeatCard
                    key={track.id}
                    track={cardFromLandingTrack(track)}
                    priority={index === 0}
                  />
                ))}
              </div>
            ) : (
              <p className="bg-surface-muted p-5 text-base text-ink">
                There are no live beats for this listing yet.
              </p>
            )}
          </section>

          <aside className="space-y-8">
            {snapshot.path.startsWith("/producers/") && (
              <section aria-labelledby="landing-producers-heading">
                <h2 id="landing-producers-heading" className="mb-3 text-xl font-semibold text-ink">
                  Producers
                </h2>
                {snapshot.producers.length > 0 ? (
                  <ul className="space-y-2">
                    {snapshot.producers.map((producer) => (
                      <li key={producer.username}>
                        <Link
                          href={`/producer/${producer.username}`}
                          className="text-base font-medium text-ink underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
                        >
                          {producer.displayName}
                        </Link>
                        <p className="text-sm text-steel-dark">
                          {producer.city}, {producer.state}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-base text-ink">No producers with live beats are listed here.</p>
                )}
              </section>
            )}

            {snapshot.commonGenres.length > 0 && (
              <section aria-labelledby="landing-genres-heading">
                <h2 id="landing-genres-heading" className="mb-3 text-xl font-semibold text-ink">
                  Common genres
                </h2>
                <ul className="space-y-2 text-base text-ink">
                  {snapshot.commonGenres.map((entry) => (
                    <li key={entry.label} className="flex justify-between gap-4">
                      <span>{entry.label}</span>
                      <span className="text-steel-dark">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {snapshot.commonLanguages.length > 0 && (
              <section aria-labelledby="landing-languages-heading">
                <h2 id="landing-languages-heading" className="mb-3 text-xl font-semibold text-ink">
                  Common languages
                </h2>
                <ul className="space-y-2 text-base text-ink">
                  {snapshot.commonLanguages.map((entry) => (
                    <li key={entry.label} className="flex justify-between gap-4">
                      <span>{entry.label}</span>
                      <span className="text-steel-dark">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
