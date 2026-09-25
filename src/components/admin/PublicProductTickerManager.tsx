import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  listenToPublicProductTickerItems,
  addPublicTickerItemToFirestore,
  updatePublicTickerItemInFirestore,
  deletePublicTickerItemFromFirestore,
  togglePublicTickerItemStatusInFirestore,
  resetPublicTickerItemsInFirestore,
  DEFAULT_PUBLIC_TICKER_ITEMS,
} from '../../services/firebasePublicTicker';
import { PublicProductTickerItem } from '../../types';
import { useStore } from '../../context/StoreContext';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  ArrowUpDown,
  Smartphone,
  Laptop,
  Cpu,
  Flame,
  Check,
  X,
  Store,
  Layers,
} from 'lucide-react';
import { FeatureLockBanner } from './FeatureLockBanner';

interface PublicProductTickerManagerProps {
  onNavigate?: (view: string) => void;
}

// Preset Quick Templates for 1-Click Addition (New Phone, Laptop, Graphic Card, etc.)
const PRESET_PRODUCT_TEMPLATES = [
  {
    title: 'iPhone 16 Pro Max 1TB Titanium',
    category: 'Phones & Tablets',
    badge: '🔥 Flagship Phone',
    price: '$1,199.00',
    originalPrice: '$1,499.00',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&auto=format&fit=crop&q=80',
    highlightText: 'A18 Pro Chip • 48MP Fusion • Grade 5 Titanium',
  },
  {
    title: 'Samsung Galaxy S24 Ultra 512GB',
    category: 'Phones & Tablets',
    badge: '✨ AI Smartphone',
    price: '$1,099.00',
    originalPrice: '$1,299.00',
    imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&auto=format&fit=crop&q=80',
    highlightText: 'Galaxy AI • 200MP Quad Tele • Titanium Gray',
  },
  {
    title: 'Apple MacBook Pro 16" M3 Max',
    category: 'Laptops & PCs',
    badge: '⚡ Monster Laptop',
    price: '$2,499.00',
    originalPrice: '$2,899.00',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=80',
    highlightText: '16-Core CPU • 40-Core GPU • Liquid Retina XDR',
  },
  {
    title: 'ASUS ROG Strix SCAR 18 (2024)',
    category: 'Laptops & PCs',
    badge: '🎮 Elite Gaming',
    price: '$2,899.00',
    originalPrice: '$3,299.00',
    imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&auto=format&fit=crop&q=80',
    highlightText: 'i9 14900HX • RTX 4090 • 240Hz Nebula HDR',
  },
  {
    title: 'NVIDIA GeForce RTX 4090 OC 24GB',
    category: 'Graphic Cards',
    badge: '🚀 Monster GPU',
    price: '$1,799.00',
    originalPrice: '$1,999.00',
    imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80',
    highlightText: 'Ada Lovelace Architecture • DLSS 3.5 Ray Tracing',
  },
  {
    title: 'AMD Radeon RX 7900 XTX 24GB Nitro+',
    category: 'Graphic Cards',
    badge: '⚡ 4K Gaming Beast',
    price: '$949.00',
    originalPrice: '$1,099.00',
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&auto=format&fit=crop&q=80',
    highlightText: 'RDNA 3 Architecture • 24GB GDDR6 • Vapor-X Cooling',
  },
];

export const PublicProductTickerManager: React.FC<PublicProductTickerManagerProps> = ({ onNavigate }) => {
  const { products } = useStore();
  const [items, setItems] = useState<PublicProductTickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PublicProductTickerItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<PublicProductTickerItem | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Phones & Tablets');
  const [formBadge, setFormBadge] = useState('🔥 Hot Deal');
  const [formPrice, setFormPrice] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formHighlightText, setFormHighlightText] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time Firestore sync
  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToPublicProductTickerItems((updatedItems) => {
      setItems(updatedItems);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Show auto-clearing toast
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Reset form
  const resetForm = () => {
    setFormTitle('');
    setFormCategory('Phones & Tablets');
    setFormBadge('🔥 Hot Deal');
    setFormPrice('');
    setFormOriginalPrice('');
    setFormImageUrl('');
    setFormHighlightText('');
    setFormStatus('active');
    setFormOrder((items.length > 0 ? Math.max(...items.map((i) => i.order || 0)) + 1 : 1));
    setEditingItem(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: PublicProductTickerItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category || 'Phones & Tablets');
    setFormBadge(item.badge || '');
    setFormPrice(item.price || '');
    setFormOriginalPrice(item.originalPrice || '');
    setFormImageUrl(item.imageUrl || '');
    setFormHighlightText(item.highlightText || '');
    setFormStatus(item.status);
    setFormOrder(item.order ?? 1);
    setIsAddModalOpen(true);
  };

  // Apply quick preset template
  const handleApplyPreset = (preset: (typeof PRESET_PRODUCT_TEMPLATES)[0]) => {
    setFormTitle(preset.title);
    setFormCategory(preset.category);
    setFormBadge(preset.badge);
    setFormPrice(preset.price);
    setFormOriginalPrice(preset.originalPrice);
    setFormImageUrl(preset.imageUrl);
    setFormHighlightText(preset.highlightText);
  };

  // Import from store catalog product
  const handleImportFromCatalog = (product: any) => {
    setFormTitle(product.name || '');
    setFormCategory(product.categoryName || 'General');
    setFormBadge(product.featured ? '⭐ Featured Pick' : '⚡ Top Seller');
    setFormPrice(`$${product.price?.toFixed(2) || '0.00'}`);
    if (product.originalPrice && product.originalPrice > product.price) {
      setFormOriginalPrice(`$${product.originalPrice?.toFixed(2)}`);
    } else {
      setFormOriginalPrice('');
    }
    const img = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '';
    setFormImageUrl(img);
    setFormHighlightText(product.shortDescription || product.description?.substring(0, 50) || '');
    setIsCatalogModalOpen(false);
    setIsAddModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      showToast('Product title is required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        // Update existing item
        await updatePublicTickerItemInFirestore(editingItem.id, {
          title: formTitle.trim(),
          category: formCategory.trim(),
          badge: formBadge.trim(),
          price: formPrice.trim(),
          originalPrice: formOriginalPrice.trim(),
          imageUrl: formImageUrl.trim(),
          highlightText: formHighlightText.trim(),
          status: formStatus,
          order: Number(formOrder) || 1,
        });
        showToast('Product updated successfully on the public ticker!');
      } else {
        // Create new item
        await addPublicTickerItemToFirestore({
          title: formTitle.trim(),
          category: formCategory.trim(),
          badge: formBadge.trim(),
          price: formPrice.trim(),
          originalPrice: formOriginalPrice.trim(),
          imageUrl: formImageUrl.trim(),
          highlightText: formHighlightText.trim(),
          status: formStatus,
          order: Number(formOrder) || (items.length + 1),
        });
        showToast('New product added to public ticker!');
      }

      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving ticker item:', err);
      showToast('Failed to save product ticker item.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggleStatus = async (item: PublicProductTickerItem) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await togglePublicTickerItemStatusInFirestore(item.id, newStatus);
      showToast(
        `"${item.title}" is now ${newStatus === 'active' ? 'active' : 'hidden'} on public ticker.`
      );
    } catch (err) {
      showToast('Failed to toggle status.', 'error');
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmItem) return;
    try {
      await deletePublicTickerItemFromFirestore(deleteConfirmItem.id);
      showToast(`Removed "${deleteConfirmItem.title}" from public ticker.`);
      setDeleteConfirmItem(null);
    } catch (err) {
      showToast('Failed to delete item.', 'error');
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    try {
      await resetPublicTickerItemsInFirestore();
      showToast('Reset public product ticker back to factory defaults!');
      setIsResetConfirmOpen(false);
    } catch (err) {
      showToast('Failed to reset ticker items.', 'error');
    }
  };

  // Handle local image upload via file reader
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image size should be under 2MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setFormImageUrl(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtered and searched items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchCat = (item.category || '').toLowerCase().includes(q);
          const matchBadge = (item.badge || '').toLowerCase().includes(q);
          const matchHighlight = (item.highlightText || '').toLowerCase().includes(q);
          if (!matchTitle && !matchCat && !matchBadge && !matchHighlight) {
            return false;
          }
        }

        // Category filter
        if (filterCategory !== 'ALL') {
          if (item.category?.toLowerCase() !== filterCategory.toLowerCase()) {
            return false;
          }
        }

        // Status filter
        if (filterStatus === 'ACTIVE' && item.status !== 'active') return false;
        if (filterStatus === 'INACTIVE' && item.status !== 'inactive') return false;

        return true;
      })
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }, [items, searchQuery, filterCategory, filterStatus]);

  // Unique categories from items for filter dropdown
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [items]);

  const activeCount = items.filter((i) => i.status === 'active').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Feature Lock Banner */}
      <FeatureLockBanner featureKey="publicTicker" />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-[1500] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-semibold animate-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/95 border-rose-500/50 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="bg-slate-900/90 backdrop-blur-xs border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Public Products Ticker</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Unclickable Marquee
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage products continuously displayed on the public storefront homepage (Phones, Laptops, Graphic Cards, etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCatalogModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-xs"
          >
            <Store className="w-4 h-4 text-amber-400" />
            <span>Import from Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            title="Reset to default flagship products"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black flex items-center gap-2 cursor-pointer transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 2. Live Storefront Preview (Unclickable Demonstration) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Live Storefront Preview
            </span>
            <span className="text-[11px] text-slate-500">
              ({activeCount} Active Items • Strictly Unclickable for Customers)
            </span>
          </div>
          <span className="text-[10px] text-amber-400/90 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            Real-time Marquee
          </span>
        </div>

        {/* The Live Marquee Box */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-slate-950 border border-slate-800/90 py-2.5 px-3">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10" />

          {activeCount === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500">
              No active products. Add or activate products below to start the public ticker!
            </div>
          ) : (
            <div className="animate-ticker-marquee flex items-center gap-3 py-1 pr-6 cursor-default select-none pointer-events-none">
              {[...items.filter((i) => i.status === 'active'), ...items.filter((i) => i.status === 'active')].map(
                (item, idx) => (
                  <div
                    key={`preview-${item.id}-${idx}`}
                    className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-2xs shrink-0 select-none cursor-default"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-6 h-6 rounded-md object-cover"
                      />
                    )}
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.badge}
                      </span>
                    )}
                    <span className="text-xs font-bold text-white whitespace-nowrap">{item.title}</span>
                    {item.price && (
                      <span className="text-xs font-black text-amber-400 whitespace-nowrap">{item.price}</span>
                    )}
                    {item.highlightText && (
                      <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 whitespace-nowrap">
                        {item.highlightText}
                      </span>
                    )}
                    <span className="text-slate-600 text-xs">•</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Quick 1-Click Templates Bar */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Quick 1-Click Presets:</span>
          <span className="text-slate-500 text-[11px] font-normal">
            (Click to populate form instantly)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_PRODUCT_TEMPLATES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                resetForm();
                handleApplyPreset(preset);
                setIsAddModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              {preset.category.includes('Phone') && <Smartphone className="w-3 h-3 text-amber-400" />}
              {preset.category.includes('Laptop') && <Laptop className="w-3 h-3 text-sky-400" />}
              {preset.category.includes('Graphic') && <Cpu className="w-3 h-3 text-emerald-400" />}
              <span>{preset.title.split(' ')[0]} {preset.title.split(' ')[1]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, category, or specs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-amber-400 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Tabs */}
          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterStatus === st
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Hidden'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Ticker Items Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading public ticker items from Firestore...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Flame className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">No product ticker items found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || filterCategory !== 'ALL' || filterStatus !== 'ALL'
                ? 'Try adjusting your search or category filters.'
                : 'Click "Add Product" above or choose a preset to get started.'}
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer transition shadow-sm"
            >
              + Add First Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 w-14 text-center">Order</th>
                  <th className="py-3.5 px-4">Product Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Highlight Specs</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-850/50 transition-colors ${
                      item.status === 'inactive' ? 'opacity-60 bg-slate-950/30' : ''
                    }`}
                  >
                    {/* Order */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                      #{item.order ?? 1}
                    </td>

                    {/* Product Name & Thumbnail */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 p-0.5 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Flame className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs truncate max-w-xs block">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate">
                            ID: {item.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700/60 inline-block">
                        {item.category || 'General'}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-black text-amber-400 text-xs">
                          {item.price || '—'}
                        </span>
                        {item.originalPrice && (
                          <span className="text-[10px] text-slate-500 line-through">
                            {item.originalPrice}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Highlight Specs */}
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.highlightText || '—'}
                      </p>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer border ${
                          item.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        {item.status === 'active' ? 'Active' : 'Hidden'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmItem(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-400 transition cursor-pointer"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PRODUCT TICKER ITEM                     */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingItem ? 'Edit Ticker Product' : 'Add New Ticker Product'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Product will glide smoothly on the public storefront homepage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Product Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Product Name / Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. iPhone 16 Pro Max 1TB or ASUS ROG Strix"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Category & Badge Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Phones & Tablets, Laptops & PCs, Graphic Cards"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Badge / Tagline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🔥 Flagship Phone, ⚡ Monster Laptop"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Price & Original Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Offer Price (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $1,199.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Original Price (Optional strikethrough)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $1,499.00"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Image URL & File Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Product Image URL or Upload
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://... or upload image"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                </div>
                {formImageUrl && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <img
                      src={formImageUrl}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <span className="text-[11px] text-slate-400 truncate flex-1">{formImageUrl}</span>
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Highlight Specs Tagline */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Highlight Specs / Tagline (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. A18 Pro Chip • 48MP Fusion or 24GB GDDR6X • DLSS 3.5"
                  value={formHighlightText}
                  onChange={(e) => setFormHighlightText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Order & Status */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Visibility Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="active">Active (Visible in Marquee)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black cursor-pointer transition shadow-md flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{editingItem ? 'Update Ticker Product' : 'Add to Public Ticker'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: IMPORT FROM CATALOG                                */}
      {/* ========================================================= */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Import from Store Products</h3>
                  <p className="text-xs text-slate-400">
                    Click any product to convert it into a public ticker item
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {products.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No products found in store catalog.
                </div>
              ) : (
                products.map((p) => {
                  const img = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '';
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleImportFromCatalog(p)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/70 border border-slate-850 hover:border-amber-400/40 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={img}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-900"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <p className="text-xs font-bold text-white line-clamp-1">{p.name}</p>
                          <p className="text-[11px] text-slate-400">{p.categoryName || 'General'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-amber-400">${p.price?.toFixed(2)}</span>
                        <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                          Select +
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE CONFIRMATION                                */}
      {/* ========================================================= */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Remove Product?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <strong className="text-white">"{deleteConfirmItem.title}"</strong> from the public ticker?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer transition shadow-md"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RESET TO DEFAULTS CONFIRMATION                     */}
      {/* ========================================================= */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reset Ticker to Factory Defaults?</h3>
              <p className="text-xs text-slate-400 mt-1">
                This will restore the 6 default flagship products (iPhone 16 Pro Max, MacBook Pro M3 Max, RTX 4090, Galaxy S24 Ultra, ROG SCAR 18, and Radeon RX 7900 XTX).
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer transition shadow-md"
              >
                Yes, Restore Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
