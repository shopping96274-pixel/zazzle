import React, { useEffect, useState, useMemo } from 'react';
import {
  listenToPublicProductTickerItems,
  getLocalCachedPublicTickerItems,
} from '../../services/firebasePublicTicker';
import { PublicProductTickerItem } from '../../types';
import { Flame, Sparkles, Smartphone, Laptop, Cpu, Pause, Play } from 'lucide-react';

interface PublicProductTickerBarProps {
  className?: string;
}

export const PublicProductTickerBar: React.FC<PublicProductTickerBarProps> = ({
  className = '',
}) => {
  const [tickerItems, setTickerItems] = useState<PublicProductTickerItem[]>(() =>
    getLocalCachedPublicTickerItems()
  );
  const [isPaused, setIsPaused] = useState(false);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    const unsubscribe = listenToPublicProductTickerItems((updatedItems) => {
      setTickerItems(updatedItems);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter only active items and sort by order
  const activeItems = useMemo(() => {
    return tickerItems
      .filter((item) => item.status === 'active')
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }, [tickerItems]);

  if (activeItems.length === 0) {
    return null;
  }

  // Duplicate items 2x for the seamless 50% infinite keyframe loop
  const marqueeItems = [...activeItems, ...activeItems];

  // Helper to pick category icon
  const getCategoryIcon = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('phone') || lower.includes('tablet')) {
      return <Smartphone className="w-3 h-3 text-amber-400 shrink-0" />;
    }
    if (lower.includes('laptop') || lower.includes('pc') || lower.includes('macbook')) {
      return <Laptop className="w-3 h-3 text-sky-400 shrink-0" />;
    }
    if (lower.includes('graphic') || lower.includes('gpu') || lower.includes('card')) {
      return <Cpu className="w-3 h-3 text-emerald-400 shrink-0" />;
    }
    return <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />;
  };

  return (
    <div
      id="public-product-ticker-bar"
      className={`relative w-full overflow-hidden bg-slate-950/95 border-y border-slate-800/90 select-none z-20 ${className}`}
      role="region"
      aria-label="Featured Hardware & Products Announcement Ticker"
    >
      <div className="flex items-center w-full h-8.5 sm:h-9.5 px-2 sm:px-4">
        {/* Left Fixed Badge: Unclickable Indicator & Brand Label */}
        <div className="flex items-center gap-1.5 pl-0.5 pr-2 sm:pr-2.5 py-0.5 shrink-0 z-20 bg-slate-950/95 border-r border-slate-800/80">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 text-amber-400 shadow-2xs">
            <Flame className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black tracking-wider uppercase whitespace-nowrap text-amber-300">
              Hot Picks
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="hidden sm:inline-flex items-center justify-center p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
            title={isPaused ? 'Resume scroll' : 'Pause scroll'}
            aria-label={isPaused ? 'Resume scroll' : 'Pause scroll'}
          >
            {isPaused ? <Play className="w-2.5 h-2.5 text-amber-400" /> : <Pause className="w-2.5 h-2.5" />}
          </button>
        </div>

        {/* Marquee Track Container: Smooth auto-glide, COMPLETELY UNCLICKABLE */}
        <div className="flex-1 overflow-hidden relative flex items-center">
          {/* Smooth edge fades at the exact boundaries */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 sm:w-8 bg-gradient-to-r from-slate-950 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 sm:w-8 bg-gradient-to-l from-slate-950 to-transparent z-10" />

          {/* Marquee Row: STRICTLY UNCLICKABLE (pointer-events-none, cursor-default) */}
          <div
            className={`animate-ticker-marquee flex items-center gap-2 sm:gap-3 py-0.5 pr-6 cursor-default select-none pointer-events-none ${
              isPaused ? '[animation-play-state:paused]!' : ''
            }`}
          >
            {marqueeItems.map((item, idx) => {
              return (
                <div
                  key={`${item.id}-${idx}`}
                  className="inline-flex items-center gap-2 px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-900/90 border border-slate-800/90 shadow-2xs shrink-0 select-none cursor-default"
                >
                  {/* Product Thumbnail Image */}
                  {item.imageUrl ? (
                    <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-slate-950 p-0.5 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover rounded"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                      {getCategoryIcon(item.category)}
                    </div>
                  )}

                  {/* Badge Tag */}
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                      {item.badge}
                    </span>
                  )}

                  {/* Category Pill */}
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium shrink-0">
                    {getCategoryIcon(item.category)}
                    <span>{item.category}</span>
                    <span className="text-slate-600">•</span>
                  </span>

                  {/* Product Title */}
                  <span className="text-xs sm:text-[13px] font-bold text-slate-100 whitespace-nowrap">
                    {item.title}
                  </span>

                  {/* Price */}
                  {item.price && (
                    <div className="flex items-center gap-1.5 shrink-0 pl-0.5">
                      <span className="text-xs sm:text-[13px] font-black text-amber-400 whitespace-nowrap">
                        {item.price}
                      </span>
                      {item.originalPrice && (
                        <span className="text-[10px] text-slate-500 line-through whitespace-nowrap hidden sm:inline">
                          {item.originalPrice}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Highlight Specs Tag */}
                  {item.highlightText && (
                    <span className="hidden lg:inline-block text-[10px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800/80 whitespace-nowrap font-medium">
                      {item.highlightText}
                    </span>
                  )}

                  {/* Subtle Separator Dot */}
                  <span className="text-slate-600 text-xs pl-1 select-none">•</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
