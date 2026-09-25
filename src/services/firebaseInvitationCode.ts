import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { isFeatureLocked } from './firebaseFeatureLocks';

export const DEFAULT_INVITATION_CODE = '5201';
export const INVITATION_CODE_STORAGE_KEY = 'nexus_seller_invitation_code';
export const INVITATION_CODE_COLLECTION = 'settings';
export const INVITATION_CODE_DOC_ID = 'invitation_code';

export interface InvitationCodeMetadata {
  code: string;
  updatedAt: string;
  updatedBy?: string;
  isActive: boolean;
  description?: string;
}

/**
 * Validates that the invitation code is strictly a 4-digit numeric code.
 */
export function validateInvitationCodeFormat(code: string): { isValid: boolean; error?: string } {
  const clean = code.trim();
  if (!clean) {
    return { isValid: false, error: 'Invitation code cannot be empty.' };
  }
  if (!/^\d{4}$/.test(clean)) {
    return { isValid: false, error: 'Invitation code must be exactly 4 numeric digits (e.g., 5201, 1234).' };
  }
  return { isValid: true };
}

/**
 * Synchronously retrieves the cached invitation code from localStorage (or fallback default).
 */
export function getStoredInvitationCode(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(INVITATION_CODE_STORAGE_KEY);
      if (saved && /^\d{4}$/.test(saved.trim())) {
        return saved.trim();
      }
    } catch {}
  }
  return DEFAULT_INVITATION_CODE;
}

/**
 * Fetches the current 4-digit invitation code directly from Firestore database.
 * If not present, initializes it with the default 4-digit code.
 */
export async function fetchFirestoreInvitationCode(): Promise<{
  code: string;
  updatedAt: string;
  updatedBy?: string;
}> {
  // If feature is locked in Free-Tier Saver mode, skip Firestore read completely
  if (isFeatureLocked('invitationCode')) {
    return { code: getStoredInvitationCode(), updatedAt: new Date().toISOString() };
  }

  try {
    if (!db) {
      return { code: getStoredInvitationCode(), updatedAt: new Date().toISOString() };
    }

    const docRef = doc(db, INVITATION_CODE_COLLECTION, INVITATION_CODE_DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const rawCode = data?.code ? String(data.code).trim() : '';
      if (/^\d{4}$/.test(rawCode)) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(INVITATION_CODE_STORAGE_KEY, rawCode);
          } catch {}
        }
        return {
          code: rawCode,
          updatedAt: data?.updatedAt || new Date().toISOString(),
          updatedBy: data?.updatedBy || 'admin',
        };
      }
    }

    // If document does not exist or has non-4-digit legacy code, initialize with 4-digit default
    const defaultCode = DEFAULT_INVITATION_CODE;
    const nowIso = new Date().toISOString();
    await setDoc(
      docRef,
      {
        code: defaultCode,
        updatedAt: nowIso,
        updatedBy: 'system',
        isActive: true,
        description: 'Storewide 4-digit invitation code required for seller registration',
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(INVITATION_CODE_STORAGE_KEY, defaultCode);
      } catch {}
    }

    return { code: defaultCode, updatedAt: nowIso, updatedBy: 'system' };
  } catch (err) {
    console.warn('[Firestore] Notice fetching invitation code from database:', err);
    return { code: getStoredInvitationCode(), updatedAt: new Date().toISOString() };
  }
}

/**
 * Saves a new 4-digit invitation code to Firestore database and local cache.
 */
export async function saveFirestoreInvitationCode(
  newCode: string,
  updatedBy: string = 'admin'
): Promise<{ success: boolean; code: string; message: string }> {
  const cleanCode = newCode.trim();
  const validation = validateInvitationCodeFormat(cleanCode);
  if (!validation.isValid) {
    return {
      success: false,
      code: getStoredInvitationCode(),
      message: validation.error || 'Invalid 4-digit code.',
    };
  }

  // Update local cache immediately
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(INVITATION_CODE_STORAGE_KEY, cleanCode);
    } catch {}
  }

  // If locked in Free-Tier Saver mode, skip Firestore write completely
  if (isFeatureLocked('invitationCode')) {
    return {
      success: true,
      code: cleanCode,
      message: `Invitation code updated to ${cleanCode} locally. (🔒 Locked in Firebase Saver Mode - 0 database writes used)`,
    };
  }

  try {
    if (db) {
      const docRef = doc(db, INVITATION_CODE_COLLECTION, INVITATION_CODE_DOC_ID);
      const nowIso = new Date().toISOString();
      await setDoc(
        docRef,
        {
          code: cleanCode,
          updatedAt: nowIso,
          updatedBy,
          isActive: true,
          description: 'Storewide 4-digit invitation code required for seller registration',
          serverUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return {
      success: true,
      code: cleanCode,
      message: `Invitation code successfully updated to ${cleanCode} in database!`,
    };
  } catch (err: any) {
    console.error('[Firestore] Error saving invitation code to database:', err);
    // Still saved to local cache
    return {
      success: true,
      code: cleanCode,
      message: `Invitation code updated to ${cleanCode} locally. Database sync warning: ${err?.message || 'Offline'}`,
    };
  }
}

/**
 * Real-time Firestore listener for live updates to the 4-digit invitation code.
 */
export function listenToFirestoreInvitationCode(
  onUpdate: (code: string, metadata?: { updatedAt: string; updatedBy?: string }) => void
): () => void {
  // If feature is locked in Free-Tier Saver mode, skip Firestore listener completely
  if (isFeatureLocked('invitationCode')) {
    onUpdate(getStoredInvitationCode(), {
      updatedAt: new Date().toISOString(),
      updatedBy: 'cached',
    });
    return () => {};
  }

  try {
    if (!db) return () => {};

    const docRef = doc(db, INVITATION_CODE_COLLECTION, INVITATION_CODE_DOC_ID);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const rawCode = data?.code ? String(data.code).trim() : '';
          if (/^\d{4}$/.test(rawCode)) {
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(INVITATION_CODE_STORAGE_KEY, rawCode);
              } catch {}
            }
            onUpdate(rawCode, {
              updatedAt: data?.updatedAt || new Date().toISOString(),
              updatedBy: data?.updatedBy || 'admin',
            });
          }
        }
      },
      (error) => {
        console.warn('[Firestore] Notice listening to invitation code changes:', error);
      }
    );
  } catch (err) {
    console.warn('[Firestore] Failed to attach invitation code listener:', err);
    return () => {};
  }
}
