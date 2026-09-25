import React, { useState, useEffect, useRef } from 'react';

interface TodayViewsCardProps {
  sellerId?: string;
  className?: string;
}

interface StoredViewsData {
  date: string; // YYYY-MM-DD local date
  targetMax: number; // Daily ceiling between 180 and 498
  currentViews: number; // Current accumulated views for today
  lastUpdated: number;
}

/**
 * Returns local YYYY-MM-DD string to ensure accurate midnight rollover in seller's timezone
 */
function getLocalDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates a realistic dynamic views count based on time of day (0:00 to 23:59)
 * and target maximum for the day (between 1 and 500).
 */
function calculateExpectedViewsForTime(targetMax: number): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute; // 0 to 1439

  // Daytime activity curve: low at night (0-6 AM), climbs steadily during business/shopping hours (9-22 PM)
  let progressFraction = 0.03;
  if (totalMinutes < 360) {
    // 00:00 - 06:00: very slow initial growth
    progressFraction = 0.02 + (totalMinutes / 360) * 0.08;
  } else if (totalMinutes < 720) {
    // 06:00 - 12:00: steady morning traffic
    progressFraction = 0.10 + ((totalMinutes - 360) / 360) * 0.35;
  } else if (totalMinutes < 1200) {
    // 12:00 - 20:00: peak afternoon & evening traffic
    progressFraction = 0.45 + ((totalMinutes - 720) / 480) * 0.40;
  } else {
    // 20:00 - 23:59: evening tapering towards daily target
    progressFraction = 0.85 + ((totalMinutes - 1200) / 240) * 0.14;
  }

  // Add small pseudo-random noise (+/- 4%) so it doesn't look robotic
  const jitter = (Math.sin(totalMinutes / 17) * 0.03);
  const finalFraction = Math.min(0.99, Math.max(0.01, progressFraction + jitter));
  return Math.max(1, Math.min(targetMax, Math.round(targetMax * finalFraction)));
}

/**
 * Pick a random target ceiling between 180 and 495 (within 1 to 500)
 * Fluctuates daily: "kabhi kam kabhi zayada"
 */
function generateDailyTargetMax(dateKey: string, sellerId?: string): number {
  // Use date string as a seed so it's consistent if re-calculated
  let hash = 0;
  const str = `${dateKey}_${sellerId || 'seller'}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash % 310); // 0 to 309
  // Range: 185 to 495
  return 185 + normalized;
}

export const TodayViewsCard: React.FC<TodayViewsCardProps> = ({ sellerId, className = '' }) => {
  const storageKey = `nexus_today_views_${sellerId || 'default'}`;
  const [viewsCount, setViewsCount] = useState<number>(() => {
    try {
      const today = getLocalDateKey();
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: StoredViewsData = JSON.parse(raw);
        if (parsed.date === today && typeof parsed.currentViews === 'number') {
          return parsed.currentViews;
        }
      }
      // New day or first run: initialize
      const targetMax = generateDailyTargetMax(today, sellerId);
      const initialViews = calculateExpectedViewsForTime(targetMax);
      const data: StoredViewsData = {
        date: today,
        targetMax,
        currentViews: initialViews,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      return initialViews;
    } catch {
      return 142;
    }
  });

  const activeDateRef = useRef<string>(getLocalDateKey());

  useEffect(() => {
    // 1. Midnight check & Periodic traffic increment
    const interval = setInterval(() => {
      const currentDate = getLocalDateKey();

      // Check if night 12:00 AM (midnight) has arrived and rolled over
      if (currentDate !== activeDateRef.current) {
        activeDateRef.current = currentDate;
        // Midnight reset! Start fresh for new day
        const targetMax = generateDailyTargetMax(currentDate, sellerId);
        // Start very low right after midnight (1 to 12 views)
        const resetViews = Math.floor(Math.random() * 8) + 3;
        const freshData: StoredViewsData = {
          date: currentDate,
          targetMax,
          currentViews: resetViews,
          lastUpdated: Date.now(),
        };
        try {
          localStorage.setItem(storageKey, JSON.stringify(freshData));
        } catch {}
        setViewsCount(resetViews);
        return;
      }

      // Normal daytime live traffic simulation
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed: StoredViewsData = JSON.parse(raw);
          if (parsed.date === currentDate) {
            // Natural daytime catchup or live view bump (+1 to +2 occasionally)
            const expected = calculateExpectedViewsForTime(parsed.targetMax);
            let nextVal = parsed.currentViews;

            if (nextVal < expected) {
              // Catch up smoothly
              const step = Math.min(3, Math.max(1, Math.round((expected - nextVal) / 4)));
              nextVal = Math.min(parsed.targetMax, nextVal + step);
            } else if (Math.random() > 0.45 && nextVal < parsed.targetMax) {
              // Random active visitor view (+1 or +2)
              const inc = Math.random() > 0.75 ? 2 : 1;
              nextVal = Math.min(parsed.targetMax, nextVal + inc);
            }

            if (nextVal !== parsed.currentViews) {
              parsed.currentViews = nextVal;
              parsed.lastUpdated = Date.now();
              localStorage.setItem(storageKey, JSON.stringify(parsed));
              setViewsCount(nextVal);
            }
          }
        }
      } catch {}
    }, 25000); // Check every 25 seconds for smooth real-time ticks

    return () => clearInterval(interval);
  }, [sellerId, storageKey]);

  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-100 flex flex-col items-center justify-between text-center min-h-[250px] sm:min-h-[280px] w-full transition-all hover:shadow-xl ${className}`}
    >
      {/* Top Left Title: Today Views in Blue (Matching Screenshot) */}
      <div className="w-full flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-[#1877F2] tracking-tight text-left">
          Today Views
        </h3>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live Views Active" />
      </div>

      {/* Middle Bold Metric: Large Blue Display Number (1 to 500 Range) */}
      <div className="my-auto py-3">
        <span className="text-5xl sm:text-6xl font-black text-[#1877F2] tracking-tight tabular-nums select-all">
          {viewsCount.toLocaleString()}
        </span>
      </div>

      {/* Bottom Golden Pill Badge: ★ VERIFIED ★ (Matching Screenshot) */}
      <div className="w-full flex justify-center">
        <div className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#F6C758] text-[#7A4B00] font-black text-xs sm:text-sm tracking-wider shadow-xs uppercase select-none transition-transform hover:scale-[1.02]">
          <span>★ VERIFIED ★</span>
        </div>
      </div>
    </div>
  );
};

export default TodayViewsCard;
