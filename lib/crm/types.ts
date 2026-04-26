export type RowData = Record<string, unknown>;

export const asText = (value: unknown, fallback = "-"): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return fallback;
};

export const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

export const pickField = (
  row: RowData,
  candidates: string[],
  fallback: unknown = undefined,
): unknown => {
  for (const key of candidates) {
    if (key in row && row[key] !== null && row[key] !== undefined) {
      return row[key];
    }
  }
  return fallback;
};
