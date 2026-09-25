import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Info,
  Database,
  CheckCircle2,
} from 'lucide-react';
import {
  FeatureLockKey,
  FEATURE_LOCK_NAMES,
  getStoredFeatureLocks,
  setSingleFeatureLock,
  subscribeToFeatureLocks,
} from '../../services/firebaseFeatureLocks';

interface FeatureLockBannerProps {
  featureKey: FeatureLockKey;
  className?: string;
}

export const FeatureLockBanner: React.FC<FeatureLockBannerProps> = ({
  featureKey,
  className = '',
}) => {
  const [locks, setLocks] = useState(() => getStoredFeatureLocks());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToFeatureLocks((updated) => {
      setLocks(updated);
    });
  }, []);

  const isLocked = Boolean(locks.isGlobalLocked || locks[featureKey]);
  const meta = FEATURE_LOCK_NAMES[featureKey];

  const handleToggle = () => {
    const nextState = !isLocked;
    setSingleFeatureLock(featureKey, nextState);
    const msg = nextState
      ? `🔒 ${meta.name} is now LOCKED. Firestore reads & writes are paused to preserve your free tier quota.`
      : `🔓 ${meta.name} is now UNLOCKED. Live Firestore reads & writes are active.`;
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className={`mb-6 select-none ${className}`}>
      <div
        className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
          isLocked
            ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/40 text-emerald-100'
            : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/50 text-amber-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status info */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isLocked
                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-400/30 text-amber-400 animate-pulse'
              }`}
            >
              {isLocked ? (
                <Lock className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Unlock className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/10">
                  {meta.name}
                </span>

                {isLocked ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    LOCKED (Firebase Free-Tier Saver Active)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <Zap className="w-3.5 h-3.5" />
                    UNLOCKED (Live Database Sync Mode)
                  </span>
                )}

                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                  {isLocked ? '0 Reads • 0 Writes' : 'Real-time Read/Write Active'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {isLocked
                  ? 'Is option ko lock rakha gaya he ta ke Firestore database bar bar read/write na ho aur free tier quota mehfooz rahe. Data local fast cache se chal raha he.'
                  : 'Abhi Live database read/write active he. Jab aap tabdeeli kar lein to Lock dabakar database quota bacha lein.'}
              </p>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleToggle}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${
                isLocked
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black border border-amber-300 hover:shadow-amber-400/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black border border-emerald-400 hover:shadow-emerald-500/20'
              }`}
            >
              {isLocked ? (
                <>
                  <Unlock className="w-4 h-4 stroke-[2.4]" />
                  <span>Unlock to Edit & Sync</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 stroke-[2.4]" />
                  <span>Lock Now (Save Quota)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Temporary Feedback notification */}
        {toastMsg && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs font-semibold text-white animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
