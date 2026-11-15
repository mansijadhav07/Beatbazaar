"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { INDIAN_LOCATIONS } from "@/lib/constants/locations";
import { CheckCircle2, AlertCircle, User, MapPin } from "lucide-react";

export default function ProducerProfileForm() {
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Maharashtra");
  const [city, setCity] = useState("Mumbai");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const availableCities =
    INDIAN_LOCATIONS.find((loc) => loc.state === state)?.cities || [];

  useEffect(() => {
    fetch("/api/producer/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setSlug(data.profile.slug || "");
          setDisplayName(data.profile.displayName || "");
          setBio(data.profile.bio || "");
          if (data.profile.location) {
            setCountry(data.profile.location.country || "India");
            setState(data.profile.location.state || "Maharashtra");
            setCity(data.profile.location.city || "Mumbai");
          }
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/producer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          displayName,
          bio,
          location: { country, state, city },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setMsg({ text: "Producer profile saved successfully." });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Save failed";
      setMsg({ text: errorMsg, error: true });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="py-8 text-xs text-steel">Loading profile details...</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {msg && (
          <div
            className={`mb-4 flex items-center gap-2 rounded p-3 text-xs ${
              msg.error
                ? "bg-status-danger-bg text-status-danger border border-status-danger/30"
                : "bg-surface-muted text-ink border border-brass/30"
            }`}
          >
            {msg.error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-status-success" />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink">Storefront Handle (Slug)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-steel">
                beatbazaar.com/
              </span>
              <Input
                required
                type="text"
                placeholder="producer-name"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "")
                      .replace(/--+/g, "-")
                  )
                }
                className="pl-32 font-mono text-xs"
              />
            </div>
            <p className="text-xs text-steel-dark">
              Unique lowercase handle for your profile URL. Hyphens and letters only.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ink">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel" />
              <Input
                required
                type="text"
                placeholder="Producer or Studio Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ink">Bio</label>
            <textarea
              rows={3}
              placeholder="Tell buyers about your sound, credits, and production style..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-ink focus:border-brass focus:outline-none"
            />
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <MapPin className="h-3.5 w-3.5 text-steel" />
              <span>Location (For local discovery and Indian regional pages)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-steel-dark">State</label>
                <select
                  value={state}
                  onChange={(e) => {
                    const nextState = e.target.value;
                    setState(nextState);
                    const firstCity =
                      INDIAN_LOCATIONS.find((l) => l.state === nextState)?.cities[0] || "";
                    setCity(firstCity);
                  }}
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-ink focus:border-brass focus:outline-none"
                >
                  {INDIAN_LOCATIONS.map((loc) => (
                    <option key={loc.state} value={loc.state}>
                      {loc.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-steel-dark">City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-ink focus:border-brass focus:outline-none"
                >
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full text-xs">
            {loading ? "Saving..." : "Save Producer Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
