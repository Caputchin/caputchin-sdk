export function pickFromGamesAttr(csv: string): string | null {
  const ids = csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return null;
  return ids[Math.floor(Math.random() * ids.length)]!;
}
