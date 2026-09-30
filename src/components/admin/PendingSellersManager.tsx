import React, { useState } from 'react';
import {
  Store,
  CheckCircle2,
  Search,
  Eye,
  Mail,
  Clock,
  Copy,
  Phone,
  EyeOff,
  Building2,
  FileText,
  ShieldCheck,
  ZoomIn,
  Check,
  X,
  MessageSquare,
  KeyRound,
} from 'lucide-react';
import { SellerProfile } from '../../types';

interface PendingSellersManagerProps {
  pendingSellers: SellerProfile[];
  sellers: SellerProfile[];
  approvedSellers: SellerProfile[];
  handleApproveSeller: (seller: SellerProfile) => void;
  handleRejectSeller: (seller: SellerProfile) => void;
  handleStartChatWithSeller: (seller: SellerProfile) => void;
  setSelectedSellerDetail: (seller: SellerProfile) => void;
  setKycInspectSeller: (seller: SellerProfile) => void;
  setKycInspectSide: (side: 'front' | 'back' | 'both') => void;
  setActiveTab: (tab: any) => void;
  triggerToast: (msg: string) => void;
}

export const PendingSellersManager: React.FC<PendingSellersManagerProps> = ({
  pendingSellers,
  sellers,
  approvedSellers,
  handleApproveSeller,
  handleRejectSeller,
  handleStartChatWithSeller,
  setSelectedSellerDetail,
  setKycInspectSeller,
  setKycInspectSide,
  setActiveTab,
  triggerToast,
}) => {
  const [pendingSellerSearch, setPendingSellerSearch] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (sellerId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [sellerId]: !prev[sellerId],
    }));
  };

  const filteredPendingSellers = pendingSellers.filter((s) => {
    if (!pendingSellerSearch.trim()) return true;
    const q = pendingSellerSearch.toLowerCase().trim();
    return (
      (s.shopName || '').toLowerCase().includes(q) ||
      (s.sellerName || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q)
    );
  });

  return (
    <div id="admin-pending-sellers-section" className="space-y-4">
      {/* Section Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
              pendingSellers.length > 0
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                New Seller Registrations
              </h2>
              {pendingSellers.length > 0 ? (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>{pendingSellers.length} Awaiting Your Approval</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>All Caught Up • 0 Pending</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Newly registered stores appear right here until approved or rejected. Approving activates their merchant portal immediately.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {pendingSellers.length > 0 && (
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pendingSellerSearch}
                onChange={(e) => setPendingSellerSearch(e.target.value)}
                placeholder="Search pending sellers..."
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-500 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('seller-profiles')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700/80 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>All Stores ({sellers.length})</span>
          </button>
        </div>
      </div>

      {/* Empty State: When 0 pending sellers */}
      {pendingSellers.length === 0 && (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              No Pending Seller Registrations
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All store applications have been processed. When a new seller registers on the platform, their details, credentials, and verification documents will appear here instantly for your review.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('seller-profiles')}
            className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>View Active Sellers ({approvedSellers.length})</span>
          </button>
        </div>
      )}

      {/* List of Pending Sellers */}
      {pendingSellers.length > 0 && (
        <div className="space-y-4">
          {filteredPendingSellers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
              No pending sellers match &quot;{pendingSellerSearch}&quot;. Try clearing your search.
            </div>
          ) : (
            filteredPendingSellers.map((seller) => {
              const sellerCreatedDate = seller.joinedDate
                ? new Date(seller.joinedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent Application';

              const kycFront =
                seller.kycFrontImageUrl || seller.frontImage || seller.kycDocuments?.frontImageUrl;
              const kycBack =
                seller.kycBackImageUrl || seller.backImage || seller.kycDocuments?.backImageUrl;
              const docType =
                seller.kycDocumentType ||
                seller.documentType ||
                seller.kycDocuments?.documentType ||
                'ID Card';
              const isPassRevealed = Boolean(revealedPasswords[seller.id]);

              return (
                <div
                  key={seller.id}
                  className="bg-slate-900 border-2 border-amber-500/40 hover:border-amber-500/70 rounded-2xl p-5 sm:p-6 shadow-xl transition-all space-y-4 relative overflow-hidden"
                >
                  {/* Accent Glow Strip */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400"></div>

                  {/* Top Details Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                        {(seller.shopName || seller.sellerName || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 font-mono text-base sm:text-lg font-black text-sky-400 tracking-tight">
                            <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="select-all">{seller.email}</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                            ● Pending Approval
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                          <span className="text-slate-200 font-semibold">
                            {seller.shopName || 'Store'} • {seller.sellerName || 'Merchant'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Applied: {sellerCreatedDate}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        ID: {seller.id.slice(0, 12)}
                      </span>
                    </div>
                  </div>

                  {/* Middle Information Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                    {/* Contact Information */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>Contact Details</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-slate-200">
                          <span className="text-slate-400">Email:</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator?.clipboard) {
                                navigator.clipboard.writeText(seller.email);
                                triggerToast('Email copied to clipboard!');
                              }
                            }}
                            className="font-medium text-white hover:text-amber-400 transition flex items-center gap-1 cursor-pointer"
                            title="Copy email"
                          >
                            <span>{seller.email}</span>
                            <Copy className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-slate-200">
                          <span className="text-slate-400">Phone:</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator?.clipboard && seller.phone) {
                                navigator.clipboard.writeText(seller.phone);
                                triggerToast('Phone number copied to clipboard!');
                              }
                            }}
                            className="font-medium text-white hover:text-amber-400 transition flex items-center gap-1 cursor-pointer"
                            title="Copy phone"
                          >
                            <span>{seller.phone || 'N/A'}</span>
                            <Copy className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-slate-200">
                          <span className="text-slate-400">Location:</span>
                          <span className="text-slate-300">
                            {seller.city
                              ? `${seller.city}${seller.country ? `, ${seller.country}` : ''}`
                              : seller.country || 'Online Store'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Credentials & Payout Details */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Credentials & Payout</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Password:</span>
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="text-amber-300 font-bold">
                              {isPassRevealed ? seller.password || 'Not Set' : '••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(seller.id)}
                              className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
                              title={isPassRevealed ? 'Hide Password' : 'Show Password'}
                            >
                              {isPassRevealed ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {seller.password && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(seller.password!);
                                  triggerToast('Password copied to clipboard!');
                                }}
                                className="p-1 text-slate-400 hover:text-amber-300 rounded transition cursor-pointer"
                                title="Copy Password"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-slate-200">
                          <span className="text-slate-400">Method:</span>
                          <span className="text-slate-300 font-semibold">
                            {seller.withdrawalMethod || 'Bank Transfer'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-200">
                          <span className="text-slate-400">Details:</span>
                          <span
                            className="text-slate-300 truncate max-w-[140px]"
                            title={seller.payoutDetails}
                          >
                            {seller.payoutDetails || 'Auto-connected'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KYC Documents Preview */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2 sm:col-span-2 lg:col-span-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>KYC Verification</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {docType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {kycFront ? (
                          <div
                            onClick={() => {
                              setKycInspectSeller(seller);
                              setKycInspectSide('front');
                            }}
                            className="flex-1 group relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer aspect-video flex items-center justify-center"
                            title="Click to view Front ID"
                          >
                            <img
                              src={kycFront}
                              alt="Front KYC"
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white gap-1 text-[10px] font-bold">
                              <ZoomIn className="w-3 h-3" />
                              <span>Front</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 bg-slate-900 rounded-lg p-2 text-center text-[10px] text-slate-500 border border-slate-800">
                            Front Attached
                          </div>
                        )}

                        {kycBack ? (
                          <div
                            onClick={() => {
                              setKycInspectSeller(seller);
                              setKycInspectSide('back');
                            }}
                            className="flex-1 group relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer aspect-video flex items-center justify-center"
                            title="Click to view Back ID"
                          >
                            <img
                              src={kycBack}
                              alt="Back KYC"
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white gap-1 text-[10px] font-bold">
                              <ZoomIn className="w-3 h-3" />
                              <span>Back</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 bg-slate-900 rounded-lg p-2 text-center text-[10px] text-slate-500 border border-slate-800">
                            Back Attached
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* APPROVE BUTTON: Green, highly visible */}
                      <button
                        type="button"
                        onClick={() => handleApproveSeller(seller)}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 hover:scale-102 active:scale-98 transition-all cursor-pointer"
                        title="Approve and activate this store"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Approve & Activate Store</span>
                      </button>

                      {/* REJECT BUTTON: Red, opens rejection modal */}
                      <button
                        type="button"
                        onClick={() => handleRejectSeller(seller)}
                        className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Reject this seller application"
                      >
                        <X className="w-4 h-4 stroke-[2.5]" />
                        <span>Reject Application</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Inspect KYC Lightbox */}
                      <button
                        type="button"
                        onClick={() => {
                          setKycInspectSeller(seller);
                          setKycInspectSide('both');
                        }}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-sky-400 border border-sky-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Inspect Documents</span>
                      </button>

                      {/* Start Live Chat */}
                      <button
                        type="button"
                        onClick={() => {
                          handleStartChatWithSeller(seller);
                          setActiveTab('conversations');
                        }}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span>Chat</span>
                      </button>

                      {/* Full Profile */}
                      <button
                        type="button"
                        onClick={() => setSelectedSellerDetail(seller)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Full Profile</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
