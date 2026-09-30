import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  isChatMessageDeleted,
  recordDeletedChatMessageId,
  getConversationClearedTime,
  recordConversationCleared,
  clearConversationClearedTime,
  restoreChatThread,
  getMessageTimestampMs,
  getSellerChatRoomId,
  getCanonicalSellerChatId,
  subscribeToChatMessages,
  sendRealtimeChatMessage,
} from '../../services/firebaseChat';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Send,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Headphones,
  Lock,
  LogOut,
  ShieldCheck,
  Paperclip,
  Store,
  Trash2,
} from 'lucide-react';

interface SellerSupportChatPageProps {
  onNavigate: (view: string) => void;
}

export const SellerSupportChatPage: React.FC<SellerSupportChatPageProps> = ({ onNavigate }) => {
  const {
    currentUser,
    sellers,
    messages,
    sendMessage,
    startOrGetSupportConversation,
    markConversationAsRead,
    updateSellerStatus,
    listenToChatMessages,
    logoutSeller,
    syncMessagesWithFirestore,
  } = useStore();

  const [inputText, setInputText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dynamic visual viewport height tracker for Android & iOS mobile keyboards and navigation bars
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    handleViewportChange();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  // Lock background body scroll while support chat is open to avoid iOS/Android bounce
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
    };
  }, []);

  // Find active seller profile
  const currentSeller =
    (currentUser?.id && currentUser.id !== 'guest_visitor' && sellers.find((s) => s.userId === currentUser.id || s.id === currentUser.id)) ||
    (currentUser?.email && sellers.find((s) => (s.email || '').toLowerCase().trim() === currentUser.email.toLowerCase().trim())) ||
    (() => {
      try {
        const sessStr = localStorage.getItem('nexus_seller_session');
        if (sessStr) {
          const sess = JSON.parse(sessStr);
          if (sess) {
            const match = sellers.find(
              (s) =>
                (sess.userId && (s.userId === sess.userId || s.id === sess.userId)) ||
                (sess.email && s.email && s.email.toLowerCase().trim() === sess.email.toLowerCase().trim())
            );
            if (match) return match;
          }
        }
      } catch {}
      return null;
    })() || null;

  useEffect(() => {
    if (!currentSeller) {
      if (onNavigate) {
        onNavigate('seller-login');
      }
    }
  }, [currentSeller, onNavigate]);

  if (!currentSeller) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white">Merchant Authentication Required</h2>
          <p className="text-xs text-slate-400">
            Please log in with your seller account to access customer care support.
          </p>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('seller-login')}
            className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Go to Seller Login
          </button>
        </div>
      </div>
    );
  }

  const isFrozen = Boolean(
    currentUser.role !== 'ADMIN' &&
    (currentSeller?.applicationStatus === 'FROZEN' ||
      (currentSeller as any)?.isFrozen === true ||
      (currentSeller as any)?.status === 'FROZEN' ||
      (currentUser as any)?.isFrozen === true ||
      sellers.some(
        (s) =>
          (s.id === currentSeller?.id || s.userId === currentSeller?.userId || (s.email && currentUser.email && s.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim())) &&
          (s.applicationStatus === 'FROZEN' || (s as any).isFrozen === true)
      ))
  );

  const isPending = !isFrozen && currentSeller?.applicationStatus === 'PENDING';

  const sellerIdentifier =
    currentSeller?.userId ||
    (currentUser.id !== 'guest_visitor' ? currentUser.id : currentSeller?.id) ||
    'seller_active';
  const sellerDisplayName = currentSeller?.shopName
    ? `${currentSeller.shopName} (${currentSeller.sellerName || currentUser.name || 'Merchant'})`
    : (currentUser.name || 'Merchant');

  // Candidate room IDs for this seller to ensure 100% real-time syncing with admin
  const candidateRoomIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (currentSeller?.id) ids.add(getCanonicalSellerChatId(currentSeller.id));
    if (currentSeller?.userId) ids.add(getCanonicalSellerChatId(currentSeller.userId));
    if (currentUser?.id && currentUser.id !== 'guest_visitor') ids.add(getCanonicalSellerChatId(currentUser.id));
    if (sellerIdentifier) ids.add(getCanonicalSellerChatId(sellerIdentifier));
    return Array.from(ids).filter(Boolean);
  }, [currentSeller, currentUser.id, sellerIdentifier]);

  const chatRoomId = candidateRoomIds[0] || 'support_general';

  // Real-time Firestore listener with onSnapshot - instantly syncs both admin and seller messages
  useEffect(() => {
    if (candidateRoomIds.length === 0) return;

    const unsub = subscribeToChatMessages(candidateRoomIds, (liveMsgs) => {
      setRealtimeMessages(liveMsgs || []);
    });

    return () => {
      unsub();
    };
  }, [candidateRoomIds.slice().sort().join('|')]);

  // Instant cross-tab broadcast listener for deletions & resets across tabs
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('nexus_chat_channel');
    bc.onmessage = (event) => {
      if (event.data?.type === 'MESSAGE_DELETED' && event.data.messageId) {
        const delId = event.data.messageId;
        recordDeletedChatMessageId(delId);
        setRealtimeMessages((prev) => prev.filter((m) => m.id !== delId));
      } else if (event.data?.type === 'NEW_CHAT_MESSAGE' && event.data.message) {
        const incoming = event.data.message;
        if (
          !isChatMessageDeleted(incoming.id) &&
          (candidateRoomIds.includes(incoming.conversationId) ||
            candidateRoomIds.includes((incoming as any).chatId) ||
            candidateRoomIds.includes(incoming.senderId) ||
            candidateRoomIds.includes((incoming as any).receiverId))
        ) {
          setRealtimeMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      }
    };
    return () => {
      try {
        bc.close();
      } catch {}
    };
  }, [candidateRoomIds.slice().sort().join('|')]);

  // Filter & merge messages for this conversation - Firestore real-time authoritative
  const conversationMessages = React.useMemo(() => {
    const map = new Map<string, any>();

    // 1. Initial fallback from StoreContext messages
    messages
      .filter((m) => {
        if (!m || !m.id || isChatMessageDeleted(m.id)) return false;
        const cleanConv = (m.conversationId || '').replace(/^conv_/, '');
        const cleanSender = (m.senderId || '').replace(/^conv_/, '');
        const cleanReceiver = ((m as any).receiverId || '').replace(/^conv_/, '');
        return (
          candidateRoomIds.includes(m.conversationId) ||
          candidateRoomIds.includes(cleanConv) ||
          candidateRoomIds.includes(m.senderId) ||
          candidateRoomIds.includes(cleanSender) ||
          candidateRoomIds.includes((m as any).receiverId) ||
          candidateRoomIds.includes(cleanReceiver)
        );
      })
      .forEach((m) => map.set(m.id, m));

    // 2. Real-time authoritative messages from Firestore
    realtimeMessages
      .filter((m) => m && m.id && !isChatMessageDeleted(m.id))
      .forEach((m) => map.set(m.id, m));

    return Array.from(map.values()).sort((a, b) => {
      const timeA = (a as any).clientTimestamp || new Date(a.timestamp).getTime();
      const timeB = (b as any).clientTimestamp || new Date(b.timestamp).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [realtimeMessages, messages, candidateRoomIds]);

  // Smooth auto-scroll to latest message
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  useEffect(() => {
    scrollToBottom('smooth');
    const timer = setTimeout(() => scrollToBottom('smooth'), 120);
    return () => clearTimeout(timer);
  }, [conversationMessages.length, isAgentTyping, selectedImage]);

  // Auto-adjust textarea height dynamically up to 120px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      if (!inputText) {
        textareaRef.current.style.height = '24px';
      } else {
        const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 24), 120);
        textareaRef.current.style.height = `${newHeight}px`;
      }
    }
  }, [inputText]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      scrollToBottom('smooth');
    }, 600);
  };

  const handleBackClick = () => {
    if (isFrozen) {
      setShowVerificationAlert(true);
      return;
    }
    // Navigate back to seller dashboard
    onNavigate('seller');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const messageContent = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!messageContent && !selectedImage) return;

    const imgPayload = selectedImage || undefined;
    setInputText('');
    setSelectedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }

    const tempId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // 1. Instant optimistic push to local real-time feed (0ms latency)
    const tempMsg = {
      id: tempId,
      messageId: tempId,
      conversationId: chatRoomId,
      senderId: sellerIdentifier,
      receiverId: 'user_admin',
      senderName: sellerDisplayName,
      senderRole: 'SELLER' as const,
      text: messageContent,
      imageUrl: imgPayload,
      timestamp: nowIso,
      clientTimestamp: Date.now(),
      isRead: false,
    };

    setRealtimeMessages((prev) => {
      if (prev.some((m) => m.id === tempId)) return prev;
      return [...prev, tempMsg];
    });

    scrollToBottom('smooth');

    // 2. Direct real-time write to Firestore
    sendRealtimeChatMessage({
      chatRoomId,
      senderId: sellerIdentifier,
      senderRole: 'SELLER',
      senderName: sellerDisplayName,
      text: messageContent,
      imageUrl: imgPayload,
      messageId: tempId,
      sellerProfile: currentSeller || undefined,
    }).catch((err) => {
      console.warn('[Firestore Chat] sendRealtimeChatMessage error:', err);
    });
  };

  // Keyboard interaction:
  // Enter alone -> moves to next line naturally (multi-line typing as requested: "enter dabane per dosri line per chali jay")
  // Ctrl + Enter or Cmd + Enter -> send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
    // Enter key without Ctrl/Cmd naturally goes to next line ("dosri line per chali jay")
  };

  const handleInputFocus = () => {
    // When virtual keyboard opens on mobile, smoothly scroll message history into view
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <div
      className="fixed inset-0 w-full bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-between p-0 sm:p-3 md:p-5 overflow-hidden z-50 text-slate-800"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
        maxHeight: viewportHeight ? `${viewportHeight}px` : '100dvh',
      }}
    >
      {/* Enterprise Help Desk Container (Fixed in Viewport) */}
      <div className="w-full max-w-4xl bg-white sm:rounded-2xl shadow-2xl flex flex-col h-full max-h-full sm:max-h-[calc(100dvh-2.5rem)] border border-slate-300/80 overflow-hidden relative font-sans">
        
        {/* ========================================================= */}
        {/* 1. TOP HEADER - SLEEK CORPORATE SUPPORT DESK (DARK SLATE) */}
        {/* ========================================================= */}
        <header className="bg-slate-900 text-white px-3.5 sm:px-5 py-3 shrink-0 border-b border-slate-800 relative z-20 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Left: Back Arrow (only when not frozen) */}
            {!isFrozen && (
              <button
                onClick={handleBackClick}
                aria-label="Back"
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0 border border-transparent hover:border-slate-700"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
            )}

            {/* Support Desk Brand Icon */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                <Headphones className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" title="Support Online"></span>
            </div>

            {/* Desk Title & Live SLA Status */}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight truncate">
                Customer Care Official
              </h1>
              <p className="text-[11px] flex items-center gap-1.5 leading-none mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="text-emerald-400 font-semibold">Active Help Desk</span>
              </p>
            </div>
          </div>

          {/* Right: Store badge & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {currentSeller?.shopName && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-200 text-xs font-semibold">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span className="max-w-[130px] truncate">{currentSeller.shopName}</span>
              </div>
            )}

            <button
              onClick={handleRefresh}
              aria-label="Refresh Chat"
              title="Refresh Conversation"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-700"
            >
              <RotateCw className={`w-4 h-4 stroke-[2.2] ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => {
                logoutSeller('Logged out');
                onNavigate('home');
              }}
              aria-label="Sign Out"
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-700"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. STATUS NOTICE BANNER (FROZEN / PENDING / APPROVED)     */}
        {/* ========================================================= */}
        {isFrozen ? (
          <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white px-4 py-2.5 shrink-0 shadow-sm border-b border-rose-800/60 text-center animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-center gap-2">
              <span className="p-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Lock className="w-4 h-4 text-rose-400" />
              </span>
              <p className="text-xs sm:text-sm font-bold tracking-tight text-white uppercase">
                Your store has been frozen. Please contact Customer Care for assistance.
              </p>
            </div>
            <p className="text-[11px] text-rose-200/80 font-normal mt-0.5 max-w-xl mx-auto leading-relaxed">
              Your seller dashboard is temporarily locked by Company. Customer Care is active below to assist you with unfreezing your store.
            </p>
          </div>
        ) : !isPending ? (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-950 px-4 py-2 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-950">Store Status: Active & Unfrozen</span>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('seller')}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center shrink-0">
            <p className="text-xs font-medium text-amber-900 leading-snug">
              Your account is awaiting verification. Message official customer care below if you need help.
            </p>
          </div>
        )}

        {/* Lock warning popup if user clicks back when not verified or frozen */}
        {showVerificationAlert && (
          <div className="absolute top-24 left-4 right-4 z-40 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-rose-700/80 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🔒</span>
              <span className="text-slate-200">
                {isFrozen
                  ? 'Your store has been frozen by Company. Please contact customer support for assistance.'
                  : 'Account unverified: You will remain on support until approved by Company.'}
              </span>
            </div>
            <button
              onClick={() => setShowVerificationAlert(false)}
              className="text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Admin Quick Verification Switcher (if viewed by admin role) */}
        {isPending && currentUser.role === 'ADMIN' && (
          <div className="bg-slate-900 text-slate-200 px-3.5 py-1.5 flex items-center justify-between text-[11px] shrink-0 border-b border-slate-800">
            <span className="text-slate-300">Status: <b className="text-amber-400">PENDING APPROVAL</b></span>
            <button
              onClick={() => {
                updateSellerStatus(currentSeller.id, 'APPROVED');
                sendMessage(
                  chatRoomId,
                  '🎉 Congratulations! Your store has been verified and approved. You can now access your full seller dashboard.',
                  undefined,
                  {
                    senderId: 'user_admin',
                    senderName: 'Merchant Support Team',
                    senderRole: 'ADMIN',
                  }
                );
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] cursor-pointer transition-colors shadow-2xs"
            >
              ✓ Verify Store Now
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. CLEAN ENTERPRISE CHAT FEED (PROFESSIONAL DESIGN)      */}
        {/* ========================================================= */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-5 py-4 space-y-3 overscroll-contain bg-slate-50/80">
          {/* Security & Verification Pill */}
          <div className="flex justify-center my-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white text-slate-600 text-[11px] font-medium rounded-full shadow-2xs border border-slate-200/80 max-w-md text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Direct verified communication with official Zazzel management desk.</span>
            </div>
          </div>

          {/* Empty Conversation Welcome State */}
          {conversationMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center my-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mb-3 shadow-xs">
                <Headphones className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Customer Care Desk Ready</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
                Welcome to official customer care. Send a message or attach photos below, and our team will assist you immediately.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendMessage('Hello Customer Care, I need assistance with my merchant store.')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                >
                  👋 "Need help with my store"
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('How can I unfreeze my store account?')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                >
                  🔓 "How to unfreeze store"
                </button>
              </div>
            </div>
          )}

          {/* Messages Loop */}
          {conversationMessages.map((msg, index) => {
            const isCustomerCare = msg.senderRole === 'ADMIN' || msg.senderId === 'user_admin';
            const msgTime = (() => {
              try {
                const t = msg.timestamp || (msg as any).clientTimestamp;
                if (!t) return '';
                const d = new Date(t);
                if (isNaN(d.getTime())) return '';
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch {
                return '';
              }
            })();

            return (
              <div
                key={msg.id || index}
                className={`flex ${isCustomerCare ? 'justify-start' : 'justify-end'} mb-2 group relative`}
              >
                {/* Incoming Support Card */}
                {isCustomerCare ? (
                  <div className="flex items-start gap-2 max-w-[88%] sm:max-w-[78%]">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-800 shadow-2xs mt-0.5">
                      <Headphones className="w-4 h-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-xs bg-white text-slate-900 px-4 py-3 shadow-xs border border-slate-200/90 relative group/bubble">
                      {/* Attached Media Photo */}
                      {msg.imageUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden max-w-[280px] bg-slate-100 border border-slate-200">
                          <img
                            src={msg.imageUrl}
                            alt="Attached media"
                            className="w-full h-auto object-cover max-h-72"
                          />
                        </div>
                      )}

                      {/* Multi-line Formatted Message Body */}
                      {msg.text && (
                        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words select-text font-normal text-slate-800">
                          {msg.text}
                        </p>
                      )}

                      {/* Time & Verified Indicator */}
                      <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-slate-100 text-[10px]">
                        <span className="text-slate-400 font-medium">{msgTime}</span>
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                          Official Care
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Outgoing Seller Message (Self) */
                  <div className="max-w-[88%] sm:max-w-[78%] rounded-2xl rounded-tr-xs bg-slate-900 text-slate-50 px-4 py-3 shadow-sm border border-slate-800 relative group/bubble">
                    {/* Attached Media Photo */}
                    {msg.imageUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden max-w-[280px] bg-slate-950 border border-slate-700">
                        <img
                          src={msg.imageUrl}
                          alt="Attached media"
                          className="w-full h-auto object-cover max-h-72"
                        />
                      </div>
                    )}

                    {/* Multi-line Formatted Message Body */}
                    {msg.text && (
                      <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words select-text font-normal text-slate-100">
                        {msg.text}
                      </p>
                    )}

                    {/* Time & Read Checkmark */}
                    <div className="flex items-center justify-end gap-1.5 mt-1.5 pt-1 border-t border-slate-800/80 text-[10px]">
                      <span className="text-slate-400 font-medium">{msgTime}</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Customer Care Typing Animation */}
          {isAgentTyping && (
            <div className="flex justify-start mb-2 items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-800 shadow-2xs">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="bg-white text-slate-700 rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs border border-slate-200/90 flex items-center gap-2">
                <span className="text-xs text-slate-600 font-semibold">Customer Care is typing</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Selected Image Preview before sending */}
        {selectedImage && (
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
            <div className="relative">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-14 h-14 object-cover rounded-xl border border-amber-400 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute -top-1.5 -right-1.5 bg-slate-900 hover:bg-rose-600 text-white rounded-full p-0.5 cursor-pointer shadow-xs transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-800">Photo attached</p>
              <p className="text-[11px] text-slate-500">Ready to send with your message</p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. BOTTOM INPUT BAR - FIXED ABOVE ANDROID/IOS NAV BARS    */}
        {/* ========================================================= */}
        <div
          className="bg-white border-t border-slate-200 px-3 sm:px-4 pt-2.5 shrink-0 z-20"
          style={{
            paddingBottom: 'max(0.85rem, env(safe-area-inset-bottom, 0.85rem))',
          }}
        >
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            {/* Image / Gallery Upload Icon */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              title="Attach photo or document"
              aria-label="Attach photo or document"
              className="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shrink-0 mb-0.5 border border-slate-200/80 active:scale-95"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Sleek, Compact Textarea Container */}
            <div className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs flex items-center focus-within:bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all min-h-[40px]">
              <textarea
                ref={textareaRef}
                id="seller-chat-input"
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                placeholder="Write your message"
                className="w-full bg-transparent border-0 p-0 text-[15px] sm:text-[14px] font-medium text-black placeholder:text-slate-400 resize-none focus:outline-none focus:ring-0 leading-normal max-h-28 overflow-y-auto"
                style={{ color: '#000000', WebkitTextFillColor: '#000000', caretColor: '#000000' }}
              />
            </div>

            {/* Compact Amber Send Button */}
            <button
              id="seller-chat-send-btn"
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() && !selectedImage}
              aria-label="Send message"
              title="Send message"
              className="h-10 px-3.5 sm:px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed shrink-0 active:scale-95 shadow-xs mb-0.5"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4 h-4 fill-current sm:ml-0.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

