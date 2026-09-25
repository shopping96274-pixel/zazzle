import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  listenToSellerTickerItems,
  addTickerItemToFirestore,
  updateTickerItemInFirestore,
  deleteTickerItemFromFirestore,
  toggleTickerItemStatusInFirestore,
  resetTickerItemsInFirestore,
  DEFAULT_TICKER_ITEMS,
  LOGO_AMAZON,
  LOGO_ALIBABA,
  LOGO_FLIPKART,
  LOGO_EBAY,
  LOGO_TEMU,
  LOGO_SHEIN,
  LOGO_HARAJ,
  LOGO_DUBIZZLE,
  LOGO_NOON,
} from '../../services/firebaseTicker';
import { SellerTickerItem } from '../../types';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Handshake,
  Upload,
  Link,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  ExternalLink,
  Layers,
  ArrowUpDown,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react';
import { FeatureLockBanner } from './FeatureLockBanner';

interface SellerTickerManagerProps {
  onNavigate?: (view: string) => void;
}

// Preset popular brand templates for 1-click admin population
const PRESET_BRANDS = [
  {
    brandName: 'Amazon',
    text: '',
    badgeTag: 'Marketplace',
    logoUrl: LOGO_AMAZON,
    externalUrl: 'https://amazon.com',
  },
  {
    brandName: 'Alibaba',
    text: '',
    badgeTag: 'Wholesale B2B',
    logoUrl: LOGO_ALIBABA,
    externalUrl: 'https://alibaba.com',
  },
  {
    brandName: 'Flipkart',
    text: '',
    badgeTag: 'E-Commerce',
    logoUrl: LOGO_FLIPKART,
    externalUrl: 'https://flipkart.com',
  },
  {
    brandName: 'eBay',
    text: '',
    badgeTag: 'Global Trade',
    logoUrl: LOGO_EBAY,
    externalUrl: 'https://ebay.com',
  },
  {
    brandName: 'Temu',
    text: '',
    badgeTag: 'Factory Direct',
    logoUrl: LOGO_TEMU,
    externalUrl: 'https://temu.com',
  },
  {
    brandName: 'SHEIN',
    text: '',
    badgeTag: 'Fashion Global',
    logoUrl: LOGO_SHEIN,
    externalUrl: 'https://shein.com',
  },
  {
    brandName: 'Haraj',
    text: '',
    badgeTag: 'Saudi Marketplace',
    logoUrl: LOGO_HARAJ,
    externalUrl: 'https://haraj.com.sa',
  },
  {
    brandName: 'Dubizzle',
    text: '',
    badgeTag: 'UAE Marketplace',
    logoUrl: LOGO_DUBIZZLE,
    externalUrl: 'https://dubizzle.com',
  },
  {
    brandName: 'Noon',
    text: '',
    badgeTag: 'Middle East Hub',
    logoUrl: LOGO_NOON,
    externalUrl: 'https://noon.com',
  },
];

export const SellerTickerManager: React.FC<SellerTickerManagerProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<SellerTickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SellerTickerItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [formBrandName, setFormBrandName] = useState('');
  const [formText, setFormText] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formBadgeTag, setFormBadgeTag] = useState('');
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to real-time updates from Firebase Firestore
  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToSellerTickerItems((updatedItems) => {
      setItems(updatedItems);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open Create Form
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormBrandName('');
    setFormText('Official Partner Coming Soon');
    setFormLogoUrl('https://images.unsplash.com/photo-1523474253243-4e8990176d63?w=100&auto=format&fit=crop&q=80');
    setFormStatus('active');
    setFormOrder(items.length + 1);
    setFormBadgeTag('Official Partner');
    setFormExternalUrl('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEditModal = (item: SellerTickerItem) => {
    setEditingItem(item);
    setFormBrandName(item.brandName);
    setFormText(item.text);
    setFormLogoUrl(item.logoUrl);
    setFormStatus(item.status);
    setFormOrder(item.order ?? 1);
    setFormBadgeTag(item.badgeTag || '');
    setFormExternalUrl(item.externalUrl || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle Logo File Upload (reads as Data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 1.5MB for logo)
    if (file.size > 1.5 * 1024 * 1024) {
      setFormError('Image file is too large. Please select an icon or logo under 1.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormLogoUrl(reader.result);
        setFormError(null);
      }
    };
    reader.onerror = () => {
      setFormError('Failed to read logo image file.');
    };
    reader.readAsDataURL(file);
  };

  // Apply Preset Brand Template
  const handleApplyPreset = (preset: typeof PRESET_BRANDS[0]) => {
    setFormBrandName(preset.brandName);
    setFormText(preset.text);
    setFormLogoUrl(preset.logoUrl);
    setFormBadgeTag(preset.badgeTag);
    setFormExternalUrl(preset.externalUrl);
    setFormError(null);
  };

  // Submit Form (Add or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBrandName.trim()) {
      setFormError('Please enter a brand or partner name.');
      return;
    }
    if (!formLogoUrl.trim()) {
      setFormError('Please provide a logo image URL or upload an icon file.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingItem) {
        // Update existing item
        await updateTickerItemInFirestore(editingItem.id, {
          brandName: formBrandName.trim(),
          text: formText.trim(),
          logoUrl: formLogoUrl.trim(),
          status: formStatus,
          order: Number(formOrder) || 1,
          badgeTag: formBadgeTag.trim(),
          externalUrl: formExternalUrl.trim(),
        });
        showToast(`✓ Updated partner "${formBrandName}" successfully in Firebase.`);
      } else {
        // Create new item
        await addTickerItemToFirestore({
          brandName: formBrandName.trim(),
          text: formText.trim(),
          logoUrl: formLogoUrl.trim(),
          status: formStatus,
          order: Number(formOrder) || 1,
          badgeTag: formBadgeTag.trim(),
          externalUrl: formExternalUrl.trim(),
        });
        showToast(`✓ Added partner "${formBrandName}" to Firebase ticker.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving ticker item:', err);
      setFormError(err.message || 'Failed to save to Firebase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Item Status
  const handleToggleStatus = async (item: SellerTickerItem) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await toggleTickerItemStatusInFirestore(item.id, newStatus);
      showToast(`Partner "${item.brandName}" marked as ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string) => {
    try {
      await deleteTickerItemFromFirestore(id);
      setDeleteConfirmId(null);
      showToast('✓ Partner item removed from ticker.');
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  // Reset to Defaults
  const handleResetToDefaults = async () => {
    if (window.confirm('Reset all ticker items back to the official default partners list?')) {
      try {
        await resetTickerItemsInFirestore();
        showToast('✓ Restored official default partner list.');
      } catch (err) {
        console.error('Error resetting ticker items:', err);
      }
    }
  };

  // Filtered & Searched items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (filterStatus === 'ACTIVE') return item.status === 'active';
        if (filterStatus === 'INACTIVE') return item.status === 'inactive';
        return true;
      })
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.brandName.toLowerCase().includes(q) ||
          item.text.toLowerCase().includes(q) ||
          (item.badgeTag && item.badgeTag.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }, [items, filterStatus, searchQuery]);

  const activeCount = items.filter((i) => i.status === 'active').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Feature Lock Banner */}
      <FeatureLockBanner featureKey="sellerTicker" />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-amber-400/15 text-amber-400 border border-amber-400/30">
                <Handshake className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  Seller Dashboard Ticker Manager
                  <span className="text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    Firebase Live
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Manage the official partner announcement marquee displayed below the seller dashboard header.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('seller')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-blue-600/30 hover:scale-[1.02] cursor-pointer"
                title="Abhi Seller Dashboard me jaa kar check karein"
              >
                <ExternalLink className="w-4 h-4" />
                Open Seller Dashboard (Check Now)
              </button>
            )}
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Reset to official partner defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md shadow-amber-400/20 hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Add Partner Ticker Item
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Seller Dashboard Preview
            </span>
            <span className="text-[10px] text-slate-500">({activeCount} Active Partners)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Smooth continuous auto-scroll
            </span>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('seller')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold transition cursor-pointer border border-slate-700"
              >
                Test on Seller Page
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* The Actual Marquee Preview Container */}
        <div className="relative w-full overflow-hidden bg-slate-950 border border-slate-800/90 rounded-xl h-12 flex items-center px-2">
          {/* Fixed Badge on left */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/25 text-amber-400 shrink-0 z-20 mr-2">
            <Handshake className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[9px] font-bold uppercase text-amber-300">Partners</span>
          </div>

          {activeCount === 0 ? (
            <div className="flex-1 text-center text-xs text-slate-500 italic">
              No active ticker items enabled. Toggle items to 'Active' below to show them on the seller dashboard.
            </div>
          ) : (
            <div className="flex-1 overflow-hidden relative flex items-center">
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-950 to-transparent z-10" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10" />
              <div className="animate-ticker-marquee flex items-center gap-3 py-1 pr-6 cursor-default">
                {[...filteredItems.filter((i) => i.status === 'active'), ...filteredItems.filter((i) => i.status === 'active')].map((item, idx) => (
                  <div
                    key={`preview-${item.id}-${idx}`}
                    title={item.text ? `${item.brandName} • ${item.text}` : item.brandName}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs shrink-0"
                  >
                    {item.logoUrl ? (
                      <div className="w-5 h-5 rounded-xs bg-white p-0.5 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={item.logoUrl}
                          alt=""
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span className="font-black text-white whitespace-nowrap">{item.brandName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar: Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by brand, text, or tag..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400/70 text-xs"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              filterStatus === 'ACTIVE'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({items.filter((i) => i.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              filterStatus === 'INACTIVE'
                ? 'bg-rose-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Inactive ({items.filter((i) => i.status === 'inactive').length})
          </button>
        </div>
      </div>

      {/* Items Table / Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Configured Partner Ticker Items</h2>
          </div>
          <span className="text-xs text-slate-400">
            Showing {filteredItems.length} of {items.length} items
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading partner items from Firebase Firestore...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-4">
            <Handshake className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium">No partner items match your current filter.</p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Partner Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-bold text-center w-14">Order</th>
                  <th className="py-3.5 px-4 font-bold">Partner / Brand</th>
                  <th className="py-3.5 px-4 font-bold">Announcement Text</th>
                  <th className="py-3.5 px-4 font-bold">Badge Tag</th>
                  <th className="py-3.5 px-4 font-bold text-center">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredItems.map((item) => {
                  const isActive = item.status === 'active';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Sort Order Priority */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
                          #{item.order ?? 1}
                        </span>
                      </td>

                      {/* Brand Info & Logo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          {item.logoUrl ? (
                            <img
                              src={item.logoUrl}
                              alt={item.brandName}
                              className="w-8 h-8 rounded-full object-cover bg-white/10 p-0.5 border border-slate-700 shrink-0 shadow-xs"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                              <span className="truncate">{item.brandName}</span>
                              {item.externalUrl && (
                                <a
                                  href={item.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-500 hover:text-amber-400"
                                  title={item.externalUrl}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ID: {item.id.replace('ticker_', '')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Announcement Text */}
                      <td className="py-3 px-4">
                        <p className="text-slate-200 font-medium max-w-sm line-clamp-2">
                          {item.text}
                        </p>
                      </td>

                      {/* Badge Tag */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.badgeTag ? (
                          <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/25">
                            {item.badgeTag}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Toggle Status Switch */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                          }`}
                          title={`Click to switch to ${isActive ? 'Inactive' : 'Active'}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-400/20 text-slate-300 hover:text-amber-400 border border-slate-700/80 transition cursor-pointer"
                            title="Edit Partner Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/80 transition cursor-pointer"
                            title="Delete Partner Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30">
                  <Handshake className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-white">
                  {editingItem ? 'Edit Partner Ticker Item' : 'Add New Partner Ticker Item'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Preset Quick Fill Buttons */}
              {!editingItem && (
                <div className="space-y-1.5 pb-2 border-b border-slate-800">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Quick Preset Brand Templates (Click to fill)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_BRANDS.map((preset) => (
                      <button
                        key={preset.brandName}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-amber-400/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-400/40 text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5"
                      >
                        <img
                          src={preset.logoUrl}
                          alt=""
                          className="w-3.5 h-3.5 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {preset.brandName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. Brand / Partner Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Brand / Partner Name *</label>
                <input
                  type="text"
                  required
                  value={formBrandName}
                  onChange={(e) => setFormBrandName(e.target.value)}
                  placeholder="e.g. Amazon Global, DHL Express, Shopify Plus"
                  className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400/70"
                />
              </div>

              {/* 2. Announcement Text (Optional) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Ticker Note / Description (Optional)</label>
                <input
                  type="text"
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Optional note (e.g. Official Global Marketplace)"
                  className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400/70"
                />
              </div>

              {/* 3. Logo URL & File Upload */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300">Partner Logo (URL or Icon File) *</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    {formLogoUrl ? (
                      <img
                        src={formLogoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      required
                      value={formLogoUrl}
                      onChange={(e) => setFormLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png or choose file..."
                      className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400/70"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 font-semibold cursor-pointer shrink-0"
                    title="Upload icon or logo from computer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* 4. Display Order & Badge Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Display Order (Priority)</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400/70"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Optional Badge Tag</label>
                  <input
                    type="text"
                    value={formBadgeTag}
                    onChange={(e) => setFormBadgeTag(e.target.value)}
                    placeholder="e.g. Fulfillment, Air Express, Verified"
                    className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400/70"
                  />
                </div>
              </div>

              {/* 5. External Link & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Partner Website (Optional Link)</label>
                  <input
                    type="url"
                    value={formExternalUrl}
                    onChange={(e) => setFormExternalUrl(e.target.value)}
                    placeholder="https://partner.com"
                    className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400/70"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Initial Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 bg-slate-950 text-white rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400/70"
                  >
                    <option value="active">Active (Visible on Seller Ticker)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Live Preview of Single Badge */}
              <div className="pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Badge Appearance Preview
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 shadow-xs">
                    {formLogoUrl ? (
                      <img
                        src={formLogoUrl}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover bg-white/10"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="font-bold text-white">{formBrandName || 'Brand Name'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span className="text-slate-300 font-medium">
                      {formText || 'Official Partner Coming Soon'}
                    </span>
                    {formBadgeTag && (
                      <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/20">
                        {formBadgeTag}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  {editingItem ? 'Save Changes' : 'Create Ticker Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete Partner Item?</h3>
              <p className="text-xs text-slate-400">
                This ticker item will be immediately removed from Firebase Firestore and the seller dashboard marquee.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(deleteConfirmId)}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
