export type AdminSearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 25;

export function queryString(
  params: AdminSearchParams,
  key: string,
  maxLength = 100
): string {
  const value = params[key];
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function queryPage(params: AdminSearchParams): number {
  const page = Number.parseInt(queryString(params, "page", 6), 10);
  return Number.isInteger(page) && page > 0 ? Math.min(page, 100_000) : 1;
}

export function pageSize(): number {
  return PAGE_SIZE;
}

export function validDateParam(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return undefined;
  }
  return date;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function pageFilters(
  params: AdminSearchParams,
  allowedKeys: readonly string[]
): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const key of allowedKeys) {
    const value = queryString(params, key);
    if (value) filters[key] = value;
  }
  return filters;
}
