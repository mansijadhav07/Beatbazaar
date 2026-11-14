import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getTrackById } from "@/server/catalog/repository";
import { siteConfig } from "@/config/site";
import { buildTrackOpenGraphData } from "@/lib/track-open-graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Beat artwork and licensing information";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id } = await params;
  const track = await getTrackById(id);
  if (!track || ["draft", "pending", "rejected", "removed"].includes(track.status)) {
    notFound();
  }

  const coverUrl = track.coverKey
    ? `${siteConfig.publicR2Domain}/${track.coverKey.replace(/^\/+/, "")}`
    : null;
  let coverSource: string | null = null;
  if (coverUrl) {
    const response = await fetch(coverUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(`Could not load track cover for social image (${response.status}).`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      throw new Error("Track cover response is not an image.");
    }
    const imageBytes = await response.arrayBuffer();
    coverSource = `data:${contentType};base64,${Buffer.from(imageBytes).toString("base64")}`;
  }

  const content = buildTrackOpenGraphData({
    title: track.title,
    producerName: track.producerName,
    genre: track.genre,
    bpm: track.bpm,
    coverUrl,
    licenses: track.licenses.map((license) => ({
      enabled: license.enabled,
      termsText: license.termsText,
      price: {
        amount: license.price.amount,
        currency: license.price.currency,
      },
    })),
  });

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          gap: 48,
          padding: 48,
          backgroundColor: "#2C3947",
          color: "#FFFFFF",
          fontFamily: "Arial",
        }}
      >
        {coverSource ? (
          <img
            src={coverSource}
            alt={`${content.title} cover artwork`}
            width={500}
            height={500}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: 500,
              height: 500,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#547A95",
              color: "#FFFFFF",
              fontSize: 36,
            }}
          >
            {siteConfig.name}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flex: 1,
            height: "100%",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "12px 0",
          }}
        >
          <div style={{ fontSize: 24, color: "#C2A56D" }}>{siteConfig.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                maxHeight: 180,
                overflow: "hidden",
                fontSize: 48,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {content.title}
            </div>
            <div style={{ fontSize: 26 }}>{content.producerLabel}</div>
            <div style={{ fontSize: 20, color: "#E8EDF2" }}>
              {content.genre} · {content.bpm} BPM
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>{content.priceLabel}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
