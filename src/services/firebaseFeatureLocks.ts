/**
 * Firebase Free-Tier Saver & Feature Lock Manager
 *
 * This service controls whether static store modules (Invitation Code, Branding,
 * Footer Contacts, Main Page, Public Ticker, Seller Ticker, Subscription Plans)
 * communicate with Firestore or run in zero-read/zero-write cached offline mode.
 *
 * When LOCKED:
 * - Real-time onSnapshot listeners are NOT attached (0 reads consumed).
 * - Background Firestore fetch queries are skipped.
 * - Edits are saved locally without consuming Firestore write quota.
 * - The free Spark plan (50k reads/day) is protected indefinitely!
 *
 * When UNLOCKED:
 * - Real-time listeners and Firestore writes are active for that module.
 */

export interface FeatureLockSettings {
  isGlobalLocked: boolean;
  invitationCode: boolean;
  storeMainPage: boolean;
  storeContacts: boolean;
  storeBranding: boolean;
  publicTicker: boolean;
  sellerTicker: boolean;
  subscriptions: boolean;
}

export type FeatureLockKey = keyof Omit<FeatureLockSettings, 'isGlobalLocked'>;

export const FEATURE_LOCK_NAMES: Record<FeatureLockKey, { name: string; description: string; tabId: string }> = {
  invitationCode: {
    name: 'Invitation Code',
    description: '4-digit seller registration code bar',
    tabId: 'invitation-code',
  },
  storeMainPage: {
    name: 'Store Main Page',
    description: 'Storefront hero, banners & featured showcase options',
    tabId: 'store-main-page',
  },
  storeContacts: {
    name: 'Store Contacts & Footer',
    description: 'Customer care phone, email, WhatsApp & footer details',
    tabId: 'store-contacts',
  },
  storeBranding: {
    name: 'Store Name & Branding',
    description: 'Marketplace store title, tagline & brand name',
    tabId: 'store-branding',
  },
  publicTicker: {
    name: 'Public Products Ticker',
    description: 'Storefront marquee ticker displaying hot deals & phones',
    tabId: 'public-ticker',
  },
  sellerTicker: {
    name: 'Seller Ticker Bar',
    description: 'Seller dashboard marquee ticker showing partner brands',
    tabId: 'seller-ticker',
  },
  subscriptions: {
    name: 'Subscription Plans',
    description: 'Monthly seller membership plan pricing & perks',
    tabId: 'subscriptions',
  },
};

export const DEFAULT_FEATURE_LOCKS: FeatureLockSettings = {
  isGlobalLocked: true,
  invitationCode: true,
  storeMainPage: true,
  storeContacts: true,
  storeBranding: true,
  publicTicker: true,
  sellerTicker: true,
  subscriptions: true,
};

const STORAGE_KEY = 'nexus_admin_feature_locks';
const LOCK_EVENT_NAME = 'nexus_feature_lock_changed';

/**
 * Synchronously retrieves feature lock settings from localStorage (defaults to all locked)
 */
export function getStoredFeatureLocks(): FeatureLockSettings {
  if (typeof window === 'undefined') return DEFAULT_FEATURE_LOCKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_FEATURE_LOCKS,
        ...parsed,
      };
    }
  } catch {}
  return DEFAULT_FEATURE_LOCKS;
}

/**
 * Saves feature lock settings to localStorage and dispatches an event
 */
export function saveStoredFeatureLocks(locks: FeatureLockSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));
    window.dispatchEvent(new CustomEvent(LOCK_EVENT_NAME, { detail: locks }));
  } catch {}
}

/**
 * Checks whether a specific feature is currently locked.
 * Returns true if locked, false if live Firestore sync is active.
 */
export function isFeatureLocked(key: FeatureLockKey): boolean {
  const locks = getStoredFeatureLocks();
  return Boolean(locks.isGlobalLocked || locks[key]);
}

/**
 * Toggles a single feature lock
 */
export function setSingleFeatureLock(key: FeatureLockKey, locked: boolean): FeatureLockSettings {
  const current = getStoredFeatureLocks();
  const updated: FeatureLockSettings = {
    ...current,
    [key]: locked,
  };
  // If all 7 features are locked, set isGlobalLocked to true
  const allLocked = (Object.keys(FEATURE_LOCK_NAMES) as FeatureLockKey[]).every((k) =>
    k === key ? locked : updated[k]
  );
  // If all are unlocked, set isGlobalLocked to false
  const anyLocked = (Object.keys(FEATURE_LOCK_NAMES) as FeatureLockKey[]).some((k) =>
    k === key ? locked : updated[k]
  );

  updated.isGlobalLocked = allLocked ? true : anyLocked ? current.isGlobalLocked : false;

  saveStoredFeatureLocks(updated);
  return updated;
}

/**
 * Sets all 7 static features to either LOCKED or UNLOCKED
 */
export function setAllFeaturesLock(locked: boolean): FeatureLockSettings {
  const updated: FeatureLockSettings = {
    isGlobalLocked: locked,
    invitationCode: locked,
    storeMainPage: locked,
    storeContacts: locked,
    storeBranding: locked,
    publicTicker: locked,
    sellerTicker: locked,
    subscriptions: locked,
  };
  saveStoredFeatureLocks(updated);
  return updated;
}

/**
 * Subscribes to feature lock changes across components and tabs
 */
export function subscribeToFeatureLocks(
  callback: (locks: FeatureLockSettings) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const custom = e as CustomEvent<FeatureLockSettings>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getStoredFeatureLocks());
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getStoredFeatureLocks());
    }
  };

  window.addEventListener(LOCK_EVENT_NAME, handler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener(LOCK_EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}
