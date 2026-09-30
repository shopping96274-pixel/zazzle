import {
  collection,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  getDocs,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Message, Conversation, NotificationItem } from '../types';

const CHAT_COLLECTION = 'chat_messages';
const CONVERSATIONS_COLLECTION = 'conversations';
const NOTIFICATIONS_COLLECTION = 'notifications';

const DELETED_MESSAGES_KEY = 'nexus_deleted_msg_ids';
const CONV_CLEARED_TIMES_KEY = 'nexus_conv_cleared_times';
const DELETED_CHAT_THREADS_KEY = 'nexus_deleted_chat_threads';

const deletedMsgMemorySet = new Set<string>();
try {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(DELETED_MESSAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => deletedMsgMemorySet.add(id));
      }
    }
  }
} catch {}

/**
 * Normalizes any seller or conversation identifier into its canonical clean seller ID.
 * Strips any prefixes like 'conv_' to prevent duplicate phantom rooms or unknown accounts.
 */
export function getCanonicalSellerChatId(rawId?: string): string {
  if (!rawId) return '';
  let clean = rawId.trim();
  while (clean.startsWith('conv_')) {
    clean = clean.replace(/^conv_/, '');
  }
  return clean;
}

/**
 * Resolves any seller object or identifier into the single authoritative chat room ID
 */
export function getSellerChatRoomId(sellerOrId: any, sellersList?: any[]): string {
  if (!sellerOrId) return 'support_general';
  if (typeof sellerOrId === 'object' && sellerOrId !== null) {
    if (sellerOrId.id) return getCanonicalSellerChatId(sellerOrId.id);
    if (sellerOrId.userId) return getCanonicalSellerChatId(sellerOrId.userId);
  }
  const clean = getCanonicalSellerChatId(String(sellerOrId));
  if (sellersList && sellersList.length > 0) {
    const found = sellersList.find(
      (s) =>
        s.id === clean ||
        s.userId === clean ||
        (s.email && s.email.toLowerCase() === clean.toLowerCase())
    );
    if (found && found.id) {
      return getCanonicalSellerChatId(found.id);
    }
  }
  return clean || 'support_general';
}

/**
 * Direct real-time listener using Firebase onSnapshot
 * Continuously delivers messages without page refresh across candidate room IDs
 */
export function subscribeToChatMessages(
  chatRoomId: string | string[],
  onMessages: (messages: Message[]) => void
): () => void {
  if (!db || !chatRoomId) {
    onMessages([]);
    return () => {};
  }

  const rawList = Array.isArray(chatRoomId) ? chatRoomId : [chatRoomId];
  const canonicalRooms = Array.from(
    new Set(
      rawList
        .map((id) => getCanonicalSellerChatId(id))
        .filter((id) => Boolean(id) && id !== 'user_admin' && id !== 'admin')
    )
  );

  if (canonicalRooms.length === 0) {
    onMessages([]);
    return () => {};
  }

  const roomMessagesMap: Record<string, Message[]> = {};
  const unsubs: (() => void)[] = [];

  const emitMerged = () => {
    const combined = new Map<string, Message>();
    Object.values(roomMessagesMap).forEach((list) => {
      list.forEach((m) => {
        if (!isChatMessageDeleted(m.id)) {
          combined.set(m.id, m);
        }
      });
    });

    const merged = Array.from(combined.values()).sort((a, b) => {
      const timeA = (a as any).clientTimestamp || new Date(a.timestamp).getTime();
      const timeB = (b as any).clientTimestamp || new Date(b.timestamp).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });

    onMessages(merged);
  };

  try {
    canonicalRooms.forEach((rId) => {
      const colRef = collection(db, 'chats', rId, 'messages');
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const msgs: Message[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const msgId = data.id || data.messageId || docId;

            if (isChatMessageDeleted(docId) || isChatMessageDeleted(msgId)) {
              return;
            }

            let timeString = new Date().toISOString();
            if (data.timestamp) {
              if (typeof data.timestamp.toDate === 'function') {
                timeString = data.timestamp.toDate().toISOString();
              } else if (typeof data.timestamp === 'string') {
                timeString = data.timestamp;
              } else if (typeof data.timestamp === 'number') {
                timeString = new Date(data.timestamp).toISOString();
              }
            } else if (data.createdAt) {
              if (typeof data.createdAt.toDate === 'function') {
                timeString = data.createdAt.toDate().toISOString();
              } else if (typeof data.createdAt === 'string') {
                timeString = data.createdAt;
              }
            } else if (data.clientTimestamp) {
              timeString = new Date(data.clientTimestamp).toISOString();
            }

            const roleStr = String(data.senderRole || '').toUpperCase();
            const normalizedRole = roleStr === 'SELLER' ? 'SELLER' : 'ADMIN';

            msgs.push({
              id: msgId,
              messageId: msgId,
              conversationId: data.conversationId || rId,
              senderId: data.senderId || '',
              receiverId: data.receiverId || (normalizedRole === 'SELLER' ? 'user_admin' : rId),
              senderName: data.senderName || (normalizedRole === 'SELLER' ? 'Seller' : 'Customer Care'),
              senderRole: normalizedRole,
              text: data.text || '',
              imageUrl: data.imageUrl || undefined,
              timestamp: timeString,
              isRead: Boolean(data.isRead),
              clientTimestamp: data.clientTimestamp || (data.createdAt ? new Date(timeString).getTime() : Date.now()),
              candidateIds: data.candidateIds || [rId],
            } as any);
          });

          roomMessagesMap[rId] = msgs;
          emitMerged();
        },
        (error) => {
          console.warn(`[Firestore Chat] Listener on chats/${rId}/messages:`, error);
        }
      );

      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {}
      });
    };
  } catch (err) {
    console.warn('[Firestore Chat] Error setting up listener:', err);
    return () => {};
  }
}

/**
 * Direct real-time message sending function
 * Writes to Firestore chats/{chatRoomId}/messages and updates chats/{chatRoomId} preview
 */
export async function sendRealtimeChatMessage(params: {
  chatRoomId: string;
  senderId: string;
  senderRole: 'ADMIN' | 'SELLER';
  senderName: string;
  text: string;
  imageUrl?: string;
  messageId?: string;
  sellerProfile?: {
    id: string;
    userId?: string;
    shopName?: string;
    email?: string;
  };
}): Promise<string> {
  const { chatRoomId, senderId, senderRole, senderName, text, imageUrl, messageId, sellerProfile } = params;
  const cleanRoomId = getCanonicalSellerChatId(chatRoomId) || 'support_general';
  const msgDocId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const isoTime = new Date(now).toISOString();

  // Reset any clear time or deleted thread markers
  clearConversationClearedTime(cleanRoomId, [cleanRoomId, sellerProfile?.id || '', sellerProfile?.userId || '']);
  restoreChatThread(cleanRoomId, [cleanRoomId, sellerProfile?.id || '', sellerProfile?.userId || '']);

  // Collect target rooms to broadcast
  const targetRooms = new Set<string>();
  if (cleanRoomId && cleanRoomId !== 'user_admin' && cleanRoomId !== 'admin') targetRooms.add(cleanRoomId);
  if (sellerProfile?.id) {
    const sId = getCanonicalSellerChatId(sellerProfile.id);
    if (sId && sId !== 'user_admin' && sId !== 'admin') targetRooms.add(sId);
  }
  if (sellerProfile?.userId) {
    const uId = getCanonicalSellerChatId(sellerProfile.userId);
    if (uId && uId !== 'user_admin' && uId !== 'admin') targetRooms.add(uId);
  }
  if (targetRooms.size === 0) {
    targetRooms.add(cleanRoomId || 'support_general');
  }

  const msgPayload = {
    id: msgDocId,
    messageId: msgDocId,
    chatId: cleanRoomId,
    conversationId: cleanRoomId,
    candidateIds: Array.from(targetRooms),
    sellerId: sellerProfile?.id || cleanRoomId,
    senderId,
    receiverId: senderRole === 'SELLER' ? 'user_admin' : cleanRoomId,
    senderRole,
    senderName,
    text: text || '',
    imageUrl: imageUrl || null,
    clientTimestamp: now,
    createdAt: serverTimestamp(),
    timestamp: isoTime,
    isRead: false,
  };

  // Cross-tab broadcast for instant local tabs synchronization
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('nexus_chat_channel');
      bc.postMessage({
        type: 'NEW_CHAT_MESSAGE',
        chatRoomId: cleanRoomId,
        message: msgPayload,
      });
      bc.close();
    }
  } catch {}

  if (db) {
    try {
      const summaryText = text || (imageUrl ? '📷 Photo' : 'Message');
      const writePromises: Promise<any>[] = [];

      for (const rId of Array.from(targetRooms)) {
        const msgRef = doc(collection(db, 'chats', rId, 'messages'), msgDocId);
        writePromises.push(
          setDoc(msgRef, { ...msgPayload, conversationId: rId }, { merge: true })
        );

        const threadRef = doc(db, 'chats', rId);
        writePromises.push(
          setDoc(
            threadRef,
            {
              id: rId,
              sellerId: sellerProfile?.id || rId,
              sellerShopName: sellerProfile?.shopName || (senderRole === 'SELLER' ? senderName : 'Seller'),
              sellerEmail: sellerProfile?.email || '',
              lastMessage: summaryText,
              lastMessageText: summaryText,
              lastSenderRole: senderRole,
              lastSenderName: senderName,
              lastSenderId: senderId,
              lastMessageTime: isoTime,
              updatedAt: serverTimestamp(),
              unreadAdmin: senderRole === 'SELLER' ? 1 : 0,
              unreadSeller: senderRole === 'ADMIN' ? 1 : 0,
              unreadCountParticipantOne: senderRole === 'ADMIN' ? 1 : 0,
              unreadCountParticipantTwo: senderRole === 'SELLER' ? 1 : 0,
              participantOneId: rId,
              participantOneName: sellerProfile?.shopName || 'Seller',
              participantOneRole: 'SELLER',
              participantTwoId: 'user_admin',
              participantTwoName: 'Customer Care & Admin',
              participantTwoRole: 'ADMIN',
            },
            { merge: true }
          )
        );
      }

      // Legacy collection
      const legacyRef = doc(db, CHAT_COLLECTION, msgDocId);
      writePromises.push(setDoc(legacyRef, msgPayload, { merge: true }));

      await Promise.allSettled(writePromises);
    } catch (err) {
      console.warn('[Firestore Chat] sendRealtimeChatMessage notice:', err);
    }
  }

  return msgDocId;
}

export function isChatMessageDeleted(messageId: string): boolean {
  if (!messageId) return false;
  if (deletedMsgMemorySet.has(messageId)) return true;
  return false;
}

export function recordDeletedChatMessageId(messageId: string): void {
  if (!messageId) return;
  deletedMsgMemorySet.add(messageId);
  try {
    if (typeof localStorage !== 'undefined') {
      const list = Array.from(deletedMsgMemorySet);
      localStorage.setItem(DELETED_MESSAGES_KEY, JSON.stringify(list.slice(-500)));
    }
  } catch {}

  // Sync deletion marker to Firestore deleted_messages collection for instant cross-device removal
  if (db) {
    setDoc(doc(db, 'deleted_messages', messageId), {
      messageId,
      deletedAt: serverTimestamp(),
    }).catch(() => {});
  }
}

/**
 * Real-time listener for deleted messages across all clients and devices
 */
export function listenToDeletedMessages(
  onDeleted: (msgId: string) => void
): () => void {
  if (!db) return () => {};
  try {
    const colRef = collection(db, 'deleted_messages');
    return onSnapshot(
      colRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const delId = change.doc.id || change.doc.data()?.messageId;
            if (delId) {
              deletedMsgMemorySet.add(delId);
              try {
                if (typeof localStorage !== 'undefined') {
                  const list = Array.from(deletedMsgMemorySet);
                  localStorage.setItem(DELETED_MESSAGES_KEY, JSON.stringify(list.slice(-500)));
                }
              } catch {}
              onDeleted(delId);
            }
          }
        });
      },
      (err) => {
        console.warn('[Firestore] Notice on deleted_messages listener:', err);
      }
    );
  } catch {
    return () => {};
  }
}

export function getConversationClearedTime(convId: string): number {
  if (!convId) return 0;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CONV_CLEARED_TIMES_KEY) : null;
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const clean = convId.startsWith('conv_') ? convId.replace(/^conv_/, '') : convId;
    return Math.max(map[convId] || 0, map[clean] || 0, map[`conv_${clean}`] || 0);
  } catch {
    return 0;
  }
}

export function recordConversationCleared(convId: string, candidateIds?: string[]): void {
  if (!convId) return;
  const now = Date.now();
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CONV_CLEARED_TIMES_KEY) : null;
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const all = [convId, ...(candidateIds || [])];
    all.forEach((id) => {
      if (id) {
        const clean = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
        map[id] = now;
        map[clean] = now;
        map[`conv_${clean}`] = now;
      }
    });
    localStorage.setItem(CONV_CLEARED_TIMES_KEY, JSON.stringify(map));
  } catch {}
}

export function clearConversationClearedTime(convId: string, candidateIds?: string[]): void {
  if (!convId && (!candidateIds || candidateIds.length === 0)) return;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CONV_CLEARED_TIMES_KEY) : null;
    if (!raw) return;
    const map: Record<string, number> = JSON.parse(raw);
    const all = [convId, ...(candidateIds || [])].filter(Boolean);
    all.forEach((id) => {
      const clean = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
      delete map[id];
      delete map[clean];
      delete map[`conv_${clean}`];
      delete map[`seller_${clean}`];
    });
    localStorage.setItem(CONV_CLEARED_TIMES_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Chat Thread (Seller) Deletion Management for Chat List:
 * If admin deletes a seller from chat list, it stays deleted/hidden until:
 * 1. Admin manually sends a message to that seller, OR
 * 2. Seller sends a new message to admin, OR
 * 3. Admin clicks to start chat with that seller.
 */
export function getDeletedChatThreadsMap(): Record<string, number> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DELETED_CHAT_THREADS_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordChatThreadDeleted(threadId: string, candidateIds?: string[]): void {
  if (!threadId && (!candidateIds || candidateIds.length === 0)) return;
  const now = Date.now();
  try {
    const map = getDeletedChatThreadsMap();
    const all = [threadId, ...(candidateIds || [])].filter(Boolean);
    all.forEach((id) => {
      const clean = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
      map[id] = now;
      map[clean] = now;
      map[`conv_${clean}`] = now;
      map[`seller_${clean}`] = now;
    });
    localStorage.setItem(DELETED_CHAT_THREADS_KEY, JSON.stringify(map));

    // Also persist deletion record in Firestore if db is ready
    if (db) {
      const cleanId = threadId.startsWith('conv_') ? threadId.replace(/^conv_/, '') : threadId;
      setDoc(doc(db, 'deleted_chat_threads', cleanId), {
        deletedAt: serverTimestamp(),
        threadId,
        candidateIds: all,
      }).catch(() => {});
    }
  } catch {}
}

export function restoreChatThread(threadId: string, candidateIds?: string[]): void {
  if (!threadId && (!candidateIds || candidateIds.length === 0)) return;
  try {
    const map = getDeletedChatThreadsMap();
    const all = [threadId, ...(candidateIds || [])].filter(Boolean);
    all.forEach((id) => {
      const clean = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
      delete map[id];
      delete map[clean];
      delete map[`conv_${clean}`];
      delete map[`seller_${clean}`];
    });
    localStorage.setItem(DELETED_CHAT_THREADS_KEY, JSON.stringify(map));

    // Also clear conversation cleared times so new messages are immediately visible
    clearConversationClearedTime(threadId, candidateIds);

    if (db) {
      const cleanId = threadId.startsWith('conv_') ? threadId.replace(/^conv_/, '') : threadId;
      deleteDoc(doc(db, 'deleted_chat_threads', cleanId)).catch(() => {});
      all.forEach((id) => {
        const c = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
        deleteDoc(doc(db, 'deleted_chat_threads', c)).catch(() => {});
      });
    }
  } catch {}
}

export function isChatThreadDeleted(
  candidateIds: string[],
  lastMessageTime?: string | number | null
): boolean {
  if (!candidateIds || candidateIds.length === 0) return false;
  try {
    const map = getDeletedChatThreadsMap();
    let maxDeletedAt = 0;
    candidateIds.forEach((id) => {
      if (!id) return;
      const clean = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
      const t1 = map[id] || 0;
      const t2 = map[clean] || 0;
      const t3 = map[`conv_${clean}`] || 0;
      const t4 = map[`seller_${clean}`] || 0;
      const m = Math.max(t1, t2, t3, t4);
      if (m > maxDeletedAt) {
        maxDeletedAt = m;
      }
    });

    if (maxDeletedAt === 0) return false;

    // If there is a last message time recorded
    if (lastMessageTime) {
      const msgTime = typeof lastMessageTime === 'number' ? lastMessageTime : new Date(lastMessageTime).getTime();
      // If a message was sent or received after deletion timestamp (with 2s tolerance for clock drift), it is NOT deleted!
      if (!isNaN(msgTime) && msgTime >= (maxDeletedAt - 2000)) {
        return false;
      }
    } else {
      // If no message time recorded, do not aggressively delete
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 1. Firestore mein Message Send Karne ka Function (Seller aur Admin dono ke liye)
 * Concurrently writes to canonical chats/{chatId}/messages and updates preview doc chats/{chatId}
 */
export async function sendChatMessage(
  senderId: string,
  receiverId: string,
  messageText: string,
  senderRole: string,
  extra?: {
    imageUrl?: string;
    senderName?: string;
    messageId?: string;
    candidateIds?: string[];
    sellerId?: string;
    conversationId?: string;
  }
): Promise<string | undefined> {
  const normalizedRole = (senderRole || '').toUpperCase();
  const isSeller = normalizedRole === 'SELLER';

  // Determine the canonical chat room ID for this seller
  let rawTarget = isSeller
    ? (extra?.sellerId || extra?.conversationId || senderId)
    : (extra?.sellerId || receiverId || extra?.conversationId || '');

  if (!isSeller && (rawTarget === 'user_admin' || rawTarget === 'admin')) {
    rawTarget = extra?.sellerId || extra?.conversationId || receiverId || '';
  }

  const canonicalChatId = getCanonicalSellerChatId(rawTarget) || (isSeller ? senderId : 'support_general');
  const msgDocId = extra?.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Automatically restore chat thread from deleted list on new message send
  restoreChatThread(canonicalChatId, [canonicalChatId, ...(extra?.candidateIds || [])]);
  clearConversationClearedTime(canonicalChatId, [canonicalChatId, ...(extra?.candidateIds || [])]);

  // Determine target rooms (clean only, max 3 valid IDs to prevent sequential latency)
  const targetRooms = new Set<string>();
  if (canonicalChatId) targetRooms.add(canonicalChatId);
  if (extra?.sellerId) {
    const sId = getCanonicalSellerChatId(extra.sellerId);
    if (sId) targetRooms.add(sId);
  }
  if (extra?.conversationId) {
    const cId = getCanonicalSellerChatId(extra.conversationId);
    if (cId && cId !== 'user_admin' && cId !== 'admin') targetRooms.add(cId);
  }
  if (isSeller && senderId) {
    const cleanSender = getCanonicalSellerChatId(senderId);
    if (cleanSender && cleanSender !== 'user_admin' && cleanSender !== 'admin') targetRooms.add(cleanSender);
  }

  const isoTime = new Date().toISOString();
  const messageData: any = {
    id: msgDocId,
    messageId: msgDocId,
    senderId: senderId,
    receiverId: isSeller ? 'user_admin' : canonicalChatId,
    conversationId: canonicalChatId,
    senderRole: isSeller ? 'SELLER' : 'ADMIN',
    text: messageText || '',
    senderName: extra?.senderName || (isSeller ? 'Seller' : 'Platform Support Team'),
    clientTimestamp: Date.now(),
    createdAt: isoTime,
    timestamp: isoTime,
    serverTimestamp: serverTimestamp(),
  };

  if (extra?.imageUrl) {
    messageData.imageUrl = extra.imageUrl;
  }

  // Cross-tab broadcast for instant 0ms delivery
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('nexus_chat_channel');
      bc.postMessage({
        type: 'NEW_CHAT_MESSAGE',
        message: {
          ...messageData,
          timestamp: new Date().toISOString(),
          candidateIds: Array.from(targetRooms),
        },
      });
      bc.close();
    }
  } catch {}

  if (!db) return msgDocId;

  try {
    const summaryText = messageText || (extra?.imageUrl ? '📷 Photo' : 'Message');
    const writePromises: Promise<any>[] = [];

    // 1. Parallel write to all target room message collections and top doc preview
    for (const rId of Array.from(targetRooms)) {
      const messagesCol = collection(db, 'chats', rId, 'messages');
      writePromises.push(
        setDoc(doc(messagesCol, msgDocId), { ...messageData, conversationId: rId }, { merge: true })
      );

      const chatDocRef = doc(db, 'chats', rId);
      writePromises.push(
        setDoc(
          chatDocRef,
          {
            id: rId,
            lastMessage: summaryText,
            lastMessageText: summaryText,
            updatedAt: serverTimestamp(),
            lastMessageTime: new Date().toISOString(),
            lastSenderRole: isSeller ? 'SELLER' : 'ADMIN',
            lastSenderId: senderId,
            sellerId: rId,
            participantOneId: rId,
            participantOneName: extra?.senderName || (isSeller ? 'Seller' : undefined),
            participantOneRole: 'SELLER',
            participantTwoId: 'user_admin',
            participantTwoName: 'Platform Support Team',
            participantTwoRole: 'ADMIN',
            unreadAdmin: isSeller ? 1 : 0,
            unreadCountParticipantTwo: isSeller ? 1 : 0,
            unreadSeller: isSeller ? 0 : 1,
            unreadCountParticipantOne: isSeller ? 0 : 1,
          },
          { merge: true }
        )
      );
    }

    // 2. Also mirror to legacy collection for global listener backward compatibility
    const legacyDocRef = doc(db, CHAT_COLLECTION, msgDocId);
    writePromises.push(
      setDoc(
        legacyDocRef,
        {
          id: msgDocId,
          messageId: msgDocId,
          conversationId: canonicalChatId,
          candidateIds: Array.from(targetRooms),
          senderId,
          receiverId: isSeller ? 'user_admin' : canonicalChatId,
          senderName: extra?.senderName || (isSeller ? 'Seller' : 'Platform Support'),
          senderRole: isSeller ? 'SELLER' : 'ADMIN',
          text: messageText,
          imageUrl: extra?.imageUrl || null,
          timestamp: new Date().toISOString(),
          isRead: false,
          serverCreatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    );

    // Execute concurrently with allSettled so no single network failure halts the send
    await Promise.allSettled(writePromises);
    return msgDocId;
  } catch (error) {
    console.error('[Firestore] Error sending message:', error);
    return msgDocId;
  }
}

/**
 * 2. Real-time Message Listener (Seller Dashboard & Admin Panel dono ke liye)
 * Uses subscribeToChatMessages with Firestore onSnapshot for instant zero-latency updates
 */
export function listenToChatMessages(
  chatId: string | string[],
  callback: (messages: Message[]) => void
): () => void {
  return subscribeToChatMessages(chatId, callback);
}

/**
 * Real-time listener for all chats in `chats` collection (for Admin thread list)
 */
export function listenToAllChats(
  callback: (chats: any[]) => void
): () => void {
  if (!db) return () => {};

  try {
    const chatsCol = collection(db, 'chats');
    return onSnapshot(
      chatsCol,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ...data,
          });
        });
        callback(list);
      },
      (err) => {
        console.warn('[Firestore] Notice on all chats listener:', err);
      }
    );
  } catch (err) {
    console.warn('[Firestore] Error in listenToAllChats:', err);
    return () => {};
  }
}

/**
 * Saves a chat message to Firestore for real-time multi-device synchronization.
 * Also automatically updates/creates the parent conversation doc.
 */
export async function syncMessageToFirestore(
  message: Message,
  conversationMeta?: Partial<Conversation>
): Promise<void> {
  try {
    if (!db) return;

    // Send through standard sendChatMessage to ensure chats/{chatId}/messages subcollection sync
    const normalizedRole = message.senderRole === 'SELLER' ? 'seller' : 'admin';
    const receiverId =
      message.senderRole === 'SELLER'
        ? conversationMeta?.participantTwoId || 'user_admin'
        : conversationMeta?.participantOneId || message.conversationId;

    await sendChatMessage(
      message.senderId,
      receiverId,
      message.text,
      normalizedRole,
      {
        imageUrl: message.imageUrl,
        senderName: message.senderName,
        messageId: message.id,
      }
    );
  } catch (err) {
    console.warn('Firestore chat sync notice (local message preserved):', err);
  }
}

/**
 * Listens for messages from Firestore across all devices.
 */
export function listenToFirestoreMessages(
  onNewMessage: (msg: Message) => void,
  onDeleteMessage?: (msgId: string) => void
): () => void {
  try {
    if (!db) return () => {};

    const colRef = collection(db, CHAT_COLLECTION);
    const q = query(colRef, limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            const removedId = change.doc.id;
            const dataId = change.doc.data()?.id;
            if (onDeleteMessage) {
              onDeleteMessage(removedId);
              if (dataId && dataId !== removedId) {
                onDeleteMessage(dataId);
              }
            }
          } else if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            const roleStr = String(data.senderRole || '').toUpperCase();
            const normalizedRole = roleStr === 'SELLER' ? 'SELLER' : 'ADMIN';
            const msg: Message = {
              id: data.id || change.doc.id,
              messageId: data.messageId || data.id || change.doc.id,
              conversationId: data.conversationId,
              senderId: data.senderId,
              receiverId: data.receiverId,
              senderName: data.senderName,
              senderRole: normalizedRole,
              text: data.text || '',
              imageUrl: data.imageUrl || undefined,
              timestamp: data.timestamp || new Date().toISOString(),
              isRead: Boolean(data.isRead),
              candidateIds: data.candidateIds,
            } as any;
            onNewMessage(msg);
          }
        });
      },
      (error) => {
        console.warn('Firestore real-time chat listener error:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not establish Firestore chat listener:', err);
    return () => {};
  }
}

/**
 * Saves a conversation to Firestore.
 */
export async function syncConversationToFirestore(
  conversation: Conversation
): Promise<void> {
  try {
    if (!db) return;
    const convRef = doc(db, CONVERSATIONS_COLLECTION, conversation.id);
    await setDoc(
      convRef,
      {
        ...conversation,
        updatedAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore conversation sync notice:', err);
  }
}

/**
 * Listens for conversations in real-time from Firestore.
 */
export function listenToFirestoreConversations(
  onUpdate: (conversations: Conversation[]) => void
): () => void {
  try {
    if (!db) return () => {};

    const colRef = collection(db, CONVERSATIONS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const convList: Conversation[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Conversation;
          convList.push({
            ...data,
            id: docSnap.id,
          });
        });
        if (convList.length > 0) {
          onUpdate(convList);
        }
      },
      (err) => {
        console.warn('Firestore conversations listener notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not establish conversations listener:', err);
    return () => {};
  }
}

/**
 * Saves a notification to Firestore.
 */
export async function syncNotificationToFirestore(
  notification: NotificationItem
): Promise<void> {
  try {
    if (!db) return;
    const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notification.id);
    await setDoc(
      notifRef,
      {
        ...notification,
        serverCreatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore notification sync notice:', err);
  }
}

/**
 * Listens for platform notifications in real-time from Firestore.
 */
export function listenToFirestoreNotifications(
  onUpdate: (notifications: NotificationItem[]) => void
): () => void {
  try {
    if (!db) return () => {};

    const colRef = collection(db, NOTIFICATIONS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const notifList: NotificationItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as NotificationItem;
          notifList.push({
            ...data,
            id: docSnap.id,
          });
        });
        if (notifList.length > 0) {
          onUpdate(notifList);
        }
      },
      (err) => {
        console.warn('Firestore notifications listener notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not establish notifications listener:', err);
    return () => {};
  }
}

/**
 * Permanently deletes a chat message from Firestore (both subcollection and legacy collection)
 * Instant deletion across both sides in under 1 second.
 */
export async function deleteChatMessage(
  chatId: string,
  messageId: string,
  extraCandidateIds?: string[]
): Promise<void> {
  if (!messageId) return;

  // 1. Record in local memory and storage immediately
  recordDeletedChatMessageId(messageId);

  // 2. Broadcast across tabs immediately (0ms latency for seller & admin open windows)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('nexus_chat_channel');
      bc.postMessage({
        type: 'MESSAGE_DELETED',
        messageId,
        conversationId: chatId,
        candidateIds: extraCandidateIds || [chatId],
      });
      setTimeout(() => bc.close(), 1000);
    }
  } catch {}

  if (!db) return;
  try {
    const rawIds = [chatId, ...(extraCandidateIds || [])]
      .map((id) => (id || '').trim())
      .filter((id) => Boolean(id) && id !== 'user_admin' && id !== 'admin');

    const candidateIds = new Set<string>();
    rawIds.forEach((id) => {
      const clean = getCanonicalSellerChatId(id);
      if (clean) {
        candidateIds.add(clean);
        candidateIds.add(`conv_${clean}`);
      }
    });

    // 1. Delete from chats/{id}/messages/{messageId} across seller candidate chat rooms
    for (const cId of Array.from(candidateIds)) {
      try {
        const msgDocRef = doc(db, 'chats', cId, 'messages', messageId);
        await deleteDoc(msgDocRef);
      } catch {}

      // Also search by data id or messageId fields in case doc id was autogenerated
      try {
        const subCol = collection(db, 'chats', cId, 'messages');
        const qSub1 = query(subCol, where('id', '==', messageId));
        const snapSub1 = await getDocs(qSub1);
        snapSub1.forEach((d) => deleteDoc(d.ref));
      } catch {}

      try {
        const subCol = collection(db, 'chats', cId, 'messages');
        const qSub2 = query(subCol, where('messageId', '==', messageId));
        const snapSub2 = await getDocs(qSub2);
        snapSub2.forEach((d) => deleteDoc(d.ref));
      } catch {}

      // Check remaining messages to update lastMessage on chat thread doc
      try {
        const remainingQuery = query(
          collection(db, 'chats', cId, 'messages'),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const remainingSnap = await getDocs(remainingQuery);
        const chatDocRef = doc(db, 'chats', cId);
        if (!remainingSnap.empty) {
          const lastData = remainingSnap.docs[0].data();
          const summaryText = lastData.text || (lastData.imageUrl ? '📷 Photo' : 'Message');
          await setDoc(
            chatDocRef,
            {
              lastMessage: summaryText,
              lastMessageText: summaryText,
              lastMessageTime: lastData.timestamp ? new Date().toISOString() : new Date().toISOString(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } else {
          await setDoc(
            chatDocRef,
            {
              lastMessage: '',
              lastMessageText: '',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch {}
    }

    // 2. Also delete from legacy chat_messages collection by doc ID or field id
    try {
      const legacyRef = doc(db, CHAT_COLLECTION, messageId);
      await deleteDoc(legacyRef);
    } catch {}

    try {
      const legacyCol = collection(db, CHAT_COLLECTION);
      const qLegacy1 = query(legacyCol, where('id', '==', messageId));
      const snapLegacy1 = await getDocs(qLegacy1);
      snapLegacy1.forEach((d) => deleteDoc(d.ref));
    } catch {}

    try {
      const legacyCol = collection(db, CHAT_COLLECTION);
      const qLegacy2 = query(legacyCol, where('messageId', '==', messageId));
      const snapLegacy2 = await getDocs(qLegacy2);
      snapLegacy2.forEach((d) => deleteDoc(d.ref));
    } catch {}

    // 3. Save deleted message tombstone in Firestore
    try {
      await setDoc(doc(db, 'deleted_messages', messageId), {
        deletedAt: serverTimestamp(),
        messageId,
      });
    } catch {}
  } catch (err) {
    console.warn('[Firestore] Error deleting chat message:', err);
  }
}

/**
 * Universal timestamp helper to ensure 100% strict chronological ordering
 */
export function getMessageTimestampMs(msg: any): number {
  if (!msg) return 0;
  if (typeof msg.clientTimestamp === 'number' && msg.clientTimestamp > 0) return msg.clientTimestamp;
  if (typeof msg.timestamp === 'number' && msg.timestamp > 0) return msg.timestamp;
  if (msg.timestamp && typeof msg.timestamp.toDate === 'function') {
    return msg.timestamp.toDate().getTime();
  }
  if (msg.serverCreatedAt && typeof msg.serverCreatedAt.toDate === 'function') {
    return msg.serverCreatedAt.toDate().getTime();
  }
  if (typeof msg.timestamp === 'string') {
    const t = new Date(msg.timestamp).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (typeof msg.createdAt === 'string') {
    const t = new Date(msg.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (typeof msg.id === 'string' && msg.id.startsWith('msg_')) {
    const parts = msg.id.split('_');
    const num = parseInt(parts[1], 10);
    if (!isNaN(num) && num > 1000000000000) return num;
  }
  return 0;
}

/**
 * Permanently deletes all messages in a conversation and clears thread preview in Firestore
 */
export async function deleteAllChatMessages(
  chatId: string,
  extraCandidateIds?: string[]
): Promise<void> {
  const rawIds = [chatId, ...(extraCandidateIds || [])]
    .map((id) => (id || '').trim())
    .filter((id) => Boolean(id) && id !== 'user_admin' && id !== 'admin');

  const candidateIds = new Set<string>();
  rawIds.forEach((id) => {
    const clean = getCanonicalSellerChatId(id);
    if (clean && clean !== 'user_admin' && clean !== 'admin') {
      candidateIds.add(clean);
      candidateIds.add(`conv_${clean}`);
    }
  });

  const allCandidateList = Array.from(candidateIds);
  recordConversationCleared(chatId, allCandidateList);

  if (!db || allCandidateList.length === 0) return;
  try {
    for (const cId of allCandidateList) {
      try {
        const messagesCol = collection(db, 'chats', cId, 'messages');
        const snap = await getDocs(messagesCol);
        if (!snap.empty) {
          const batchDeletes = snap.docs.map((d) => deleteDoc(d.ref));
          await Promise.all(batchDeletes);
        }

        // Permanently delete the chat room doc so it disappears from backend and sidebar
        const chatDocRef = doc(db, 'chats', cId);
        await deleteDoc(chatDocRef);

        // Also delete from conversations collection
        const convDocRef = doc(db, CONVERSATIONS_COLLECTION, cId);
        await deleteDoc(convDocRef);
      } catch (e) {
        console.warn(`[Firestore] Error clearing subcollection messages for ${cId}:`, e);
      }

      // Legacy messages: ONLY delete where conversationId === cId or senderId === cId
      // CRITICAL: NEVER delete where receiverId === cId because receiverId could be user_admin!
      try {
        const legacyCol = collection(db, CHAT_COLLECTION);
        const qLegacy1 = query(legacyCol, where('conversationId', '==', cId));
        const snapLegacy1 = await getDocs(qLegacy1);
        if (!snapLegacy1.empty) {
          await Promise.all(snapLegacy1.docs.map((d) => deleteDoc(d.ref)));
        }

        const qLegacy2 = query(legacyCol, where('senderId', '==', cId));
        const snapLegacy2 = await getDocs(qLegacy2);
        if (!snapLegacy2.empty) {
          await Promise.all(snapLegacy2.docs.map((d) => deleteDoc(d.ref)));
        }
      } catch (e) {
        console.warn(`[Firestore] Error clearing legacy messages for ${cId}:`, e);
      }
    }
  } catch (err) {
    console.warn('[Firestore] Error clearing chat messages:', err);
  }
}

/**
 * Marks messages in a conversation as read in Firestore
 */
export async function markChatMessagesAsRead(
  chatId: string,
  readerRole: 'ADMIN' | 'SELLER',
  extraCandidateIds?: string[]
): Promise<void> {
  if (!db || !chatId) return;

  try {
    const otherRoleLower = readerRole === 'ADMIN' ? 'seller' : 'admin';
    const otherRoleUpper = readerRole === 'ADMIN' ? 'SELLER' : 'ADMIN';

    const rawIds = [chatId, ...(extraCandidateIds || [])].map((id) => (id || '').trim()).filter(Boolean);
    const candidateIds = new Set<string>();
    rawIds.forEach((id) => {
      const clean = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
      candidateIds.add(id);
      candidateIds.add(clean);
      candidateIds.add(`conv_${clean}`);
    });

    const updates: Promise<any>[] = [];

    for (const cId of Array.from(candidateIds)) {
      // 1. Update unread messages in chats/{cId}/messages
      try {
        const messagesCol = collection(db, 'chats', cId, 'messages');
        const snap = await getDocs(messagesCol);
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const sRole = String(data.senderRole || '').toLowerCase();
          const isFromOther =
            sRole === otherRoleLower ||
            sRole === otherRoleUpper.toLowerCase() ||
            (readerRole === 'SELLER' && (data.senderRole === 'ADMIN' || data.senderId === 'user_admin' || sRole !== 'seller')) ||
            (readerRole === 'ADMIN' && (data.senderRole === 'SELLER' || sRole === 'seller' || data.senderId !== 'user_admin'));

          if (isFromOther && !data.isRead) {
            updates.push(updateDoc(docSnap.ref, { isRead: true }));
          }
        });
      } catch {}

      // 2. Update legacy collection
      try {
        const legacyCol = collection(db, CHAT_COLLECTION);
        const legacyQ = query(
          legacyCol,
          where('conversationId', '==', cId),
          where('isRead', '==', false)
        );
        const legacySnap = await getDocs(legacyQ);
        legacySnap.forEach((docSnap) => {
          const data = docSnap.data();
          const sRole = String(data.senderRole || '').toUpperCase();
          if (sRole === otherRoleUpper || (readerRole === 'SELLER' && sRole !== 'SELLER') || (readerRole === 'ADMIN' && sRole !== 'ADMIN')) {
            updates.push(updateDoc(docSnap.ref, { isRead: true }));
          }
        });
      } catch {}

      // 3. Clear unread counts on the conversation document itself
      try {
        const chatDocRef = doc(db, 'chats', cId);
        if (readerRole === 'ADMIN') {
          updates.push(updateDoc(chatDocRef, { unreadAdmin: 0, unreadCountParticipantTwo: 0 }).catch(() => {}));
        } else {
          updates.push(updateDoc(chatDocRef, { unreadSeller: 0, unreadCountParticipantOne: 0 }).catch(() => {}));
        }
      } catch {}
    }

    await Promise.all(updates);
    console.log(`[Firestore] Marked ${updates.length} messages as read in chat ${chatId} for reader ${readerRole}`);
  } catch (err) {
    console.warn('[Firestore] Notice marking messages as read:', err);
  }
}

/**
 * Permanently deletes an entire conversation, its document, and all messages in sub-collections from Firestore.
 */
export async function deleteEntireConversationFromFirestore(
  conversationId: string,
  extraCandidateIds?: string[]
): Promise<void> {
  if (!conversationId) return;

  const rawIds = [conversationId, ...(extraCandidateIds || [])]
    .map((id) => (id || '').trim())
    .filter((id) => Boolean(id) && id !== 'user_admin' && id !== 'admin');

  const candidateIds = new Set<string>();
  rawIds.forEach((id) => {
    const clean = getCanonicalSellerChatId(id);
    if (clean && clean !== 'user_admin' && clean !== 'admin') {
      candidateIds.add(clean);
      candidateIds.add(`conv_${clean}`);
    }
  });
  const allList = Array.from(candidateIds);
  if (allList.length === 0) return;

  // 1. Clean localStorage
  try {
    const rawConv = localStorage.getItem('nexus_conversations');
    if (rawConv) {
      const convs: Conversation[] = JSON.parse(rawConv);
      const filtered = convs.filter((c) => !allList.includes(c.id));
      localStorage.setItem('nexus_conversations', JSON.stringify(filtered));
    }
    const rawMsg = localStorage.getItem('nexus_messages');
    if (rawMsg) {
      const msgs: Message[] = JSON.parse(rawMsg);
      const filtered = msgs.filter((m) => !allList.includes(m.conversationId));
      localStorage.setItem('nexus_messages', JSON.stringify(filtered));
    }
  } catch {}

  // 2. Broadcast across tabs
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('nexus_chat_channel');
      bc.postMessage({ type: 'CONVERSATION_DELETED', conversationId, candidateIds: allList });
      setTimeout(() => bc.close(), 1000);
    }
  } catch {}

  if (!db) return;

  try {
    for (const cId of allList) {
      // 1. Delete all message docs in /chats/{cId}/messages subcollection
      try {
        const messagesCol = collection(db, 'chats', cId, 'messages');
        const snap = await getDocs(messagesCol);
        const batchDeletes = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(batchDeletes);
      } catch {}

      // 2. Delete /chats/{cId} parent document
      try {
        await deleteDoc(doc(db, 'chats', cId));
      } catch {}

      // 3. Delete /conversations/{cId} document if present
      try {
        await deleteDoc(doc(db, CONVERSATIONS_COLLECTION, cId));
      } catch {}

      // 4. Delete legacy /chat_messages
      try {
        const legacyCol = collection(db, CHAT_COLLECTION);
        const qLegacy = query(legacyCol, where('conversationId', '==', cId));
        const snapLegacy = await getDocs(qLegacy);
        const legDeletes = snapLegacy.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(legDeletes);
      } catch {}
    }

    console.log(`[Firestore] Conversation ${conversationId} and all message subcollections permanently deleted from backend database.`);
  } catch (err) {
    console.warn('[Firestore] Error deleting entire conversation from Firestore:', err);
  }
}

/**
 * Permanently deletes all conversations, chats, and messages involving a seller from Firestore
 */
export async function deleteAllChatsForSellerFromFirestore(sellerId: string, email?: string): Promise<void> {
  if (!sellerId && !email) return;
  if (!db) return;

  try {
    const candidateChatIds = new Set<string>();
    if (sellerId) {
      candidateChatIds.add(sellerId);
      candidateChatIds.add(`conv_${sellerId}`);
      if (sellerId.startsWith('conv_')) {
        candidateChatIds.add(sellerId.replace(/^conv_/, ''));
      }
    }

    // Query chats collection
    try {
      const chatsCol = collection(db, 'chats');
      const allChatsSnap = await getDocs(chatsCol);
      allChatsSnap.forEach((d) => {
        const data = d.data();
        const matchesSeller =
          (sellerId && (data.sellerId === sellerId || data.userId === sellerId)) ||
          (email && data.sellerEmail && data.sellerEmail.toLowerCase() === email.toLowerCase()) ||
          (Array.isArray(data.participantIds) && sellerId && data.participantIds.includes(sellerId));
        if (matchesSeller) {
          candidateChatIds.add(d.id);
        }
      });
    } catch {}

    // Query conversations collection
    try {
      const convsCol = collection(db, CONVERSATIONS_COLLECTION);
      const allConvsSnap = await getDocs(convsCol);
      allConvsSnap.forEach((d) => {
        const data = d.data();
        const matchesSeller =
          (sellerId && (data.sellerId === sellerId || data.userId === sellerId)) ||
          (Array.isArray(data.participantIds) && sellerId && data.participantIds.includes(sellerId));
        if (matchesSeller) {
          candidateChatIds.add(d.id);
        }
      });
    } catch {}

    // Wipe each conversation found
    for (const chatId of Array.from(candidateChatIds)) {
      await deleteEntireConversationFromFirestore(chatId);
    }

    // Also wipe any standalone messages sent by this seller
    if (sellerId) {
      try {
        const msgCol = collection(db, CHAT_COLLECTION);
        const qSender = query(msgCol, where('senderId', '==', sellerId));
        const snapSender = await getDocs(qSender);
        const deleteSenderMsgs = snapSender.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deleteSenderMsgs);
      } catch {}
    }

    console.log(`[Firestore] Wiped all chat records and conversations for seller ${sellerId || email}`);
  } catch (err) {
    console.warn('[Firestore] Error wiping chats for seller:', err);
  }
}
