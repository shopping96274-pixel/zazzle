/**
 * Support Auto-Reply Service for Seller Customer Care
 *
 * Rule:
 * When a seller sends a message to customer care:
 * - If admin does NOT reply within 10 minutes:
 *   An automated reply is dispatched notifying the seller that customer care
 *   representatives are currently busy assisting others and will reply shortly.
 * - If admin replies within 10 minutes:
 *   The pending auto-reply is immediately cancelled and NO auto-reply is sent!
 */

export interface PendingSupportAutoReply {
  conversationId: string;
  sellerId: string;
  sellerName: string;
  candidateIds: string[];
  sellerMessageId: string;
  sellerMessageTime: number; // Unix timestamp (ms) when seller sent message
  dueAt: number; // sellerMessageTime + 10 minutes
  completed: boolean;
}

const STORAGE_KEY = 'nexus_pending_support_autoreplies';

// 10 minutes in milliseconds
export const SUPPORT_AUTOREPLY_DELAY_MS = 10 * 60 * 1000;

export const AUTO_REPLY_MESSAGE_TEXT =
  'Our customer care representatives are currently busy. We will get back to you shortly.';

/**
 * Retrieves all pending auto-replies from localStorage
 */
export function getPendingSupportAutoReplies(): Record<string, PendingSupportAutoReply> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves pending auto-replies map to localStorage
 */
export function savePendingSupportAutoReplies(map: Record<string, PendingSupportAutoReply>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch {}
}

/**
 * Checks if a conversation currently has a pending auto-reply scheduled
 */
export function getPendingAutoReplyForConversation(
  conversationId: string,
  candidateIds?: string[]
): PendingSupportAutoReply | null {
  const map = getPendingSupportAutoReplies();
  const allIds = [conversationId, ...(candidateIds || [])].map((id) => (id || '').trim()).filter(Boolean);

  for (const id of allIds) {
    const clean = id.replace(/^conv_/, '');
    const found = map[id] || map[clean] || map[`conv_${clean}`];
    if (found && !found.completed) {
      return found;
    }
  }
  return null;
}

/**
 * Schedules a 10-minute auto-reply when a seller sends a message
 */
export function scheduleSupportAutoReply(
  conversationId: string,
  sellerId: string,
  sellerName: string,
  candidateIds: string[],
  sellerMessageId: string
): void {
  if (!conversationId) return;
  const map = getPendingSupportAutoReplies();
  const existing = getPendingAutoReplyForConversation(conversationId, candidateIds);

  // If already an uncompleted pending auto-reply exists, don't restart the timer
  if (existing && !existing.completed && Date.now() < existing.dueAt) {
    return;
  }

  const now = Date.now();
  const cleanId = conversationId.startsWith('conv_') ? conversationId.replace(/^conv_/, '') : conversationId;

  const entry: PendingSupportAutoReply = {
    conversationId,
    sellerId: sellerId || cleanId,
    sellerName: sellerName || 'Seller',
    candidateIds: Array.from(new Set([conversationId, cleanId, `conv_${cleanId}`, ...(candidateIds || [])])),
    sellerMessageId,
    sellerMessageTime: now,
    dueAt: now + SUPPORT_AUTOREPLY_DELAY_MS,
    completed: false,
  };

  map[conversationId] = entry;
  map[cleanId] = entry;
  savePendingSupportAutoReplies(map);
}

/**
 * Cancels pending auto-reply when admin replies within 10 minutes
 */
export function cancelSupportAutoReply(conversationId: string, candidateIds?: string[]): void {
  if (!conversationId && (!candidateIds || candidateIds.length === 0)) return;
  const map = getPendingSupportAutoReplies();
  let modified = false;

  const allIds = [conversationId, ...(candidateIds || [])].map((id) => (id || '').trim()).filter(Boolean);
  allIds.forEach((id) => {
    const clean = id.replace(/^conv_/, '');
    if (map[id]) {
      delete map[id];
      modified = true;
    }
    if (map[clean]) {
      delete map[clean];
      modified = true;
    }
    if (map[`conv_${clean}`]) {
      delete map[`conv_${clean}`];
      modified = true;
    }
  });

  if (modified) {
    savePendingSupportAutoReplies(map);
  }
}
