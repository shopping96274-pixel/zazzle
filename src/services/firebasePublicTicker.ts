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
import { db } from './firebase';
import { PublicProductTickerItem } from '../types';
import { isFeatureLocked } from './firebaseFeatureLocks';

const LOCAL_STORAGE_KEY = 'zazzel_public_product_ticker_items_v1';
const COLLECTION_NAME = 'public_product_ticker';

export const DEFAULT_PUBLIC_TICKER_ITEMS: PublicProductTickerItem[] = [
  {
    id: 'ticker_iphone16_pro',
    title: 'iPhone 16 Pro Max 1TB Titanium',
    category: 'Phones & Tablets',
    badge: '🔥 Flagship Phone',
    price: '$1,199.00',
    originalPrice: '$1,499.00',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&auto=format&fit=crop&q=80',
    highlightText: 'A18 Pro Chip • 48MP Fusion • Grade 5 Titanium',
    status: 'active',
    order: 1,
    createdAt: new Date('2026-01-10T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-10T00:00:00Z').toISOString(),
  },
  {
    id: 'ticker_macbook_m3_max',
    title: 'Apple MacBook Pro 16" M3 Max',
    category: 'Laptops & PCs',
    badge: '⚡ Monster Laptop',
    price: '$2,499.00',
    originalPrice: '$2,899.00',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=80',
    highlightText: '16-Core CPU • 40-Core GPU • Liquid Retina XDR',
    status: 'active',
    order: 2,
    createdAt: new Date('2026-01-10T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-10T00:00:00Z').toISOString(),
  },
  {
    id: 'ticker_rtx_4090_oc',
    title: 'NVIDIA GeForce RTX 4090 OC 24GB',
    category: 'Graphic Cards',
    badge: '🚀 Monster GPU',
    price: '$1,799.00',
    originalPrice: '$1,999.00',
    imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&auto=format&fit=crop&q=80',
    highlightText: 'Ada Lovelace Architecture • DLSS 3.5 Ray Tracing',
    status: 'active',
    order: 3,
    createdAt: new Date('2026-01-10T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-10T00:00:00Z').toISOString(),
  },
  {
    id: 'ticker_galaxy_s24_ultra',
    title: 'Samsung Galaxy S24 Ultra 512GB',
    category: 'Phones & Tablets',
    badge: '✨ AI Smartphone',
    price: '$1,099.00',
    originalPrice: '$1,299.00',
    imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&auto=format&fit=crop&q=80',
    highlightText: 'Galaxy AI • 200MP Quad Tele • Titanium Gray',
    status: 'active',
    order: 4,
    createdAt: new Date('2026-01-10T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-10T00:00:00Z').toISOString(),
  },
  {
    id: 'ticker_asus_rog_scar',
    title: 'ASUS ROG Strix SCAR 18 (2024)',
    category: 'Laptops & PCs',
    badge: '🎮 Elite Gaming',
    price: '$2,899.00',
    originalPrice: '$3,299.00',
    imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&auto=format&fit=crop&q=80',
    highlightText: 'i9 14900HX • RTX 4090 • 240Hz Nebula HDR',
    status: 'active',
    order: 5,
    createdAt: new Date('2026-01-10T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-10T00:00:00Z').toISOString(),
  },
  {
    id: 'ticker_radeon_7900_xtx',
    title: 'AMD Radeon RX 7900 XTX 24GB Nitro+',
    category: 'Graphic Cards',
    badge: '⚡ 4K Gaming Beast',
    price: '$949.00',
    originalPrice: '$1,099.00',
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&auto=format&fit=crop&q=80',
    highlightText: 'RDNA 3 Architecture • 24GB GDDR6 • Vapor-X',
    status: 'active',
    order: 6,
    createdAt: new Date('2026-01-10T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-10T00:00:00Z').toISOString(),
  },
];

/**
 * Retrieve cached ticker items from local storage
 */
export function getLocalCachedPublicTickerItems(): PublicProductTickerItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[PublicTicker] Local storage read error:', err);
  }
  return DEFAULT_PUBLIC_TICKER_ITEMS;
}

/**
 * Persist ticker items to local storage cache
 */
export function setLocalCachedPublicTickerItems(items: PublicProductTickerItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('[PublicTicker] Local storage write error:', err);
  }
}

/**
 * Listen in real-time to public product ticker items in Firestore
 */
export function listenToPublicProductTickerItems(
  onUpdate: (items: PublicProductTickerItem[]) => void
): () => void {
  // Immediately supply cached or default items
  const cached = getLocalCachedPublicTickerItems();
  onUpdate(cached);

  // If locked in Free-Tier Saver mode, skip Firestore listener completely
  if (isFeatureLocked('publicTicker')) {
    return () => {};
  }

  if (!db) {
    console.warn('[PublicTicker] Firestore not initialized, using local cache');
    return () => {};
  }

  try {
    const collRef = collection(db, COLLECTION_NAME);
    const q = query(collRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: PublicProductTickerItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as PublicProductTickerItem;
            items.push({
              ...data,
              id: docSnap.id,
            });
          });

          // Sort by order ascending
          items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

          setLocalCachedPublicTickerItems(items);
          onUpdate(items);
        } else {
          // If empty in Firestore, seed defaults into Firestore and notify
          seedDefaultPublicTickerItemsToFirestore().then((seeded) => {
            onUpdate(seeded);
          }).catch(() => {
            onUpdate(DEFAULT_PUBLIC_TICKER_ITEMS);
          });
        }
      },
      (err) => {
        console.warn('[PublicTicker] Snapshot listener fallback:', err?.message || err);
        // Fallback to local cache
        const local = getLocalCachedPublicTickerItems();
        onUpdate(local);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[PublicTicker] Error creating listener:', err);
    return () => {};
  }
}

/**
 * Seed default public ticker items to Firestore
 */
export async function seedDefaultPublicTickerItemsToFirestore(): Promise<PublicProductTickerItem[]> {
  if (!db) {
    setLocalCachedPublicTickerItems(DEFAULT_PUBLIC_TICKER_ITEMS);
    return DEFAULT_PUBLIC_TICKER_ITEMS;
  }

  try {
    const collRef = collection(db, COLLECTION_NAME);
    const writePromises = DEFAULT_PUBLIC_TICKER_ITEMS.map(async (item) => {
      const docRef = doc(collRef, item.id);
      await setDoc(docRef, item, { merge: true });
    });
    await Promise.all(writePromises);
    setLocalCachedPublicTickerItems(DEFAULT_PUBLIC_TICKER_ITEMS);
    return DEFAULT_PUBLIC_TICKER_ITEMS;
  } catch (err) {
    console.warn('[PublicTicker] Seeding error:', err);
    setLocalCachedPublicTickerItems(DEFAULT_PUBLIC_TICKER_ITEMS);
    return DEFAULT_PUBLIC_TICKER_ITEMS;
  }
}

/**
 * Fetch all public product ticker items once
 */
export async function fetchPublicProductTickerItems(): Promise<PublicProductTickerItem[]> {
  if (isFeatureLocked('publicTicker') || !db) {
    return getLocalCachedPublicTickerItems();
  }

  try {
    const collRef = collection(db, COLLECTION_NAME);
    const q = query(collRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const items: PublicProductTickerItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          ...(docSnap.data() as PublicProductTickerItem),
          id: docSnap.id,
        });
      });
      items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      setLocalCachedPublicTickerItems(items);
      return items;
    } else {
      return await seedDefaultPublicTickerItemsToFirestore();
    }
  } catch (err) {
    console.warn('[PublicTicker] Fetch error, returning local cache:', err);
    return getLocalCachedPublicTickerItems();
  }
}

/**
 * Add a new product ticker item to Firestore
 */
export async function addPublicTickerItemToFirestore(
  item: Omit<PublicProductTickerItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<PublicProductTickerItem> {
  const newId = item.id || `ticker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const fullItem: PublicProductTickerItem = {
    ...item,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  // Optimistic update in local cache
  const cached = getLocalCachedPublicTickerItems();
  const updatedCache = [...cached, fullItem].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  setLocalCachedPublicTickerItems(updatedCache);

  // If locked in Free-Tier Saver mode, skip Firestore write completely
  if (isFeatureLocked('publicTicker')) {
    return fullItem;
  }

  if (db) {
    try {
      const docRef = doc(collection(db, COLLECTION_NAME), newId);
      await setDoc(docRef, fullItem);
    } catch (err) {
      console.warn('[PublicTicker] Firestore add error:', err);
    }
  }

  return fullItem;
}

/**
 * Update an existing product ticker item in Firestore
 */
export async function updatePublicTickerItemInFirestore(
  id: string,
  updates: Partial<Omit<PublicProductTickerItem, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString();
  const cleanUpdates = { ...updates, updatedAt: now };

  // Optimistic update in local cache
  const cached = getLocalCachedPublicTickerItems();
  const updatedCache = cached.map((it) => (it.id === id ? { ...it, ...cleanUpdates } : it));
  updatedCache.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  setLocalCachedPublicTickerItems(updatedCache);

  // If locked in Free-Tier Saver mode, skip Firestore write completely
  if (isFeatureLocked('publicTicker')) {
    return;
  }

  if (db) {
    try {
      const docRef = doc(collection(db, COLLECTION_NAME), id);
      await updateDoc(docRef, cleanUpdates);
    } catch (err) {
      console.warn('[PublicTicker] Firestore update error:', err);
    }
  }
}

/**
 * Delete a product ticker item from Firestore
 */
export async function deletePublicTickerItemFromFirestore(id: string): Promise<void> {
  // Optimistic removal from cache
  const cached = getLocalCachedPublicTickerItems();
  const updatedCache = cached.filter((it) => it.id !== id);
  setLocalCachedPublicTickerItems(updatedCache);

  // If locked in Free-Tier Saver mode, skip Firestore write completely
  if (isFeatureLocked('publicTicker')) {
    return;
  }

  if (db) {
    try {
      const docRef = doc(collection(db, COLLECTION_NAME), id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('[PublicTicker] Firestore delete error:', err);
    }
  }
}

/**
 * Toggle an item's active / inactive status
 */
export async function togglePublicTickerItemStatusInFirestore(
  id: string,
  newStatus: 'active' | 'inactive'
): Promise<void> {
  await updatePublicTickerItemInFirestore(id, { status: newStatus });
}

/**
 * Reset all public ticker items back to default products
 */
export async function resetPublicTickerItemsInFirestore(): Promise<PublicProductTickerItem[]> {
  setLocalCachedPublicTickerItems(DEFAULT_PUBLIC_TICKER_ITEMS);

  // If locked in Free-Tier Saver mode, skip Firestore write completely
  if (isFeatureLocked('publicTicker')) {
    return DEFAULT_PUBLIC_TICKER_ITEMS;
  }

  if (db) {
    try {
      const collRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(collRef);
      const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      const writePromises = DEFAULT_PUBLIC_TICKER_ITEMS.map((item) => {
        const docRef = doc(collRef, item.id);
        return setDoc(docRef, item);
      });
      await Promise.all(writePromises);
    } catch (err) {
      console.warn('[PublicTicker] Reset error:', err);
    }
  }

  return DEFAULT_PUBLIC_TICKER_ITEMS;
}
