export function formatSurvivalTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = String(safeSeconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}
