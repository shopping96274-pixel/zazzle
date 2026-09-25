import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  X,
  Database,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';
import {
  FeatureLockKey,
  FEATURE_LOCK_NAMES,
  FeatureLockSettings,
  getStoredFeatureLocks,
  setSingleFeatureLock,
  setAllFeaturesLock,
  subscribeToFeatureLocks,
} from '../../services/firebaseFeatureLocks';

interface FirebaseSaverHeaderBadgeProps {
  onNavigateTab?: (tabId: string) => void;
}

export const FirebaseSaverHeaderBadge: React.FC<FirebaseSaverHeaderBadgeProps> = ({
  onNavigateTab,
}) => {
  const [locks, setLocks] = useState<FeatureLockSettings>(() => getStoredFeatureLocks());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToFeatureLocks((updated) => {
      setLocks(updated);
    });
  }, []);

  const featureKeys = Object.keys(FEATURE_LOCK_NAMES) as FeatureLockKey[];
  const lockedCount = featureKeys.filter((k) => Boolean(locks.isGlobalLocked || locks[k])).length;
  const totalCount = featureKeys.length;
  const isAllLocked = lockedCount === totalCount;

  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleSingle = (key: FeatureLockKey) => {
    const isCurrentlyLocked = Boolean(locks.isGlobalLocked || locks[key]);
    setSingleFeatureLock(key, !isCurrentlyLocked);
    triggerFeedback(
      !isCurrentlyLocked
        ? `🔒 ${FEATURE_LOCK_NAMES[key].name} Locked (0 reads/writes)`
        : `🔓 ${FEATURE_LOCK_NAMES[key].name} Unlocked for Live Sync`
    );
  };

  const handleLockAll = () => {
    setAllFeaturesLock(true);
    triggerFeedback('🔒 All 7 static features locked! Maximum Free-Tier protection enabled.');
  };

  const handleUnlockAll = () => {
    setAllFeaturesLock(false);
    triggerFeedback('🔓 All features unlocked. Live database read/write active.');
  };

  return (
    <>
      {/* Header Pill Button */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        title="Firebase Free-Tier Saver & Feature Locks"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs border cursor-pointer ${
          isAllLocked
            ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/40 text-emerald-300'
            : lockedCount > 0
            ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/40 text-amber-300'
            : 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/40 text-rose-300'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="sr-only">Saver Status</span>
        </div>

        <span className="hidden sm:inline font-bold">
          Free-Tier Saver:
        </span>
        <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[11px] font-mono font-black">
          {lockedCount}/{totalCount} Locked
        </span>

        {isAllLocked ? (
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Unlock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        )}
      </button>

      {/* Control Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-700/80 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    Firebase Free-Tier Saver Mode
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Protection Active
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Freeze static database reads & writes to keep your Firestore 100% free
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Feedback Alert */}
              {feedback && (
                <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}

              {/* Master Actions Bar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Master Lock Switch:
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {lockedCount} of {totalCount} Protected
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleLockAll}
                    disabled={isAllLocked}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isAllLocked
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Lock All (Save Quota)
                  </button>

                  <button
                    type="button"
                    onClick={handleUnlockAll}
                    disabled={lockedCount === 0}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      lockedCount === 0
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Unlock All
                  </button>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Static Storefront Modules (0 Reads / Writes when Locked)</span>
                </h4>

                {featureKeys.map((key) => {
                  const meta = FEATURE_LOCK_NAMES[key];
                  const isLocked = Boolean(locks.isGlobalLocked || locks[key]);

                  return (
                    <div
                      key={key}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isLocked
                          ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          : 'bg-amber-950/20 border-amber-500/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {meta.name}
                          </span>
                          {isLocked ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                              🔒 Locked
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                              ⚡ Live Sync Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {meta.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsModalOpen(false);
                              onNavigateTab(meta.tabId);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                            title="Go to this tab"
                          >
                            <span className="hidden sm:inline text-[11px]">Open Tab</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleSingle(key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isLocked
                              ? 'bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 border border-slate-700'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Unlock</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Lock</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informational Card */}
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-white mb-0.5">
                    Real-time Features remain 100% active:
                  </p>
                  <p className="text-slate-300 text-[11px]">
                    Customer Orders, Seller Chat Box, Real-time Customer Care, Money Withdrawals, and Seller Logins continue to communicate with Firebase in real time. Only static configuration options are frozen to save database read/write limits.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                🔒 Free Spark Quota: 50,000 reads/day preserved
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
