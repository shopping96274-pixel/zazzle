import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Store,
  Tag,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Eye,
  Globe,
  LayoutGrid,
  ShieldCheck,
  Building2,
  Check,
  Sliders,
} from 'lucide-react';
import { DEFAULT_STORE_NAME, DEFAULT_STORE_TAGLINE } from '../../services/firebaseStoreBranding';
import { FeatureLockBanner } from './FeatureLockBanner';

interface StoreBrandingManagerProps {
  onNavigate?: (view: string) => void;
}

export const StoreBrandingManager: React.FC<StoreBrandingManagerProps> = ({ onNavigate }) => {
  const { storeName, storeTagline, updateStoreName, currentUser } = useStore();

  const [inputName, setInputName] = useState(storeName || DEFAULT_STORE_NAME);
  const [inputTagline, setInputTagline] = useState(storeTagline || DEFAULT_STORE_TAGLINE);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync internal state when storeName updates from Firestore
  useEffect(() => {
    if (storeName) {
      setInputName(storeName);
    }
  }, [storeName]);

  useEffect(() => {
    if (storeTagline) {
      setInputTagline(storeTagline);
    }
  }, [storeTagline]);

  const cleanName = inputName.trim();
  const isNameChanged = cleanName !== (storeName || '').trim();
  const isTaglineChanged = inputTagline.trim() !== (storeTagline || '').trim();
  const isValidLength = cleanName.length >= 2 && cleanName.length <= 50;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback(null);

    if (!isValidLength) {
      setSaveFeedback({
        type: 'error',
        text: 'Store name must be between 2 and 50 characters.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateStoreName(
        cleanName,
        inputTagline.trim(),
        currentUser?.name || 'Admin'
      );
      if (res.success) {
        setSaveFeedback({
          type: 'success',
          text: `Store name successfully updated to "${res.name}" in database and synced across all storefront headers and seller dashboards!`,
        });
        setTimeout(() => setSaveFeedback(null), 6000);
      } else {
        setSaveFeedback({
          type: 'error',
          text: res.message || 'Failed to update store name.',
        });
      }
    } catch (err: any) {
      setSaveFeedback({
        type: 'error',
        text: err?.message || 'Error communicating with database.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setInputName(DEFAULT_STORE_NAME);
    setInputTagline(DEFAULT_STORE_TAGLINE);
    setSaveFeedback(null);
  };

  const namePresets = ['Zazzel', 'Zazzel Superstore', 'Zazzel Mart', 'Zazzel Express', 'Zazzel Mall'];

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Feature Lock Banner */}
      <FeatureLockBanner featureKey="storeBranding" />

      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 shadow-xs">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-slate-900">
                Store Name & Global Branding
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Database Synchronized
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Change the store name displayed in the header, seller dashboard, storefront, footer, and across the entire platform.
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200 transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Live Storefront
          </button>
        )}
      </div>

      {/* 2. Feedback Notification */}
      {saveFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold transition-all animate-in fade-in duration-200 ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {saveFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{saveFeedback.text}</span>
          <button
            onClick={() => setSaveFeedback(null)}
            className="text-xs underline hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Current Active Name & Update Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Store Display Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Building2 className="w-32 h-32" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Active Store Name in Database
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Real-Time Synced
                </span>
              </div>

              {/* Big Bold Store Name */}
              <div className="my-3">
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-1.5 flex-wrap">
                  <span>{storeName || DEFAULT_STORE_NAME}</span>
                  <span className="text-orange-500">.</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                  {storeTagline || DEFAULT_STORE_TAGLINE}
                </p>
              </div>

              {/* Quick Status Bar */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800/80 mt-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Navbar Header: Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Seller Dashboard: Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Footer & Copyright: Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form to Change Store Name */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-500" />
                  Update Store Name
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter the new brand or marketplace name. It updates everywhere immediately.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Store / Platform Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="admin-store-name-input"
                    type="text"
                    required
                    maxLength={50}
                    value={inputName}
                    onChange={(e) => {
                      setInputName(e.target.value);
                      setSaveFeedback(null);
                    }}
                    placeholder="e.g. Zazzel or My Store"
                    className={`w-full px-4 py-3 rounded-xl text-base font-bold border focus:outline-none transition-all ${
                      isValidLength
                        ? 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
                        : 'border-rose-300 bg-rose-50/30 text-slate-900 focus:ring-2 focus:ring-rose-400'
                    }`}
                  />
                  {isValidLength && cleanName !== (storeName || '').trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                      ✎
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs mt-1.5 px-1 text-slate-500">
                  <span>{cleanName.length} / 50 characters</span>
                  <span>Minimum 2 characters</span>
                </div>
              </div>

              {/* Presets */}
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Quick Name Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {namePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setInputName(preset);
                        setSaveFeedback(null);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        inputName === preset
                          ? 'bg-orange-50 border-orange-300 text-orange-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Store Tagline */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Store Tagline / Slogan
                </label>
                <input
                  id="admin-store-tagline-input"
                  type="text"
                  maxLength={100}
                  value={inputTagline}
                  onChange={(e) => {
                    setInputTagline(e.target.value);
                    setSaveFeedback(null);
                  }}
                  placeholder="e.g. Official Shopping Store & Seller Marketplace"
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  id="admin-save-store-name-btn"
                  type="submit"
                  disabled={isSaving || !isValidLength}
                  className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    !isValidLength
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : isSaving
                      ? 'bg-orange-500 text-white opacity-80 cursor-wait'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white hover:shadow-md'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Store Name Everywhere
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Header & Seller Dashboard Previews */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-sky-500" />
                  Live Preview Across Portals
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  See how the store name displays in different areas.
                </p>
              </div>
            </div>

            {/* 1. Header Navbar Preview */}
            <div className="p-4 rounded-xl bg-slate-950 text-white space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-b border-slate-800 pb-1.5">
                <span>Storefront Header (Navbar)</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Live
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-white text-sm shadow-xs">
                    {(inputName || 'Z').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-lg font-black tracking-tight text-white font-serif">
                    {inputName || 'Zazzel'}
                    <span className="text-orange-500">.</span>
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                  Sell on {inputName || 'Zazzel'}
                </div>
              </div>
            </div>

            {/* 2. Seller Dashboard Sidebar Preview */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-b border-slate-800 pb-1.5">
                <span>Seller Dashboard Sidebar & Header</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Live
                </span>
              </div>
              <div className="pt-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center font-black text-slate-950 text-xs">
                    {(inputName || 'Z').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-base font-black tracking-wider text-white">
                    {inputName || 'Zazzel'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                    Seller Portal
                  </span>
                </div>
                <div className="text-xs text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span>Welcome back, merchant!</span>
                  <span className="text-amber-400 font-bold">{inputName || 'Zazzel'} Verified</span>
                </div>
              </div>
            </div>

            {/* 3. Footer & Copyright Preview */}
            <div className="p-4 rounded-xl bg-slate-950 text-white space-y-2 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-b border-slate-800 pb-1.5">
                <span>Footer & Buyer Protection</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Live
                </span>
              </div>
              <div className="pt-1 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-amber-400">
                  {inputName || 'Zazzel'} Quality Guarantee • 100% Buyer Protection
                </p>
                <p className="text-[11px] text-slate-400">
                  © {new Date().getFullYear()} {inputName || 'Zazzel'}, Inc. All Rights Reserved.
                </p>
              </div>
            </div>
          </div>

          {/* Feature checklist */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3.5">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Where This Name Appears
            </h3>

            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Storefront Navbar:</strong> Main logo brand and "Sell on [Store]" CTA.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Seller Dashboard:</strong> Sidebar logo, mobile header, and portal titles.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Admin Panel:</strong> Top brand logo and admin control center banner.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Registration Portal:</strong> "Become a [Store] Seller" signup pages.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Footer & Meta:</strong> Quality guarantees, copyright notices, and browser title.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
