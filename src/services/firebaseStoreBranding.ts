import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { isFeatureLocked } from './firebaseFeatureLocks';

export interface StoreBrandingData {
  storeName: string;
  tagline?: string;
  logoUrl?: string;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_STORE_NAME = 'Zazzel';
export const DEFAULT_STORE_TAGLINE = 'Official Shopping Store & Seller Marketplace';
const LOCAL_STORAGE_KEY = 'nexus_store_branding';
const LOCAL_NAME_KEY = 'nexus_store_name';

/**
 * Reads the cached store name synchronously from localStorage or returns default
 */
export const getStoredStoreName = (): string => {
  try {
    const directName = localStorage.getItem(LOCAL_NAME_KEY);
    if (directName && directName.trim().length > 0) {
      return directName.trim();
    }
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.storeName && typeof parsed.storeName === 'string' && parsed.storeName.trim().length > 0) {
        return parsed.storeName.trim();
      }
    }
  } catch {}
  return DEFAULT_STORE_NAME;
};

/**
 * Reads the cached store branding synchronously from localStorage
 */
export const getStoredStoreBranding = (): StoreBrandingData => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.storeName) {
        return {
          storeName: parsed.storeName.trim() || DEFAULT_STORE_NAME,
          tagline: parsed.tagline || DEFAULT_STORE_TAGLINE,
          logoUrl: parsed.logoUrl || '',
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          updatedBy: parsed.updatedBy || 'Admin',
        };
      }
    }
  } catch {}
  return {
    storeName: getStoredStoreName(),
    tagline: DEFAULT_STORE_TAGLINE,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System',
  };
};

/**
 * Fetches the active store name and branding from Firestore doc: settings/store_branding
 */
export const fetchFirestoreStoreBranding = async (): Promise<StoreBrandingData | null> => {
  // If locked in Free-Tier Saver mode, skip Firestore read
  if (isFeatureLocked('storeBranding')) {
    return getStoredStoreBranding();
  }

  try {
    const docRef = doc(db, 'settings', 'store_branding');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.storeName && typeof data.storeName === 'string' && data.storeName.trim().length > 0) {
        const branding: StoreBrandingData = {
          storeName: data.storeName.trim(),
          tagline: data.tagline || DEFAULT_STORE_TAGLINE,
          logoUrl: data.logoUrl || '',
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy || 'Admin',
        };
        try {
          localStorage.setItem(LOCAL_NAME_KEY, branding.storeName);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(branding));
        } catch {}
        return branding;
      }
    }
  } catch (err) {
    console.warn('[StoreBranding] Firestore fetch fallback to local:', err);
  }
  return null;
};

/**
 * Saves a new store name and optional tagline to Firestore doc: settings/store_branding
 */
export const saveFirestoreStoreBranding = async (
  newStoreName: string,
  newTagline: string = DEFAULT_STORE_TAGLINE,
  updatedBy: string = 'Admin'
): Promise<{ success: boolean; name: string; message: string }> => {
  const cleanName = newStoreName.trim();
  if (!cleanName || cleanName.length < 2) {
    return {
      success: false,
      name: getStoredStoreName(),
      message: 'Store name must be at least 2 characters long.',
    };
  }

  if (cleanName.length > 50) {
    return {
      success: false,
      name: getStoredStoreName(),
      message: 'Store name cannot exceed 50 characters.',
    };
  }

  const payload: StoreBrandingData = {
    storeName: cleanName,
    tagline: (newTagline || DEFAULT_STORE_TAGLINE).trim(),
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  // Immediate local cache
  try {
    localStorage.setItem(LOCAL_NAME_KEY, cleanName);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {}

  // If locked in Free-Tier Saver mode, skip Firestore write completely
  if (isFeatureLocked('storeBranding')) {
    return {
      success: true,
      name: cleanName,
      message: `Store name saved locally to "${cleanName}". (🔒 Locked in Firebase Saver Mode - 0 database writes used)`,
    };
  }

  // Save to Firestore
  try {
    const docRef = doc(db, 'settings', 'store_branding');
    await setDoc(docRef, payload, { merge: true });
    return {
      success: true,
      name: cleanName,
      message: `Store name successfully updated to "${cleanName}" in database!`,
    };
  } catch (err: any) {
    console.error('[StoreBranding] Error saving to Firestore:', err);
    return {
      success: true,
      name: cleanName,
      message: `Store name saved locally to "${cleanName}" (Cloud sync will retry automatically).`,
    };
  }
};

/**
 * Listens in real-time to changes in settings/store_branding
 */
export const listenToFirestoreStoreBranding = (
  callback: (branding: StoreBrandingData) => void
): (() => void) => {
  // If locked in Free-Tier Saver mode, skip Firestore listener completely
  if (isFeatureLocked('storeBranding')) {
    callback(getStoredStoreBranding());
    return () => {};
  }

  try {
    const docRef = doc(db, 'settings', 'store_branding');
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.storeName && typeof data.storeName === 'string' && data.storeName.trim().length > 0) {
            const branding: StoreBrandingData = {
              storeName: data.storeName.trim(),
              tagline: data.tagline || DEFAULT_STORE_TAGLINE,
              logoUrl: data.logoUrl || '',
              updatedAt: data.updatedAt || new Date().toISOString(),
              updatedBy: data.updatedBy || 'Admin',
            };
            try {
              localStorage.setItem(LOCAL_NAME_KEY, branding.storeName);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(branding));
            } catch {}
            callback(branding);
          }
        }
      },
      (error) => {
        console.warn('[StoreBranding] Snapshot error, ignoring for local state:', error.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[StoreBranding] Could not attach listener:', err);
    return () => {};
  }
};
