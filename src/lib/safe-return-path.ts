const RETURN_PATH_ORIGIN = "https://return-path.invalid";

export function getSafeReturnPath(
  candidate: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!candidate) return fallback;

  try {
    const url = new URL(candidate, RETURN_PATH_ORIGIN);
    if (url.origin !== RETURN_PATH_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
