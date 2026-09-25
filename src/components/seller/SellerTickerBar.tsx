import React, { useEffect, useState, useMemo } from 'react';
import {
  listenToSellerTickerItems,
  getLocalCachedTickerItems,
} from '../../services/firebaseTicker';
import { SellerTickerItem } from '../../types';
import { Handshake, Sparkles, ExternalLink, Pause, Play } from 'lucide-react';

interface SellerTickerBarProps {
  className?: string;
}

export const SellerTickerBar: React.FC<SellerTickerBarProps> = ({ className = '' }) => {
  const [tickerItems, setTickerItems] = useState<SellerTickerItem[]>(() =>
    getLocalCachedTickerItems()
  );
  const [isPaused, setIsPaused] = useState(false);

  // Subscribe to real-time Firebase updates
  useEffect(() => {
    const unsubscribe = listenToSellerTickerItems((updatedItems) => {
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

  // Duplicate items exactly 2x for the 50% CSS infinite keyframe loop
  const repeatFactor = 2;
  const marqueeItems = Array.from({ length: repeatFactor }, () => activeItems).flat();

  return (
    <div
      className={`seller-ticker-bar-dark relative w-full overflow-hidden bg-slate-950 border-b border-slate-850 z-10 select-none ${className}`}
      role="region"
      aria-label="Partner Network Announcements"
    >
      <div className="flex items-center w-full h-11 sm:h-12 px-2 sm:px-4">
        {/* Left Fixed Badge: Brand Network Indicator */}
        <div className="ticker-partners-badge flex items-center gap-1.5 pl-0.5 pr-2.5 sm:pr-3 py-1 shrink-0 z-20 bg-slate-950">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/25 text-amber-400 shadow-2xs">
            <Handshake className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase whitespace-nowrap text-amber-300">
              Partners
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="hidden sm:inline-flex items-center justify-center p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
            title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
            aria-label={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
          >
            {isPaused ? <Play className="w-3 h-3 text-amber-400" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>

        {/* Marquee Track Container: Automatically glides smoothly with normal speed */}
        <div className="flex-1 overflow-hidden relative flex items-center pointer-events-auto">
          {/* Smooth edge fades at the exact boundaries of track */}
          <div className="ticker-fade-left pointer-events-none absolute left-0 top-0 bottom-0 w-4 sm:w-8 bg-gradient-to-r from-slate-950 to-transparent z-10" />
          <div className="ticker-fade-right pointer-events-none absolute right-0 top-0 bottom-0 w-4 sm:w-8 bg-gradient-to-l from-slate-950 to-transparent z-10" />

          <div
            className={`animate-ticker-marquee flex items-center gap-3 sm:gap-4 py-1 pr-6 cursor-default select-none ${
              isPaused ? '[animation-play-state:paused]!' : ''
            }`}
          >
            {marqueeItems.map((item, idx) => {
              const isClickable = Boolean(item.externalUrl);

              const content = (
                <div
                  title={item.text ? `${item.brandName} • ${item.text}` : item.brandName}
                  className="ticker-item-pill group inline-flex items-center gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-400/40 shadow-xs transition-all duration-200 shrink-0 cursor-default"
                >
                  {/* Partner Logo */}
                  {item.logoUrl ? (
                    <div className="w-5.5 h-5.5 rounded-md bg-white p-0.5 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                      <img
                        src={item.logoUrl}
                        alt={`${item.brandName} Logo`}
                        className="w-full h-full object-contain rounded-xs"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // Fallback on image error to subtle icon
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  )}

                  {/* Brand Name */}
                  <span className="ticker-brand-text text-xs sm:text-sm font-black text-white tracking-tight group-hover:text-amber-300 transition-colors whitespace-nowrap">
                    {item.brandName}
                  </span>

                  {/* External link indicator */}
                  {isClickable && (
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
                  )}
                </div>
              );

              if (isClickable) {
                return (
                  <a
                    key={`${item.id}-${idx}`}
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus:outline-none shrink-0"
                    title={`Visit ${item.brandName} partner page`}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <div key={`${item.id}-${idx}`} className="shrink-0">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
