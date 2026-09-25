import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { SellerLoginSession } from '../types';

export const LOGIN_SESSIONS_COLLECTION = 'seller_login_sessions';
const STORAGE_KEY = 'nexus_seller_login_sessions';

// BroadcastChannel for instant cross-tab synchrony
const sessionChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('seller_login_sessions_channel')
  : null;

/**
 * Parses user agent string to determine device type, category, and browser name.
 */
export function parseDeviceAndBrowser(uaString?: string): {
  deviceType: string;
  deviceCategory: 'mobile' | 'tablet' | 'desktop';
  browser: string;
} {
  const ua = uaString || (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  // 1. Device Type & Category
  let deviceType = 'Desktop PC';
  let deviceCategory: 'mobile' | 'tablet' | 'desktop' = 'desktop';

  if (/Android/i.test(ua)) {
    if (/Tablet|Nexus 7|Nexus 10|SM-T/i.test(ua) || (!/Mobile/i.test(ua) && /Android/i.test(ua))) {
      deviceType = 'Android Tablet';
      deviceCategory = 'tablet';
    } else {
      deviceType = 'Android Device';
      deviceCategory = 'mobile';
    }
  } else if (/iPad/i.test(ua)) {
    deviceType = 'iPad (iOS)';
    deviceCategory = 'tablet';
  } else if (/iPhone/i.test(ua)) {
    deviceType = 'iPhone (iOS)';
    deviceCategory = 'mobile';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'Mac OS';
    deviceCategory = 'desktop';
  } else if (/Windows NT/i.test(ua)) {
    deviceType = 'Windows PC';
    deviceCategory = 'desktop';
  } else if (/CrOS/i.test(ua)) {
    deviceType = 'Chromebook';
    deviceCategory = 'desktop';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'Linux Device';
    deviceCategory = 'desktop';
  } else if (/Mobile/i.test(ua)) {
    deviceType = 'Mobile Device';
    deviceCategory = 'mobile';
  }

  // 2. Browser
  let browser = 'Chrome';
  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = 'Safari';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Brave/i.test(ua)) {
    browser = 'Brave';
  }

  return { deviceType, deviceCategory, browser };
}

/**
 * Attempts to retrieve real client IP and location with quick timeout.
 * Uses ipwho.is as primary real-time geolocation lookup, falling back to secondary APIs
 * or client-detected system timezone rather than arbitrary static locations.
 */
/**
 * Comprehensive timezone to real location mapping.
 * Provides instant, zero-network fallback that accurately identifies user's real city & country.
 */
export const TIMEZONE_TO_LOCATION: Record<string, string> = {
  'Asia/Karachi': 'Karachi, Pakistan',
  'Asia/Lahore': 'Lahore, Pakistan',
  'Asia/Islamabad': 'Islamabad, Pakistan',
  'Asia/Kolkata': 'Kolkata, India',
  'Asia/Delhi': 'Delhi, India',
  'Asia/Mumbai': 'Mumbai, India',
  'Asia/Chennai': 'Chennai, India',
  'Asia/Bengaluru': 'Bengaluru, India',
  'Asia/Dhaka': 'Dhaka, Bangladesh',
  'Asia/Colombo': 'Colombo, Sri Lanka',
  'Asia/Kathmandu': 'Kathmandu, Nepal',
  'Asia/Kabul': 'Kabul, Afghanistan',
  'Asia/Dubai': 'Dubai, United Arab Emirates',
  'Asia/Abu_Dhabi': 'Abu Dhabi, United Arab Emirates',
  'Asia/Muscat': 'Muscat, Oman',
  'Asia/Riyadh': 'Riyadh, Saudi Arabia',
  'Asia/Jeddah': 'Jeddah, Saudi Arabia',
  'Asia/Qatar': 'Doha, Qatar',
  'Asia/Kuwait': 'Kuwait City, Kuwait',
  'Asia/Bahrain': 'Manama, Bahrain',
  'Asia/Singapore': 'Singapore',
  'Asia/Kuala_Lumpur': 'Kuala Lumpur, Malaysia',
  'Asia/Jakarta': 'Jakarta, Indonesia',
  'Asia/Bangkok': 'Bangkok, Thailand',
  'Asia/Manila': 'Manila, Philippines',
  'Asia/Hong_Kong': 'Hong Kong',
  'Asia/Tokyo': 'Tokyo, Japan',
  'Asia/Seoul': 'Seoul, South Korea',
  'Europe/London': 'London, United Kingdom',
  'Europe/Berlin': 'Berlin, Germany',
  'Europe/Paris': 'Paris, France',
  'Europe/Rome': 'Rome, Italy',
  'Europe/Madrid': 'Madrid, Spain',
  'Europe/Amsterdam': 'Amsterdam, Netherlands',
  'Europe/Istanbul': 'Istanbul, Turkey',
  'America/New_York': 'New York, US',
  'America/Chicago': 'Chicago, US',
  'America/Los_Angeles': 'Los Angeles, US',
  'America/Toronto': 'Toronto, Canada',
  'Australia/Sydney': 'Sydney, Australia',
};

/**
 * Gets real client geographic location derived from browser system timezone.
 */
export function getSystemTimezoneLocation(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_LOCATION[tz]) {
      return TIMEZONE_TO_LOCATION[tz];
    }
    if (tz) {
      const parts = tz.split('/').reverse();
      return parts.map((p) => p.replace(/_/g, ' ')).join(', ');
    }
  } catch {}
  return 'Active Seller Device';
}

/**
 * Retrieves the client's actual real IP and real physical location.
 * Prioritizes live browser geolocation APIs (ipwho.is, freeipapi.com) and native browser timezone.
 * Strictly avoids default USA fallbacks.
 */
export async function getClientIpAndLocation(fallback?: { city?: string; country?: string }): Promise<{
  ip: string;
  location: string;
}> {
  const systemTz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat)
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    : '';
  const tzLoc = getSystemTimezoneLocation();
  const isTzInAmerica = systemTz.startsWith('America/');

  // 1. If seller already has a registered valid city and country from their profile, use it!
  const hasValidProfileLocation = Boolean(
    fallback?.city &&
    fallback.city.trim() &&
    fallback?.country &&
    fallback.country.trim() &&
    fallback.country.toUpperCase() !== 'USA' &&
    fallback.country.toUpperCase() !== 'UNITED STATES'
  );

  let detectedIp = '';
  let resolvedLocation = hasValidProfileLocation
    ? `${fallback!.city.trim()}, ${fallback!.country.trim()}`
    : tzLoc;

  // 2. Fetch public client IP (from ipify or ipwho.is)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        detectedIp = data.ip;
      }
    }
  } catch {}

  // 3. If we don't have profile location, try geo-ip lookup with cloud proxy defense:
  if (!hasValidProfileLocation) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success !== false && data.ip) {
          if (!detectedIp) detectedIp = data.ip;

          const isCountryUSA =
            data.country === 'United States' ||
            data.country === 'US' ||
            data.country_code === 'US';

          // Cloud Proxy Guard: If the geo-IP returned USA, but the client browser timezone is NOT in America,
          // then the USA result is a cloud container or datacenter proxy! Do NOT use USA.
          if (isCountryUSA && !isTzInAmerica) {
            resolvedLocation = tzLoc || (fallback?.city ? `${fallback.city}, ${fallback.country || ''}` : 'Active Device');
          } else {
            const parts = [data.city, data.region, data.country].filter(Boolean);
            if (parts.length > 0) {
              resolvedLocation = parts.join(', ');
            }
          }
        }
      }
    } catch {}
  }

  // 4. Secondary fallback for geo lookup if still needed
  if (!resolvedLocation || resolvedLocation === 'Active Seller Device') {
    resolvedLocation = tzLoc || 'Active Device';
  }

  return {
    ip: detectedIp || 'Direct Connection',
    location: resolvedLocation,
  };
}

/**
 * Formats a Date or timestamp into exact readable format according to the user's system time & locale.
 * e.g. "Sep 9, 2026, 01:15:30 PM"
 */
export function formatLoginTime(timestamp: number | Date = new Date()): string {
  const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Initial seed sessions so admin views active records right away
 */
export const INITIAL_SELLER_SESSIONS: SellerLoginSession[] = [
  {
    id: 'sess_init_1',
    sellerName: 'David Miller',
    shopName: 'Elite Electronics',
    email: 'david@eliteelectronics.com',
    phone: '+92 300 1234567',
    deviceType: 'Android Device',
    deviceCategory: 'mobile',
    browser: 'Chrome',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
    ip: '39.45.12.89',
    location: 'Karachi, Sindh, PK',
    loginTime: formatLoginTime(Date.now() - 1000 * 60 * 18), // 18 mins ago
    timestamp: Date.now() - 1000 * 60 * 18,
  },
  {
    id: 'sess_init_2',
    sellerName: 'Marcus Vance',
    shopName: 'Apex Audio & Gear',
    email: 'marcus@apexaudio.com',
    phone: '+92 321 8765432',
    deviceType: 'Windows PC',
    deviceCategory: 'desktop',
    browser: 'Microsoft Edge',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2739.42',
    ip: '182.180.45.12',
    location: 'Lahore, Punjab, PK',
    loginTime: formatLoginTime(Date.now() - 1000 * 60 * 65), // 1 hour ago
    timestamp: Date.now() - 1000 * 60 * 65,
  },
  {
    id: 'sess_init_3',
    sellerName: 'Elena Rostova',
    shopName: 'Velvet Craft Co',
    email: 'elena@velvetcraft.com',
    phone: '+971 50 345 6789',
    deviceType: 'iPhone (iOS)',
    deviceCategory: 'mobile',
    browser: 'Safari',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
    ip: '94.200.12.84',
    location: 'Dubai, UAE',
    loginTime: formatLoginTime(Date.now() - 1000 * 60 * 140), // 2 hours ago
    timestamp: Date.now() - 1000 * 60 * 140,
  },
  {
    id: 'sess_init_4',
    sellerName: 'Aarav Patel',
    shopName: 'Heritage Textiles',
    email: 'aarav@heritagetextiles.com',
    phone: '+91 98765 43210',
    deviceType: 'Mac OS',
    deviceCategory: 'desktop',
    browser: 'Chrome',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    ip: '49.36.128.214',
    location: 'Mumbai, MH, IN',
    loginTime: formatLoginTime(Date.now() - 1000 * 60 * 360), // 6 hours ago
    timestamp: Date.now() - 1000 * 60 * 360,
  },
];

/**
 * Saves a new seller login session to LocalStorage, Firestore, and broadcasts it across tabs.
 */
export async function saveSellerLoginSession(
  sessionInput: Partial<SellerLoginSession> & {
    sellerName: string;
    email: string;
  }
): Promise<SellerLoginSession> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const parsed = parseDeviceAndBrowser(sessionInput.userAgent || ua);
  const now = Date.now();

  // 1. Determine session ID:
  // If sessionInput.id is provided, use it.
  // Otherwise, if the seller already has an existing active session from the last 20 minutes in localStorage,
  // update that session's timestamp and activity instead of creating duplicate records.
  let rawExisting: SellerLoginSession[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    rawExisting = raw ? JSON.parse(raw) : INITIAL_SELLER_SESSIONS;
  } catch {
    rawExisting = INITIAL_SELLER_SESSIONS;
  }

  let targetId = sessionInput.id;
  if (!targetId && sessionInput.email) {
    const emailNorm = sessionInput.email.toLowerCase().trim();
    const recentSession = rawExisting.find(
      (s) =>
        s.email &&
        s.email.toLowerCase().trim() === emailNorm &&
        now - s.timestamp < 20 * 60 * 1000 // within 20 minutes
    );
    if (recentSession) {
      targetId = recentSession.id;
    }
  }

  if (!targetId) {
    targetId = `sess_${now}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const finalSession: SellerLoginSession = {
    id: targetId,
    sellerId: sessionInput.sellerId,
    sellerName: sessionInput.sellerName,
    email: sessionInput.email,
    phone: sessionInput.phone || '',
    shopName: sessionInput.shopName || '',
    deviceType: sessionInput.deviceType || parsed.deviceType,
    deviceCategory: sessionInput.deviceCategory || parsed.deviceCategory,
    browser: sessionInput.browser || parsed.browser,
    userAgent: sessionInput.userAgent || ua,
    ip: sessionInput.ip || 'Direct Connection',
    location: (() => {
      const inputLoc = sessionInput.location?.trim();
      const tzLoc = getSystemTimezoneLocation();
      const systemTz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat)
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        : '';
      const isTzInAmerica = systemTz.startsWith('America/');
      if (inputLoc && (inputLoc.includes('United States') || inputLoc.includes('USA') || inputLoc === 'US') && !isTzInAmerica) {
        return tzLoc;
      }
      return inputLoc || tzLoc;
    })(),
    loginTime: sessionInput.loginTime || formatLoginTime(now),
    timestamp: now,
    activityType: sessionInput.activityType || 'Store Dashboard Active',
    lastActiveTime: formatLoginTime(now),
  };

  // 1. Save to localStorage (put updated/new session at the very front)
  try {
    const updated = [finalSession, ...rawExisting.filter((s) => s.id !== finalSession.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 100))); // Keep last 100
  } catch (err) {
    console.warn('[SessionLogging] localStorage write error:', err);
  }

  // 2. Broadcast cross-tab
  if (sessionChannel) {
    try {
      sessionChannel.postMessage({ type: 'SESSION_ADDED', session: finalSession });
    } catch {}
  }

  // 3. Save to Firestore
  if (db) {
    try {
      const docRef = doc(db, LOGIN_SESSIONS_COLLECTION, finalSession.id);
      await setDoc(docRef, finalSession, { merge: true });
      console.log(`[Firestore] Recorded seller login session for ${finalSession.sellerName} (${finalSession.email})`);
    } catch (err) {
      console.warn('[Firestore] Error saving seller login session:', err);
    }
  }

  return finalSession;
}

/**
 * Retrieves all stored seller login sessions.
 */
export async function getSellerLoginSessions(): Promise<SellerLoginSession[]> {
  // Try Firestore first
  if (db) {
    try {
      const colRef = collection(db, LOGIN_SESSIONS_COLLECTION);
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: SellerLoginSession[] = [];
        snap.forEach((d) => list.push(d.data() as SellerLoginSession));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn('[Firestore] Failed to fetch login sessions, falling back to local:', err);
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Seed default if empty
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SELLER_SESSIONS));
  return INITIAL_SELLER_SESSIONS;
}

/**
 * Real-time listener for login sessions.
 */
export function listenToFirestoreLoginSessions(
  onUpdate: (sessions: SellerLoginSession[]) => void
): () => void {
  // Cross-tab broadcast listener
  const handleBroadcast = (e: MessageEvent) => {
    if (e.data && e.data.type === 'SESSION_ADDED') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          onUpdate(JSON.parse(raw));
        }
      } catch {}
    }
  };

  if (sessionChannel) {
    sessionChannel.addEventListener('message', handleBroadcast);
  }

  if (!db) {
    // Return unsubscribe for broadcast
    return () => {
      if (sessionChannel) {
        sessionChannel.removeEventListener('message', handleBroadcast);
      }
    };
  }

  try {
    const colRef = collection(db, LOGIN_SESSIONS_COLLECTION);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const sessions: SellerLoginSession[] = [];
          snapshot.forEach((docSnap) => {
            sessions.push(docSnap.data() as SellerLoginSession);
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
          onUpdate(sessions);
        }
      },
      (err) => {
        console.warn('[Firestore] Login sessions snapshot listener error:', err);
      }
    );

    return () => {
      unsubscribe();
      if (sessionChannel) {
        sessionChannel.removeEventListener('message', handleBroadcast);
      }
    };
  } catch {
    return () => {
      if (sessionChannel) {
        sessionChannel.removeEventListener('message', handleBroadcast);
      }
    };
  }
}

/**
 * Delete a session from Firestore and local storage
 */
export async function deleteSellerLoginSession(id: string): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list: SellerLoginSession[] = JSON.parse(raw);
      const filtered = list.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {}

  if (db) {
    try {
      await deleteDoc(doc(db, LOGIN_SESSIONS_COLLECTION, id));
    } catch {}
  }
}

/**
 * Permanently delete all login sessions belonging to a specific seller from Firestore and localStorage
 */
export async function deleteSellerLoginSessionsBySeller(sellerId: string, email?: string): Promise<void> {
  if (!sellerId && !email) return;

  // 1. Clean localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list: SellerLoginSession[] = JSON.parse(raw);
      const filtered = list.filter((s) => {
        const matchesSellerId = sellerId && (s.sellerId === sellerId || (s as any).userId === sellerId);
        const matchesEmail = email && s.email && s.email.toLowerCase().trim() === email.toLowerCase().trim();
        return !matchesSellerId && !matchesEmail;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {}

  // 2. Broadcast cross-tab
  try {
    if (sessionChannel) {
      sessionChannel.postMessage({ type: 'ALL_SESSIONS_DELETED_FOR_SELLER', sellerId, email });
    }
  } catch {}

  if (!db) return;

  try {
    const sessionsCol = collection(db, LOGIN_SESSIONS_COLLECTION);
    const deleteIds = new Set<string>();

    if (sellerId) {
      const qSellerId = query(sessionsCol, where('sellerId', '==', sellerId));
      const snap1 = await getDocs(qSellerId);
      snap1.forEach((d) => deleteIds.add(d.id));
    }

    if (email) {
      const qEmail = query(sessionsCol, where('email', '==', email.toLowerCase().trim()));
      const snap2 = await getDocs(qEmail);
      snap2.forEach((d) => deleteIds.add(d.id));
    }

    const deletePromises = Array.from(deleteIds).map((docId) =>
      deleteDoc(doc(db, LOGIN_SESSIONS_COLLECTION, docId))
    );
    await Promise.all(deletePromises);
    console.log(`[Firestore] Deleted ${deleteIds.size} login sessions for seller ${sellerId || email} from Firestore.`);
  } catch (err) {
    console.warn('[Firestore] Error deleting seller login sessions from Firestore:', err);
  }
}
