/** Collapse long-tail entries into an "Other" bucket for chart readability. */
export function bucketTopN<T extends string>(
  breakdown: Record<T, number> | Record<string, number>,
  limit: number,
  otherLabel = "Other",
): Record<string, number> {
  const entries = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length <= limit) {
    return Object.fromEntries(entries);
  }

  const top = entries.slice(0, limit);
  const rest = entries.slice(limit).reduce((sum, [, count]) => sum + count, 0);
  return Object.fromEntries([...top, [otherLabel, rest]]);
}
