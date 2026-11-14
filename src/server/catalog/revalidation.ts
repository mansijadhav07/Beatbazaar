import "server-only";

import { revalidatePath } from "next/cache";

export function revalidatePublicTrack(trackId: string, slug?: string): void {
  if (slug) revalidatePath(`/track/${trackId}/${slug}`);
  revalidatePath("/track/[id]/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/tracks");
  revalidatePath("/sitemap.xml");
  revalidatePath("/sitemaps/tracks.xml");
  revalidatePath("/sitemaps/landings.xml");
  revalidatePath("/beats/genre/[genre]", "page");
  revalidatePath("/beats/language/[language]", "page");
  revalidatePath("/beats/in/[city]", "page");
}

export function revalidatePublicProducerProfile(
  username: string,
  previousUsername?: string
): void {
  revalidatePath(`/producer/${username}`);
  if (previousUsername && previousUsername !== username) {
    revalidatePath(`/producer/${previousUsername}`);
  }
  revalidatePath("/producer/[username]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/sitemaps/producers.xml");
  revalidatePath("/sitemaps/landings.xml");
  revalidatePath("/producers/in/[location]", "page");
  revalidatePath("/beats/in/[city]", "page");
}
