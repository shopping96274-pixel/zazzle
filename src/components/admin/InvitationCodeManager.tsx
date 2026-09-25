import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  KeyRound,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Users,
  Database,
  ArrowRight,
} from 'lucide-react';
import { validateInvitationCodeFormat } from '../../services/firebaseInvitationCode';
import { FeatureLockBanner } from './FeatureLockBanner';

interface InvitationCodeManagerProps {
  onNavigate?: (view: string) => void;
}

export const InvitationCodeManager: React.FC<InvitationCodeManagerProps> = ({ onNavigate }) => {
  const {
    invitationCode,
    invitationCodeUpdatedAt,
    updateInvitationCode,
    currentUser,
  } = useStore();

  const [inputCode, setInputCode] = useState(invitationCode || '5201');
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(true);

  // Live test input state for simulator
  const [testInput, setTestInput] = useState('');
  const [showTestInput, setShowTestInput] = useState(false);

  // Sync internal state when store invitation code updates from Firestore
  useEffect(() => {
    if (invitationCode) {
      setInputCode(invitationCode);
    }
  }, [invitationCode]);

  const cleanInput = inputCode.trim();
  const formatValidation = validateInvitationCodeFormat(cleanInput);
  const isInputChanged = cleanInput !== (invitationCode || '').trim();

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback(null);

    if (!formatValidation.isValid) {
      setSaveFeedback({
        type: 'error',
        text: formatValidation.error || 'Please enter exactly 4 numeric digits.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateInvitationCode(cleanInput, currentUser?.name || 'Admin');
      if (res.success) {
        setSaveFeedback({
          type: 'success',
          text: `Success! Invitation code is now set to "${res.code}" and updated in the database.`,
        });
        setTimeout(() => setSaveFeedback(null), 5000);
      } else {
        setSaveFeedback({
          type: 'error',
          text: res.message || 'Failed to save invitation code.',
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

  // Generate random 4-digit code
  const handleGenerateRandom = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    setInputCode(randomCode);
    setSaveFeedback(null);
  };

  // Reset to default
  const handleResetDefault = () => {
    setInputCode('5201');
    setSaveFeedback(null);
  };

  // Copy active code
  const handleCopyCode = () => {
    if (!invitationCode) return;
    navigator.clipboard.writeText(invitationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Simulator check
  const isTestMatch = testInput.trim() === (invitationCode || '').trim();
  const isTestWrong = testInput.trim().length === 4 && !isTestMatch;

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Feature Lock Banner */}
      <FeatureLockBanner featureKey="invitationCode" />

      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-slate-900">
                Seller Invitation Code Management
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Database Connected
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage the 4-digit invitation code required for all new sellers when applying for merchant registration.
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('become-seller')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Registration Page
          </button>
        )}
      </div>

      {/* 2. Feedback Banner */}
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
        {/* Left Column: Live Active Code & Update Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Current Live Active Code Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
            {/* Ambient Background Accents */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <KeyRound className="w-32 h-32" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Live Active Code in Database
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title={showCode ? 'Hide Code' : 'Show Code'}
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* 4 Digital Character Blocks */}
              <div className="flex items-center gap-3 my-4">
                {(invitationCode || '5201')
                  .slice(0, 4)
                  .padEnd(4, '•')
                  .split('')
                  .map((digit, idx) => (
                    <div
                      key={idx}
                      className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-slate-950/90 border-2 border-amber-400/40 flex items-center justify-center font-mono text-3xl sm:text-4xl font-black text-amber-400 shadow-lg shadow-amber-950/20"
                    >
                      {showCode ? digit : '•'}
                    </div>
                  ))}
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80 mt-4 text-xs">
                <div className="text-slate-400">
                  {invitationCodeUpdatedAt ? (
                    <span>Last updated: {new Date(invitationCodeUpdatedAt).toLocaleString()}</span>
                  ) : (
                    <span>Status: Synchronized with Firestore</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Update Code Form Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  Change 4-Digit Invitation Code
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set a new 4-digit code. Any seller registering will immediately need this code.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  New 4-Digit Code
                </label>
                <div className="relative">
                  <input
                    id="admin-new-invitation-code-input"
                    type="text"
                    maxLength={4}
                    value={inputCode}
                    onChange={(e) => {
                      // Only allow numeric digits up to 4
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setInputCode(val);
                      setSaveFeedback(null);
                    }}
                    placeholder="e.g. 5201"
                    className={`w-full px-4 py-3.5 rounded-xl font-mono text-2xl tracking-[0.35em] font-bold text-center border focus:outline-none transition-all ${
                      cleanInput.length === 4
                        ? 'border-emerald-500 bg-emerald-50/30 text-emerald-950 focus:ring-2 focus:ring-emerald-400'
                        : cleanInput.length > 0
                        ? 'border-amber-400 bg-amber-50/20 text-slate-900 focus:ring-2 focus:ring-amber-400'
                        : 'border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400'
                    }`}
                  />
                  {cleanInput.length === 4 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Digit Counter & Validation Text */}
                <div className="flex items-center justify-between text-xs mt-2 px-1">
                  <span className={cleanInput.length === 4 ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                    {cleanInput.length === 4
                      ? '✓ Exactly 4 digits entered'
                      : `Enter exactly 4 numeric digits (${cleanInput.length}/4)`}
                  </span>
                  <span className="text-slate-400">Numeric only (0-9)</span>
                </div>
              </div>

              {/* Quick Generator & Helper Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleGenerateRandom}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Generate Random PIN
                </button>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  Reset Default (5201)
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  id="admin-save-invitation-code-btn"
                  type="submit"
                  disabled={isSaving || !formatValidation.isValid}
                  className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    !formatValidation.isValid
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : isSaving
                      ? 'bg-amber-400 text-slate-950 opacity-80 cursor-wait'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 hover:shadow-md'
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
                      Save & Update Database
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Registration Box Preview & Usage Guide */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Simulator Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-sky-500" />
                  Registration Form Live Test
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Test how the invitation code validates on the seller signup screen.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 text-white space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Invitation Code *</span>
                {isTestMatch && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <Check className="w-3.5 h-3.5" /> Valid
                  </span>
                )}
                {isTestWrong && (
                  <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5" /> Invalid Code
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type={showTestInput ? 'text' : 'password'}
                  maxLength={4}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter 4-Digit Invitation Code"
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold tracking-wider bg-slate-900 border text-white pr-20 focus:outline-none ${
                    isTestMatch
                      ? 'border-emerald-500 ring-2 ring-emerald-500/25'
                      : isTestWrong
                      ? 'border-rose-500 ring-2 ring-rose-500/25'
                      : 'border-slate-800 focus:ring-2 focus:ring-amber-400'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowTestInput(!showTestInput)}
                    className="p-1 text-slate-400 hover:text-slate-200"
                  >
                    {showTestInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {isTestMatch && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  {isTestWrong && (
                    <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[11px]">
                {isTestMatch ? (
                  <p className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Code matched! Seller can proceed to Step 2.
                  </p>
                ) : isTestWrong ? (
                  <p className="text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Incorrect code. Seller will be blocked.
                  </p>
                ) : (
                  <p className="text-slate-500">
                    Type "{invitationCode || '5201'}" above to test verification.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Instructions & Features Guide */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              How Invitation Code Works
            </h3>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold mt-0.5 border border-amber-200">
                  1
                </div>
                <p>
                  <strong className="text-slate-800">Database Storage:</strong> The code is stored securely under{' '}
                  <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono">
                    settings/invitation_code
                  </code>{' '}
                  in Firebase Firestore.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold mt-0.5 border border-amber-200">
                  2
                </div>
                <p>
                  <strong className="text-slate-800">Real-Time Sync:</strong> The moment you change the code, it updates across all connected browsers and devices instantly.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold mt-0.5 border border-amber-200">
                  3
                </div>
                <p>
                  <strong className="text-slate-800">Mandatory for Registration:</strong> New sellers cannot proceed beyond Step 1 of the "Become a Seller" registration without entering this exact 4-digit code.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold mt-0.5 border border-amber-200">
                  4
                </div>
                <p>
                  <strong className="text-slate-800">Spam Prevention:</strong> Protects your marketplace by restricting seller onboarding only to trusted partners who have received the invitation code.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
