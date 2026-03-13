/**
 * Dynamic counter that grows deterministically based on time.
 * Base: 2847 (set on March 13, 2026).
 * Growth: ~45-55 per day (seeded randomish but deterministic per day).
 */

const BASE_COUNT = 2847;
const BASE_DATE = new Date("2026-03-13T00:00:00Z").getTime();
const DAILY_MIN = 38;
const DAILY_MAX = 62;

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export function getAnalyzedCount(): number {
  const now = Date.now();
  const daysPassed = Math.floor((now - BASE_DATE) / (24 * 60 * 60 * 1000));

  let total = BASE_COUNT;
  for (let d = 0; d <= daysPassed; d++) {
    const dailyGrowth = DAILY_MIN + Math.floor(seededRandom(d) * (DAILY_MAX - DAILY_MIN));
    total += dailyGrowth;
  }

  // Add partial day growth based on current hour
  const hoursInDay = new Date().getHours();
  const todayGrowth = DAILY_MIN + Math.floor(seededRandom(daysPassed + 1) * (DAILY_MAX - DAILY_MIN));
  total += Math.floor((hoursInDay / 24) * todayGrowth);

  return total;
}

export function formatCount(n: number): string {
  return n.toLocaleString("pt-BR");
}
