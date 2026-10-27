export function bombWarningCycle(age, remaining = Infinity) {
  const urgent = Math.max(0, Math.min(1.25, 1.25 - remaining));
  return Math.max(0, age) * 2 + (4 * urgent * urgent) / 1.25;
}

export function bombWarningAlpha(age, remaining = Infinity) {
  return Math.sin(bombWarningCycle(age, remaining) * Math.PI * 2) > 0 ? 0.68 : 0;
}
