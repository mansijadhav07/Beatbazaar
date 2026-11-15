"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/tracks?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <label className="sr-only" htmlFor="track-search">
        Search tracks
      </label>
      <input
        id="track-search"
        type="search"
        placeholder="Search beats by title, tag, genre, mood or producer..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="h-11 w-full rounded-md border border-border bg-surface py-2 pl-9 pr-12 text-base text-ink placeholder:text-steel focus:border-brass focus:outline-none"
      />
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-steel" />
      <button
        type="submit"
        aria-label="Search tracks"
        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-md bg-brass text-white hover:bg-brass-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel touch-manipulation"
      >
        <Search aria-hidden="true" className="h-5 w-5" />
      </button>
    </form>
  );
}
