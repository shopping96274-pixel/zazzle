import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { SellerTickerItem } from '../types';
import { isFeatureLocked } from './firebaseFeatureLocks';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const LOCAL_STORAGE_KEY = 'zazzel_seller_ticker_items_v7';
const COLLECTION_NAME = 'seller_ticker_items';

// High-fidelity vector SVG logos for reliable zero-latency cross-browser rendering
export const LOGO_AMAZON = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23131921"/><path d="M22 65c16 11 38 10 52-.5.8-.6 1.6.6.9 1.4-14 12-38 12-53.8.3-.7-.5 0-1.7.9-1.2z" fill="%23FF9900"/><path d="M73 61.5c-.8 1.2-3.8 2-6 2.3-.6.1-.8-.4-.3-.8 1.6-1.3 4.2-3.2 4.8-5.7.2-.9 1.1-.7 1.3.2.7 2.4 2.5 5.2 4.1 6.2.5.3.3.8-.3.7-2-.3-4.5-1.1-5.3-2.3z" fill="%23FF9900"/><path d="M48 26c-9.5 0-15.5 5.2-15.5 13.5 0 8.5 6 12.8 14.5 12.8 5 0 9.2-2.1 11.8-5.3v4.2h8.5V34.5C67.3 28.8 61 26 48 26zm-1 21.8c-4.8 0-7.8-2.6-7.8-6.8 0-4.5 3.3-7.2 8-7.2 4.5 0 7.6 2.5 7.6 6.8 0 4.5-3.3 7.2-7.8 7.2z" fill="%23FFFFFF"/></svg>`;

export const LOGO_ALIBABA = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23FF6000"/><circle cx="50" cy="38" r="8.5" fill="%23FFFFFF"/><path d="M30 68c4 4 11 7 20 7s16-3 20-7l-4-5c-3 3-9 5-16 5s-13-2-16-5l-4 5z" fill="%23FFFFFF"/><path d="M26 44c0 14 11 24 24 24s24-10 24-24c0-5-1.5-9-4-12l-5 4c2 2 3 5 3 8 0 10-8 17-18 17s-18-7-18-17c0-3 1-6 3-8l-5-4c-2.5 3-4 7-4 12z" fill="%23FFFFFF"/></svg>`;

export const LOGO_FLIPKART = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%232874F0"/><path d="M42 22h24l-4 14h-14l-2 9h12l-4 14H42l-7 23H22l18-60z" fill="%23FFE500"/><circle cx="72" cy="36" r="7" fill="%23FFE500"/></svg>`;

export const LOGO_EBAY = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23FFFFFF"/><text x="50" y="63" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="34" text-anchor="middle"><tspan fill="%23E53238">e</tspan><tspan fill="%230064D2">b</tspan><tspan fill="%23F5AF02">a</tspan><tspan fill="%2386B817">y</tspan></text></svg>`;

export const LOGO_TEMU = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23FB7701"/><text x="50" y="64" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="22" fill="%23FFFFFF" text-anchor="middle" letter-spacing="1">TEMU</text><circle cx="34" cy="36" r="6" fill="%23FFE066"/><path d="M50 28l5 10h-10l5-10z" fill="%23FFFFFF"/><circle cx="66" cy="36" r="6" fill="%23FFE066"/></svg>`;

export const LOGO_SHEIN = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23000000"/><text x="50" y="58" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="21" fill="%23FFFFFF" text-anchor="middle" letter-spacing="1.5">SHEIN</text></svg>`;

export const LOGO_HARAJ = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%230066CC"/><text x="50" y="52" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="30" fill="%23FFFFFF" text-anchor="middle">حراج</text><text x="50" y="74" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="800" font-size="13" fill="%23FFFFFF" text-anchor="middle" letter-spacing="1.5">HARAJ</text></svg>`;

export const LOGO_DUBIZZLE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23ED1C24"/><text x="50" y="52" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="18" fill="%23FFFFFF" text-anchor="middle" letter-spacing="-0.5">dubizzle</text><path d="M30 65c6 5 14 7 20 7s14-2 20-7" stroke="%23FFFFFF" stroke-width="4" stroke-linecap="round" fill="none"/></svg>`;

export const LOGO_NOON = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%23FEEE00"/><circle cx="50" cy="50" r="32" stroke="%23111111" stroke-width="6" fill="none"/><circle cx="50" cy="38" r="4.5" fill="%23111111"/><text x="50" y="66" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="16" fill="%23111111" text-anchor="middle">noon</text></svg>`;

export const DEFAULT_TICKER_ITEMS: SellerTickerItem[] = [
  {
    id: 'ticker_amazon',
    brandName: 'Amazon',
    text: '',
    logoUrl: LOGO_AMAZON,
    status: 'active',
    order: 1,
    badgeTag: 'Marketplace',
    externalUrl: 'https://amazon.com',
    createdAt: new Date('2026-01-15T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-15T08:00:00Z').toISOString(),
  },
  {
    id: 'ticker_alibaba',
    brandName: 'Alibaba',
    text: '',
    logoUrl: LOGO_ALIBABA,
    status: 'active',
    order: 2,
    badgeTag: 'Wholesale B2B',
    externalUrl: 'https://alibaba.com',
    createdAt: new Date('2026-01-16T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-16T08:00:00Z').toISOString(),
  },
  {
    id: 'ticker_flipkart',
    brandName: 'Flipkart',
    text: '',
    logoUrl: LOGO_FLIPKART,
    status: 'active',
    order: 3,
    badgeTag: 'E-Commerce',
    externalUrl: 'https://flipkart.com',
    createdAt: new Date('2026-01-17T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-17T08:00:00Z').toISOString(),
  },
  {
    id: 'ticker_ebay',
    brandName: 'eBay',
    text: '',
    logoUrl: LOGO_EBAY,
    status: 'active',
    order: 4,
    badgeTag: 'Global Trade',
    externalUrl: 'https://ebay.com',
    createdAt: new Date('2026-01-18T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-18T08:00:00Z').toISOString(),
  },
  {
    id: 'ticker_temu',
    brandName: 'Temu',
    text: '',
    logoUrl: LOGO_TEMU,
    status: 'active',
    order: 5,
    badgeTag: 'Factory Direct',
    externalUrl: 'https://temu.com',
    createdAt: new Date('2026-01-19T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-19T08:00:00Z').toISOString(),
  },
  {
    id: 'ticker_shein',
    brandName: 'SHEIN',
    text: '',
    logoUrl: LOGO_SHEIN,
    status: 'active',
    order: 6,
    badgeTag: 'Fashion Global',
    externalUrl: 'https://shein.com',
    createdAt: new Date('2026-01-20T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-20T08:00:00Z').toISOString(),
  },
  {
    id: 'ticker_haraj',
    brandName: 'Haraj',
    text: '',
    logoUrl: LOGO_HARAJ,
    status: 'active',
    order: 7,
    badgeTag: 'Saudi Marketplace',
    externalUrl: 'https://haraj.com.sa',
    createdAt: new Date('2026-01-21T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-21T08:00:00Z').toISOString(),
  },
  {
    id: 'ticker_dubizzle',
    brandName: 'Dubizzle',
    text: '',
    logoUrl: LOGO_DUBIZZLE,
    status: 'active',
    order: 8,
    badgeTag: 'UAE Marketplace',
    externalUrl: 'https://dubizzle.com',
    createdAt: new Date('2026-01-22T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-22T08:00:00Z').toISOString(),
  },
  {
    id: 'ticker_noon',
    brandName: 'Noon',
    text: '',
    logoUrl: LOGO_NOON,
    status: 'active',
    order: 9,
    badgeTag: 'Middle East Hub',
    externalUrl: 'https://noon.com',
    createdAt: new Date('2026-01-23T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-23T08:00:00Z').toISOString(),
  },
];

// Helper to get cached items safely
export function getLocalCachedTickerItems(): SellerTickerItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Ticker] Error reading localStorage cache:', e);
  }
  return DEFAULT_TICKER_ITEMS;
}

// Helper to save to local cache
export function setLocalCachedTickerItems(items: SellerTickerItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[Ticker] Error writing localStorage cache:', e);
  }
}

/**
 * Real-time listener for seller ticker items in Firestore.
 * Updates local cache and notifies subscriber on every change.
 */
export function listenToSellerTickerItems(
  onUpdate: (items: SellerTickerItem[]) => void
): () => void {
  // If feature is locked in Free-Tier Saver mode, skip Firestore listener completely
  if (isFeatureLocked('sellerTicker')) {
    onUpdate(getLocalCachedTickerItems());
    return () => {};
  }

  if (!db) {
    onUpdate(getLocalCachedTickerItems());
    return () => {};
  }

  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: SellerTickerItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              brandName: data.brandName || 'Partner',
              text: data.text !== undefined ? data.text : '',
              logoUrl: data.logoUrl || '',
              status: data.status === 'inactive' ? 'inactive' : 'active',
              order: typeof data.order === 'number' ? data.order : 99,
              badgeTag: data.badgeTag || '',
              externalUrl: data.externalUrl || '',
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          });

          // Ensure top requested brands (Amazon, Alibaba, Flipkart, eBay, Temu) are always present
          const existingBrands = new Set(items.map((i) => i.brandName.toLowerCase().trim()));
          const missingKeyBrands = DEFAULT_TICKER_ITEMS.filter(
            (def) => !existingBrands.has(def.brandName.toLowerCase().trim())
          );

          if (missingKeyBrands.length > 0) {
            // Auto-persist missing essentials to Firestore in the background
            missingKeyBrands.forEach((missing) => {
              items.push(missing);
              const docRef = doc(db, COLLECTION_NAME, missing.id);
              setDoc(docRef, missing, { merge: true }).catch((err) => {
                console.warn('[Ticker] Auto-sync missing brand error:', err);
              });
            });
          }

          // Sort by order ascending
          items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

          setLocalCachedTickerItems(items);
          onUpdate(items);
        } else {
          // If Firestore collection is empty, seed it with defaults
          console.log('[Ticker] Collection empty in Firestore, auto-seeding defaults...');
          seedDefaultTickerItemsToFirestore().then((seeded) => {
            setLocalCachedTickerItems(seeded);
            onUpdate(seeded);
          }).catch(() => {
            onUpdate(getLocalCachedTickerItems());
          });
        }
      },
      (error) => {
        console.warn('[Firestore] Ticker onSnapshot warning:', error);
        // Serve local cached items if snapshot fails
        onUpdate(getLocalCachedTickerItems());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firestore] Failed to attach ticker listener:', err);
    onUpdate(getLocalCachedTickerItems());
    return () => {};
  }
}

/**
 * Seeds default items into Firestore if collection is empty.
 */
export async function seedDefaultTickerItemsToFirestore(): Promise<SellerTickerItem[]> {
  if (!db) return DEFAULT_TICKER_ITEMS;
  try {
    for (const item of DEFAULT_TICKER_ITEMS) {
      const docRef = doc(db, COLLECTION_NAME, item.id);
      await setDoc(docRef, item, { merge: true });
    }
    console.log('[Firestore] Seeded default ticker items successfully.');
    return DEFAULT_TICKER_ITEMS;
  } catch (err) {
    console.warn('[Firestore] Seeding ticker items notice:', err);
    return DEFAULT_TICKER_ITEMS;
  }
}

/**
 * Fetch all ticker items directly once
 */
export async function fetchSellerTickerItems(): Promise<SellerTickerItem[]> {
  if (isFeatureLocked('sellerTicker') || !db) return getLocalCachedTickerItems();

  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items: SellerTickerItem[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          brandName: d.brandName || 'Partner',
          text: d.text || 'Official Partner Coming Soon',
          logoUrl: d.logoUrl || '',
          status: d.status === 'inactive' ? 'inactive' : 'active',
          order: typeof d.order === 'number' ? d.order : 99,
          badgeTag: d.badgeTag || '',
          externalUrl: d.externalUrl || '',
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        });
      });
      items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      setLocalCachedTickerItems(items);
      return items;
    } else {
      return await seedDefaultTickerItemsToFirestore();
    }
  } catch (err) {
    console.warn('[Firestore] Error fetching ticker items:', err);
    return getLocalCachedTickerItems();
  }
}

/**
 * Add a brand-new partner ticker item
 */
export async function addTickerItemToFirestore(
  item: Omit<SellerTickerItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<SellerTickerItem> {
  const newId = item.id || `ticker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const fullItem: SellerTickerItem = {
    id: newId,
    brandName: item.brandName.trim(),
    text: item.text.trim(),
    logoUrl: item.logoUrl.trim(),
    status: item.status || 'active',
    order: item.order ?? 10,
    badgeTag: item.badgeTag?.trim() || '',
    externalUrl: item.externalUrl?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  // Update local cache immediately
  const current = getLocalCachedTickerItems();
  const updated = [...current, fullItem].sort((a, b) => a.order - b.order);
  setLocalCachedTickerItems(updated);

  // If locked in Free-Tier Saver mode, skip Firestore write completely
  if (isFeatureLocked('sellerTicker')) {
    return fullItem;
  }

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, newId);
      await setDoc(docRef, fullItem);
      console.log('[Firestore] Added ticker item successfully:', newId);
    } catch (err) {
      console.error('[Firestore] Failed to save ticker item:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${newId}`);
      } catch {
        // Fall back gracefully with local state
      }
    }
  }

  return fullItem;
}

/**
 * Update an existing ticker item
 */
export async function updateTickerItemInFirestore(
  id: string,
  updates: Partial<Omit<SellerTickerItem, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString();
  const payload = {
    ...updates,
    updatedAt: now,
  };

  // Update local cache immediately
  const current = getLocalCachedTickerItems();
  const updated = current.map((item) => (item.id === id ? { ...item, ...payload } : item));
  setLocalCachedTickerItems(updated);

  // If locked in Free-Tier Saver mode, skip Firestore write completely
  if (isFeatureLocked('sellerTicker')) {
    return;
  }

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, payload);
      console.log('[Firestore] Updated ticker item:', id);
    } catch (err) {
      console.error('[Firestore] Failed to update ticker item:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
      } catch {
        // Fall back gracefully with local state
      }
    }
  }
}

/**
 * Toggle active / inactive status
 */
export async function toggleTickerItemStatusInFirestore(
  id: string,
  newStatus: 'active' | 'inactive'
): Promise<void> {
  return updateTickerItemInFirestore(id, { status: newStatus });
}

/**
 * Delete a ticker item
 */
export async function deleteTickerItemFromFirestore(id: string): Promise<void> {
  // Update local cache immediately
  const current = getLocalCachedTickerItems();
  const updated = current.filter((item) => item.id !== id);
  setLocalCachedTickerItems(updated);

  // If locked in Free-Tier Saver mode, skip Firestore write completely
  if (isFeatureLocked('sellerTicker')) {
    return;
  }

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      console.log('[Firestore] Deleted ticker item:', id);
    } catch (err) {
      console.error('[Firestore] Failed to delete ticker item:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
      } catch {
        // Fall back gracefully with local state
      }
    }
  }
}

/**
 * Reset all ticker items to default list
 */
export async function resetTickerItemsInFirestore(): Promise<SellerTickerItem[]> {
  setLocalCachedTickerItems(DEFAULT_TICKER_ITEMS);

  // If locked in Free-Tier Saver mode, skip Firestore write completely
  if (isFeatureLocked('sellerTicker')) {
    return DEFAULT_TICKER_ITEMS;
  }

  if (db) {
    try {
      // First clean existing or overwrite with defaults
      for (const item of DEFAULT_TICKER_ITEMS) {
        const docRef = doc(db, COLLECTION_NAME, item.id);
        await setDoc(docRef, item, { merge: true });
      }
    } catch (err) {
      console.warn('[Firestore] Reset ticker items notice:', err);
    }
  }

  return DEFAULT_TICKER_ITEMS;
}
