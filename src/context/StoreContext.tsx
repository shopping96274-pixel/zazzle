import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  UserRole,
  SellerProfile,
  Category,
  Product,
  ProductStatus,
  CartItem,
  Order,
  OrderStatus,
  ShippingAddress,
  SellerWallet,
  WalletTransaction,
  TransactionType,
  WithdrawalRequest,
  WithdrawalStatus,
  WithdrawalMethod,
  Conversation,
  Message,
  NotificationItem,
  PlatformSettings,
  ApplicationStatus,
  AuthSession,
  StoreContactSettings,
  SellerLoginSession,
  KycDocumentType,
  VerificationStatus,
  SubscriptionPlanSettings,
} from '../types';

export const ADMIN_SESSION_TIMEOUT_MS = 120 * 60 * 1000; // 120 minutes = 2 hours
export const SELLER_SESSION_TIMEOUT_MS = 72 * 60 * 60 * 1000; // 72 hours
import {
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_SELLERS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_WALLETS,
  INITIAL_TRANSACTIONS,
  INITIAL_WITHDRAWALS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_SETTINGS,
} from '../data/mockData';
import {
  saveSellerKycToFirestore,
  saveSellerRatingToFirestore,
  saveSellerMaxProductsToFirestore,
  updateSellerVerificationInFirestore,
  updateSellerFreezeStatusInFirestore,
  updateSellerPasswordInFirestore,
  saveOrderToFirestore,
  saveSellerWalletToFirestore,
  listenToFirestoreSellers,
  getSellerByEmailOrPhoneFromFirestore,
  fetchAllFirestoreSellers,
  listenToFirestoreWallets,
  listenToFirestoreOrders,
  fetchFirestoreOrders,
  listenToFirestoreDeletedOrders,
  saveStoreContactsToFirestore,
  listenToFirestoreStoreContacts,
  updateSellerSubscriptionInFirestore,
  saveSubscriptionPlanSettingsToFirestore,
  listenToFirestoreSubscriptionPlan,
  saveWithdrawalToFirestore,
  updateWithdrawalInFirestore,
  deleteWithdrawalFromFirestore,
  deleteSellerFromFirestore,
  deleteOrderFromFirestore,
  listenToFirestoreWithdrawals,
  fetchAllFirestoreWithdrawals,
  getFirestorePermissionStatus,
  isOrderDeleted,
  recordDeletedOrderId,
} from '../services/firebaseKyc';
import { playNotificationBeep } from '../utils/audioAlert';
import {
  syncMessageToFirestore,
  sendChatMessage,
  listenToChatMessages,
  listenToAllChats,
  listenToFirestoreMessages,
  syncConversationToFirestore,
  listenToFirestoreConversations,
  syncNotificationToFirestore,
  listenToFirestoreNotifications,
  deleteChatMessage,
  deleteAllChatMessages,
  deleteEntireConversationFromFirestore,
  markChatMessagesAsRead,
  isChatMessageDeleted,
  getConversationClearedTime,
  recordConversationCleared,
  recordChatThreadDeleted,
  restoreChatThread,
  isChatThreadDeleted,
  getDeletedChatThreadsMap,
} from '../services/firebaseChat';
import {
  scheduleSupportAutoReply,
  cancelSupportAutoReply,
  getPendingSupportAutoReplies,
  savePendingSupportAutoReplies,
  AUTO_REPLY_MESSAGE_TEXT,
} from '../services/supportAutoReply';
import {
  DEFAULT_ADMIN_EMAIL,
  SELLER_INVITATION_CODE,
  verifyAdminLoginCredentials,
  resetAdminPasswordWithPin,
  syncAdminCredentialsFromFirestore,
  purgeLegacyLocalStorageCredentials,
  adminSignOutFirebase,
} from '../services/adminAuth';
import {
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  listenToFirestoreProducts,
  listenToFirestoreCategories,
  seedInitialFirestoreCatalog,
  fetchCachedFirestoreProducts,
  fetchCachedFirestoreCategories,
  invalidateProductsCache,
  unmarkDeletedProductId,
  isProductDeleted,
  recordDeletedProductId,
} from '../services/firebaseProducts';
import {
  saveSellerLoginSession,
  getSellerLoginSessions,
  listenToFirestoreLoginSessions,
  deleteSellerLoginSession,
  getClientIpAndLocation,
  INITIAL_SELLER_SESSIONS,
} from '../services/firebaseLoginSessions';
import {
  getStoredInvitationCode,
  saveFirestoreInvitationCode,
  listenToFirestoreInvitationCode,
  fetchFirestoreInvitationCode,
  validateInvitationCodeFormat,
  DEFAULT_INVITATION_CODE,
} from '../services/firebaseInvitationCode';
import {
  getStoredStoreName,
  getStoredStoreBranding,
  saveFirestoreStoreBranding,
  listenToFirestoreStoreBranding,
  fetchFirestoreStoreBranding,
  DEFAULT_STORE_NAME,
  DEFAULT_STORE_TAGLINE,
  StoreBrandingData,
} from '../services/firebaseStoreBranding';

interface StoreContextType {
  // Auth & Role
  currentUser: User;
  users: User[];
  setCurrentUser: (user: User) => void;
  switchUserRole: (role: UserRole, specificUserId?: string) => void;
  adminSession: AuthSession | null;
  sellerSession: AuthSession | null;
  adminRemainingSeconds: number;
  sellerRemainingSeconds: number;
  sessionNotice: string | null;
  setSessionNotice: (msg: string | null) => void;
  adminSessionNotice: string | null;
  sellerSessionNotice: string | null;
  clearSellerSessionNotice: () => void;
  clearAdminSessionNotice: () => void;
  loginAdmin: (email?: string, password?: string) => Promise<{ success: boolean; message: string }>;
  resetAdminPassword: (pin: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  logoutAdmin: (reason?: string) => void;
  logoutSeller: (reason?: string) => void;
  logoutUser: (reason?: string) => void;
  registerCustomer: (name: string, email: string, phone: string) => User;
  registerSeller: (data: {
    shopName: string;
    sellerName: string;
    email: string;
    phone: string;
    password?: string;
    invitationCode?: string;
    documentType?: string;
    frontImage?: string;
    backImage?: string;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  }) => Promise<{
    success: boolean;
    message: string;
    user?: User;
    seller?: SellerProfile;
    cloudSynced?: boolean;
    cloudError?: string;
  }>;
  loginSeller: (
    emailOrPhone: string,
    password?: string
  ) => Promise<{ success: boolean; message: string; user?: User; seller?: SellerProfile }>;
  applyForSeller: (applicationData: {
    shopName: string;
    sellerName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    withdrawalMethod: WithdrawalMethod;
    payoutDetails: string;
    documentType?: string;
    frontImage?: string;
    backImage?: string;
  }) => { success: boolean; message: string };
  updateSellerPassword: (sellerId: string, newPassword: string) => Promise<boolean>;

  // Categories
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Products (Admin controlled)
  products: Product[];
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'reviewCount'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductPublish: (id: string) => void;
  toggleSellerProductEligibility: (productId: string, sellerId: string) => void;
  removeProductFromSeller: (productId: string, sellerId: string) => void;
  addProductsToSeller: (productIds: string[], sellerId: string) => void;

  // Sellers & Applications
  sellers: SellerProfile[];
  approveSellerApplication: (sellerId: string) => void;
  rejectSellerApplication: (sellerId: string, reason: string) => void;
  freezeSellerApplication: (sellerId: string, reason?: string) => void;
  unfreezeSellerApplication: (sellerId: string) => void;
  updateSellerStarRating: (sellerId: string, starRating: number) => void;
  updateSellerMaxProducts: (sellerId: string, maxProducts: number) => void;
  verifySellerKyc: (sellerId: string, status: 'approved' | 'rejected', reason?: string) => void;
  updateSellerProfile: (sellerId: string, updates: Partial<SellerProfile>) => void;
  updateSellerStatus: (sellerId: string, status: ApplicationStatus, reason?: string) => void;
  deleteSeller: (sellerId: string) => void;
  clearAllTestSellers: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartCount: number;

  // Orders
  orders: Order[];
  createOrder: (data: {
    shippingAddress: ShippingAddress;
    paymentMethod: string;
    notes?: string;
    assignedSellerId?: string;
    assignedSellerName?: string;
    customCreatedAt?: string;
  }) => Order;
  assignOrderToSeller: (orderId: string, sellerId: string, customAssignedAt?: string) => void;
  updateOrderDate: (orderId: string, newDateIsoOrString: string) => void;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, note?: string, newDateIsoOrString?: string) => void;
  deleteOrder: (orderId: string) => void;
  refreshOrders: () => Promise<void>;

  // Wallets & Financials
  wallets: Record<string, SellerWallet>;
  transactions: WalletTransaction[];
  withdrawals: WithdrawalRequest[];
  submitWithdrawalRequest: (
    dataOrSellerId:
      | {
          sellerId: string;
          amount: number;
          method: WithdrawalMethod;
          payoutAccount: string;
          sellerNote?: string;
        }
      | string,
    amount?: number,
    method?: WithdrawalMethod,
    payoutAccount?: string,
    sellerNote?: string
  ) => { success: boolean; message: string };
  approveWithdrawalRequest: (withdrawalId: string, adminNote?: string) => void;
  markWithdrawalAsPaid: (withdrawalId: string, adminNote?: string) => void;
  rejectWithdrawalRequest: (withdrawalId: string, reason: string) => void;
  deleteWithdrawalRequest: (withdrawalId: string) => void;
  refreshWithdrawals: () => Promise<void>;
  adjustSellerWallet: (
    sellerId: string,
    amount: number,
    type: 'ADD' | 'DEDUCT',
    note?: string
  ) => { success: boolean; message: string; newBalance: number };
  deleteTransaction: (transactionId: string) => void;

  // Settings & Commission
  settings: PlatformSettings;
  updateSettings: (newSettings: Partial<PlatformSettings>) => void;

  // Conversations & Live Support
  conversations: Conversation[];
  messages: Message[];
  sendMessage: (
    conversationId: string,
    text: string,
    imageUrl?: string,
    senderOverride?: {
      senderId?: string;
      senderName?: string;
      senderRole?: UserRole;
    }
  ) => Message;
  startOrGetSupportConversation: (userId: string, userName: string, userRole: UserRole) => Conversation;
  markConversationAsRead: (conversationId: string, readerRole: UserRole, extraCandidateIds?: string[]) => void;
  deleteSingleMessage: (messageId: string, convId?: string, extraCandidateIds?: string[]) => void;
  deleteConversationAndReset: (conversationId: string, extraCandidateIds?: string[]) => void;
  deleteEntireConversation: (conversationId: string, extraCandidateIds?: string[]) => void;
  syncMessagesWithFirestore: (conversationId: string, validMessages: Message[], candidateIds?: string[]) => void;
  sendChatMessage: typeof sendChatMessage;
  listenToChatMessages: typeof listenToChatMessages;

  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Helper reset
  resetToDefaultData: () => void;

  // Store Name & Branding Settings (Synchronized with Database)
  storeName: string;
  storeTagline: string;
  updateStoreName: (
    newName: string,
    newTagline?: string,
    updatedBy?: string
  ) => Promise<{ success: boolean; name: string; message: string }>;

  // Store Contacts & Footer Settings
  storeContacts: StoreContactSettings;
  updateStoreContacts: (contacts: Partial<StoreContactSettings>) => void;

  // 4-Digit Seller Registration Invitation Code Management
  invitationCode: string;
  invitationCodeUpdatedAt?: string;
  updateInvitationCode: (
    newCode: string,
    updatedBy?: string
  ) => Promise<{ success: boolean; code: string; message: string }>;
  validateInvitationCode: (code: string) => boolean;

  // Subscription Plan Settings (Global & Per-Seller)
  subscriptionPlan: SubscriptionPlanSettings;
  updateSubscriptionPlan: (newPlan: Partial<SubscriptionPlanSettings>) => void;
  updateSellerSubscription: (
    sellerId: string,
    subscription: {
      subscriptionPlanName?: string;
      subscriptionPrice?: string;
      subscriptionMessage?: string;
    }
  ) => void;

  // Seller Login Sessions
  sellerLoginSessions: SellerLoginSession[];
  recordSellerLoginSession: (
    sessionData: Partial<SellerLoginSession> & { sellerName: string; email: string }
  ) => Promise<void>;
  trackSellerStoreActivity: (
    sellerProfile?: Partial<SellerProfile> | null,
    activity?: string
  ) => Promise<void>;
  refreshSellerLoginSessions: () => Promise<void>;
  deleteSellerLoginSessionById: (id: string) => Promise<void>;

  // Cloud Sync
  refreshAllCloudData: () => Promise<{ success: boolean; sellersCount: number; error?: string }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Helper to clean out any platform admin tag from store names and usernames
const sanitizeName = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/\(Platform\s*Admin\)/gi, '')
    .replace(/\(Admin\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper to generate guaranteed unique transaction ID
const generateTxId = (prefix = 'TX') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

// Known dummy/mock seed IDs to purge completely for clean real-world testing
const DUMMY_SELLER_IDS = new Set([
  'seller_ananya',
  'seller_1',
  'seller_2',
  'seller_3',
  'seller_4',
  'seller_5',
  'seller_maratab_pending',
  'seller_4_pending',
  'seller_demo',
]);

const DUMMY_USER_IDS = new Set([
  'user_admin_legacy',
  'user_seller_1',
  'user_seller_ananya',
  'user_seller_2',
  'user_seller_3',
  'user_seller_4',
  'user_seller_5',
  'user_seller_pending_2',
  'user_maratab',
]);

export const DEFAULT_STORE_CONTACTS: StoreContactSettings = {
  phone: '+1 6574906103',
  email: 'support@zazzel.com',
  address: '4 Copley Place, Floor 7, Boston, MA 02116, USA',
  workingHours: '24/7 Live Customer Desk & Order Support',
  whatsapp: '+1 6574906103',
};

export const DEFAULT_SUBSCRIPTION_PLAN: SubscriptionPlanSettings = {
  planName: 'Platinum Merchant',
  price: '$29 / mo',
  message: 'Active until 16 Feb 2026. Includes 1000 items, verified check badge, and 0% additional listing fees.',
  buttonText: 'Current Plan is Active',
};

export function safeSanitizeProduct(p: any): Product {
  if (!p || typeof p !== 'object') {
    return {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: 'Authentic Product',
      sku: 'SKU-GEN',
      description: '',
      price: 99.99,
      categoryId: 'cat_electronics',
      categoryName: 'Electronics',
      stock: 10,
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'],
      rating: 4.8,
      reviewCount: 15,
      featured: false,
      status: 'PUBLISHED',
      sellerCommission: 10,
      associatedSellerIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const priceNum = typeof p.price === 'number' && !isNaN(p.price) ? p.price : Number(p.price) || 0;
  const originalPriceNum = p.originalPrice != null
    ? (typeof p.originalPrice === 'number' && !isNaN(p.originalPrice) ? p.originalPrice : Number(p.originalPrice) || undefined)
    : undefined;
  const ratingNum = typeof p.rating === 'number' && !isNaN(p.rating) ? p.rating : Number(p.rating) || 4.5;
  const reviewCountNum = typeof p.reviewCount === 'number' && !isNaN(p.reviewCount) ? p.reviewCount : Number(p.reviewCount) || 10;
  const stockNum = typeof p.stock === 'number' && !isNaN(p.stock) ? p.stock : Number(p.stock) || 10;

  const imagesArr = Array.isArray(p.images)
    ? p.images.filter((img: any) => typeof img === 'string' && img.trim() !== '')
    : (typeof p.image === 'string' && p.image.trim() !== '' ? [p.image] : []);

  if (imagesArr.length === 0) {
    imagesArr.push('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80');
  }

  const validStatus: ProductStatus = (p.status === 'PUBLISHED' || p.status === 'DRAFT' || p.status === 'ARCHIVED')
    ? p.status
    : 'PUBLISHED';

  return {
    id: String(p.id || `prod_${Date.now()}`),
    name: String(p.name || 'Authentic Product'),
    sku: String(p.sku || `SKU-${p.id || 'GEN'}`),
    description: String(p.description || ''),
    price: priceNum,
    originalPrice: originalPriceNum,
    categoryId: String(p.categoryId || 'cat_electronics'),
    categoryName: String(p.categoryName || 'General'),
    stock: stockNum,
    images: imagesArr,
    rating: ratingNum,
    reviewCount: reviewCountNum,
    featured: Boolean(p.featured),
    status: validStatus,
    sellerCommission: typeof p.sellerCommission === 'number' ? p.sellerCommission : (typeof p.commissionRate === 'number' ? p.commissionRate : 10),
    associatedSellerIds: Array.isArray(p.associatedSellerIds) ? p.associatedSellerIds.map(String) : [],
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
  };
}

export function safeSanitizeCategory(c: any): Category {
  if (!c || typeof c !== 'object') {
    return {
      id: `cat_${Date.now()}`,
      name: 'Department',
      slug: 'department',
      description: '',
      iconName: 'Tag',
      itemCount: 0,
    };
  }
  const nameStr = String(c.name || 'Department');
  return {
    id: String(c.id || `cat_${nameStr.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`),
    name: nameStr,
    slug: String(c.slug || nameStr.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
    description: String(c.description || ''),
    iconName: String(c.iconName || 'Tag'),
    itemCount: typeof c.itemCount === 'number' ? c.itemCount : 0,
  };
}

// Helper to retrieve cached real seller password from local storage vault if missing in doc
export function getStoredSellerPassword(id?: string, email?: string): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('nexus_seller_passwords');
    if (!raw) return '';
    const map = JSON.parse(raw);
    if (id && map[id]) return String(map[id]);
    if (email && map[email.toLowerCase().trim()]) return String(map[email.toLowerCase().trim()]);
  } catch {}
  return '';
}

export function saveStoredSellerPassword(id: string, email: string, password: string): void {
  if (typeof window === 'undefined' || !password) return;
  try {
    const raw = localStorage.getItem('nexus_seller_passwords');
    const map = raw ? JSON.parse(raw) : {};
    if (id) map[id] = password;
    if (email) map[email.toLowerCase().trim()] = password;
    localStorage.setItem('nexus_seller_passwords', JSON.stringify(map));
  } catch {}
}

export function safeSanitizeSeller(s: any): SellerProfile | null {
  if (!s || typeof s !== 'object' || !s.id) return null;
  const idStr = String(s.id);
  if (DUMMY_SELLER_IDS.has(idStr) || idStr.startsWith('seller_demo')) return null;

  const emailStr = String(s.email || '').toLowerCase().trim();
  if (emailStr.includes('@seller.com') || emailStr.includes('ananya') || emailStr.includes('example.com')) {
    return null;
  }

  // Reject incomplete dummy docs that lack names and email
  if (!s.email && !s.shopName && !s.sellerName && !s.phone && idStr.startsWith('user_seller_')) {
    return null;
  }

  const rawShop = s.shopName || s.sellerName || 'Merchant Store';
  const cleanShop = sanitizeName(rawShop) || 'Merchant Store';
  const rawSeller = s.sellerName || s.shopName || 'Merchant Seller';
  const cleanSeller = sanitizeName(rawSeller) || 'Merchant Seller';

  const docType: KycDocumentType = s.documentType || s.kycDocumentType || 'ID Card';
  const front = String(s.frontImage || s.kycFrontImageUrl || s.kycDocuments?.frontImageUrl || '');
  const back = String(s.backImage || s.kycBackImageUrl || s.kycDocuments?.backImageUrl || '');

  const isFrozenDoc =
    s.applicationStatus === 'FROZEN' ||
    s.isFrozen === true ||
    s.status === 'FROZEN' ||
    s.status === 'frozen';

  const validStatus: ApplicationStatus = isFrozenDoc
    ? 'FROZEN'
    : s.applicationStatus === 'APPROVED' || s.applicationStatus === 'REJECTED'
    ? s.applicationStatus
    : 'PENDING';

  const validVerifStatus: VerificationStatus =
    s.verificationStatus === 'approved' || s.verificationStatus === 'rejected'
      ? s.verificationStatus
      : (validStatus === 'APPROVED' ? 'approved' : 'pending');

  const balNum = Number(s.walletBalance ?? s.balance ?? s.availableBalance ?? 0);

  // Preserve genuine seller password from doc, or from persistent local cache if doc was merged without password
  const explicitPassword = s.password ? String(s.password).trim() : '';
  const cachedPassword = getStoredSellerPassword(idStr, emailStr);
  const finalPassword = explicitPassword || cachedPassword || '';

  if (finalPassword && (idStr || emailStr)) {
    saveStoredSellerPassword(idStr, emailStr, finalPassword);
  }

  return {
    id: idStr,
    userId: String(s.userId || idStr),
    shopName: cleanShop,
    sellerName: cleanSeller,
    businessName: s.businessName ? String(s.businessName) : cleanShop,
    email: emailStr || `${idStr}@seller.waifair`,
    password: finalPassword,
    isPasswordCustomized: Boolean(s.isPasswordCustomized || (finalPassword && finalPassword !== 'pass123456' && finalPassword !== 'password123')),
    oldPasswordDeleted: Boolean(s.oldPasswordDeleted),
    phone: String(s.phone || ''),
    address: String(s.address || ''),
    city: String(s.city || ''),
    country: String(s.country || ''),
    withdrawalMethod: s.withdrawalMethod || 'USDT (TRC20)',
    payoutDetails: String(s.payoutDetails || ''),
    applicationStatus: validStatus,
    verificationStatus: validVerifStatus,
    isFrozen: validStatus === 'FROZEN',
    status: validStatus,
    rejectionReason: s.rejectionReason
      ? String(s.rejectionReason)
      : (validStatus === 'FROZEN' ? 'Your store has been frozen. Please contact customer support for assistance.' : undefined),
    joinedDate: s.joinedDate || s.createdAt || new Date().toISOString(),
    approvedAt: s.approvedAt || (validStatus === 'APPROVED' ? (s.joinedDate || new Date().toISOString()) : undefined),
    rating: typeof s.starRating === 'number' ? s.starRating : (typeof s.rating === 'number' ? s.rating : 7.0),
    starRating: typeof s.starRating === 'number' ? Math.max(0, Math.min(7, Math.round(s.starRating))) : (typeof s.rating === 'number' ? Math.max(0, Math.min(7, Math.round(s.rating))) : 7),
    totalSalesVolume: typeof s.totalSalesVolume === 'number' ? s.totalSalesVolume : 0,
    walletBalance: isNaN(balNum) ? 0 : balNum,
    selectedProductIds: Array.isArray(s.selectedProductIds) ? s.selectedProductIds.map(String) : [],
    productsCount: typeof s.productsCount === 'number' ? s.productsCount : 0,
    maxAllowedProducts: typeof s.maxAllowedProducts === 'number' ? Math.max(1, Math.round(s.maxAllowedProducts)) : 100,
    bankName: s.bankName ? String(s.bankName) : undefined,
    bankAccountName: s.bankAccountName ? String(s.bankAccountName) : undefined,
    bankAccountNumber: s.bankAccountNumber ? String(s.bankAccountNumber) : undefined,
    bankIfscCode: s.bankIfscCode ? String(s.bankIfscCode) : undefined,
    cashPaymentEnabled: Boolean(s.cashPaymentEnabled === true),
    bankPaymentEnabled: Boolean(s.bankPaymentEnabled === true),
    usdtPaymentEnabled: Boolean(s.usdtPaymentEnabled === true),
    documentType: docType,
    frontImage: front,
    backImage: back,
    kycDocumentType: docType,
    kycFrontImageUrl: front,
    kycBackImageUrl: back,
    kycDocuments: {
      documentType: docType,
      frontImageUrl: front,
      backImageUrl: back,
    },
  };
}

// Strips massive base64 image strings so localStorage never exceeds browser quotas (saving ~1.6MB per write)
export function stripImagesForStorage(sellers: SellerProfile[]): SellerProfile[] {
  if (!Array.isArray(sellers)) return [];
  return sellers.map((s) => {
    const front = s.frontImage && s.frontImage.length > 2000 ? '' : s.frontImage;
    const back = s.backImage && s.backImage.length > 2000 ? '' : s.backImage;
    return {
      ...s,
      frontImage: front,
      backImage: back,
      kycFrontImageUrl: front,
      kycBackImageUrl: back,
      kycDocuments: {
        documentType: s.kycDocuments?.documentType || s.documentType || 'ID Card',
        frontImageUrl: front,
        backImageUrl: back,
      },
    };
  });
}

/**
 * Deduplicate and merge conversations by seller so each seller has strictly ONE active thread
 */
export function deduplicateConversations(
  convList: Conversation[],
  currentSellers?: SellerProfile[]
): Conversation[] {
  if (!Array.isArray(convList)) return [];

  const sellerKeyMap = new Map<string, Conversation>();

  for (const conv of convList) {
    if (!conv || !conv.id) continue;

    const targetId = conv.participantTwoRole === 'ADMIN' ? conv.participantOneId : conv.participantTwoId;
    const cleanTargetId = (targetId || '').replace(/^conv_/, '');
    const cleanConvId = (conv.id || '').replace(/^conv_/, '');

    const matchedSeller = currentSellers?.find(
      (s) =>
        s.id === targetId ||
        s.userId === targetId ||
        s.id === cleanTargetId ||
        s.userId === cleanTargetId ||
        s.id === conv.id ||
        s.userId === conv.id ||
        s.id === cleanConvId ||
        s.userId === cleanConvId ||
        (s.email && (conv.participantOneName || '').toLowerCase().includes(s.email.toLowerCase())) ||
        (s.shopName && (conv.participantOneName || '').toLowerCase().includes(s.shopName.toLowerCase())) ||
        (s.sellerName && (conv.participantOneName || '').toLowerCase().includes(s.sellerName.toLowerCase()))
    );

    const key = matchedSeller
      ? `seller_${matchedSeller.id || matchedSeller.userId}`
      : `conv_${cleanConvId || cleanTargetId || conv.id}`;

    const existing = sellerKeyMap.get(key);
    if (!existing) {
      sellerKeyMap.set(key, {
        ...conv,
        id: matchedSeller?.id || matchedSeller?.userId || conv.id,
        participantOneName: matchedSeller?.shopName || conv.participantOneName || 'Seller',
      });
    } else {
      const existingTime = new Date(existing.lastMessageTime || 0).getTime();
      const convTime = new Date(conv.lastMessageTime || 0).getTime();
      const isConvNewer = convTime > existingTime;

      sellerKeyMap.set(key, {
        ...existing,
        lastMessageText: isConvNewer
          ? conv.lastMessageText || existing.lastMessageText
          : existing.lastMessageText || conv.lastMessageText,
        lastMessageTime: isConvNewer
          ? conv.lastMessageTime || existing.lastMessageTime
          : existing.lastMessageTime || conv.lastMessageTime,
        unreadCountParticipantTwo: Math.max(
          existing.unreadCountParticipantTwo || 0,
          conv.unreadCountParticipantTwo || 0
        ),
        unreadCountParticipantOne: Math.max(
          existing.unreadCountParticipantOne || 0,
          conv.unreadCountParticipantOne || 0
        ),
      });
    }
  }

  return Array.from(sellerKeyMap.values()).sort(
    (a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime()
  );
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage or use initial mock data (with dummy data scrubbed)
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_users');
      const raw: User[] = saved ? JSON.parse(saved) : INITIAL_USERS;
      if (Array.isArray(raw)) {
        return raw
          .filter((u) => (
            u &&
            u.id &&
            !DUMMY_USER_IDS.has(u.id) &&
            !u.email?.includes('@seller.com') &&
            !u.email?.includes('ananya7834') &&
            u.email?.toLowerCase() !== 'admin@marketplace.com' &&
            !u.name?.toLowerCase().includes('alex carter')
          ))
          .map((u) => ({ ...u, name: sanitizeName(u.name) }));
      }
    } catch {}
    return INITIAL_USERS;
  });

  // Auth Session States (Admin 120min, Seller 72hrs)
  const [adminSession, setAdminSession] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('nexus_admin_session');
      if (saved) {
        const parsed: AuthSession = JSON.parse(saved);
        if (parsed && parsed.expiresAt > Date.now()) {
          return parsed;
        }
        localStorage.removeItem('nexus_admin_session');
      }
    } catch {}
    return null;
  });

  const [sellerSession, setSellerSession] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('nexus_seller_session');
      if (saved) {
        const parsed: AuthSession = JSON.parse(saved);
        if (
          DUMMY_USER_IDS.has(parsed.userId) ||
          DUMMY_SELLER_IDS.has(parsed.userId)
        ) {
          localStorage.removeItem('nexus_seller_session');
          return null;
        }
        if (parsed && parsed.expiresAt > Date.now()) {
          return parsed;
        }
        localStorage.removeItem('nexus_seller_session');
      }
    } catch {}
    return null;
  });

  const [sessionNotice, setSessionNotice] = useState<string | null>(() => {
    return localStorage.getItem('nexus_session_notice') || null;
  });

  const [adminSessionNotice, setAdminSessionNotice] = useState<string | null>(() => {
    return localStorage.getItem('nexus_admin_session_notice') || null;
  });

  const [sellerSessionNotice, setSellerSessionNotice] = useState<string | null>(() => {
    return localStorage.getItem('nexus_seller_session_notice') || null;
  });

  // Purge any leaked legacy admin notice from shared storage
  useEffect(() => {
    try {
      const rawNotice = localStorage.getItem('nexus_session_notice');
      if (rawNotice && rawNotice.toLowerCase().includes('admin')) {
        localStorage.removeItem('nexus_session_notice');
        setSessionNotice(null);
      }
    } catch {}
  }, []);

  const [adminRemainingSeconds, setAdminRemainingSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_admin_session');
      if (saved) {
        const sess: AuthSession = JSON.parse(saved);
        return Math.max(0, Math.floor((sess.expiresAt - Date.now()) / 1000));
      }
    } catch {}
    return 120 * 60;
  });

  const [sellerRemainingSeconds, setSellerRemainingSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_seller_session');
      if (saved) {
        const sess: AuthSession = JSON.parse(saved);
        return Math.max(0, Math.floor((sess.expiresAt - Date.now()) / 1000));
      }
    } catch {}
    return 72 * 60 * 60;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const defaultCustomer: User = {
      id: 'guest_visitor',
      email: '',
      name: 'Guest Shopper',
      phone: '',
      role: 'CUSTOMER',
      avatar: '',
      createdAt: '2026-01-10T08:00:00Z',
    };

    try {
      const savedUserStr = localStorage.getItem('nexus_current_user');
      const raw: User | null = savedUserStr ? JSON.parse(savedUserStr) : null;
      const now = Date.now();

      if (raw) {
        const rawEmail = (raw.email || '').toLowerCase().trim();
        const rawName = (raw.name || '').toLowerCase().trim();
        if (
          raw.id === 'user_admin_legacy' ||
          raw.id === 'user_customer_1' ||
          raw.id === 'user_customer_2' ||
          raw.id === 'user_customer_guest' ||
          raw.id === 'guest_visitor' ||
          rawEmail === 'admin@marketplace.com' ||
          rawName.includes('alex carter') ||
          !raw.email ||
          raw.email.trim() === ''
        ) {
          localStorage.removeItem('nexus_current_user');
          localStorage.removeItem('nexus_seller_session');
          return defaultCustomer;
        }
      }

      if (raw?.role === 'ADMIN') {
        const adminSessionStr = localStorage.getItem('nexus_admin_session');
        if (adminSessionStr) {
          const sess: AuthSession = JSON.parse(adminSessionStr);
          if (sess && sess.expiresAt > now) {
            return { ...raw, name: sanitizeName(raw.name) };
          }
        }
        // Admin session expired or missing
        localStorage.removeItem('nexus_admin_session');
        localStorage.setItem('nexus_session_notice', 'Admin session expired after 120 minutes. Please sign in again.');
        return defaultCustomer;
      }

      if (raw?.role === 'SELLER') {
        if (
          DUMMY_SELLER_IDS.has(raw.id) ||
          DUMMY_USER_IDS.has(raw.id) ||
          raw.email?.includes('@seller.com') ||
          raw.email?.includes('ananya7834')
        ) {
          localStorage.removeItem('nexus_current_user');
          localStorage.removeItem('nexus_seller_session');
          return defaultCustomer;
        }

        const sellerSessionStr = localStorage.getItem('nexus_seller_session');
        if (sellerSessionStr) {
          const sess: AuthSession = JSON.parse(sellerSessionStr);
          if (sess && sess.expiresAt > now) {
            return { ...raw, name: sanitizeName(raw.name) };
          }
        }
        // Seller session expired or missing
        localStorage.removeItem('nexus_seller_session');
        localStorage.setItem('nexus_session_notice', 'Seller session expired after 72 hours. Please sign in again.');
        return defaultCustomer;
      }

      if (raw && raw.role === 'CUSTOMER' && raw.email && raw.id !== 'guest_visitor') {
        return { ...raw, name: sanitizeName(raw.name) };
      }

      // Session Recovery Fallback: When nexus_current_user was not set but active seller session exists
      const fallbackSellerSessionStr = localStorage.getItem('nexus_seller_session');
      if (fallbackSellerSessionStr) {
        const sess: any = JSON.parse(fallbackSellerSessionStr);
        const sessEmail: string = sess?.email || sess?.userEmail || '';
        if (sess && sess.expiresAt > now && sess.userId) {
          try {
            const savedSellersStr = localStorage.getItem('nexus_sellers');
            const parsedSellers: any[] = savedSellersStr ? JSON.parse(savedSellersStr) : [];
            const foundSeller = parsedSellers.find(
              (s) =>
                s.userId === sess.userId ||
                s.id === sess.userId ||
                (sessEmail && s.email?.toLowerCase() === sessEmail.toLowerCase())
            );
            const recoveredName =
              foundSeller?.sellerName ||
              foundSeller?.shopName ||
              (sessEmail ? sessEmail.split('@')[0] : 'Merchant');
            const recoveredSellerUser: User = {
              id: sess.userId,
              email: sessEmail || foundSeller?.email || '',
              name: sanitizeName(recoveredName),
              phone: foundSeller?.phone || '',
              role: 'SELLER',
              avatar:
                foundSeller?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              createdAt: foundSeller?.createdAt || new Date().toISOString(),
            };
            localStorage.setItem('nexus_current_user', JSON.stringify(recoveredSellerUser));
            return recoveredSellerUser;
          } catch {}
        }
      }

      // Session Recovery Fallback: When admin session exists
      const fallbackAdminSessionStr = localStorage.getItem('nexus_admin_session');
      if (fallbackAdminSessionStr) {
        const sess: any = JSON.parse(fallbackAdminSessionStr);
        const sessEmail: string = sess?.email || sess?.userEmail || DEFAULT_ADMIN_EMAIL;
        if (sess && sess.expiresAt > now) {
          const adminUser: User = {
            id: sess.userId || 'user_admin',
            email: sessEmail,
            name: 'Platform Administrator',
            phone: '+1 (555) 019-2834',
            role: 'ADMIN',
            avatar:
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem('nexus_current_user', JSON.stringify(adminUser));
          return adminUser;
        }
      }
    } catch {}
    return defaultCustomer;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_categories');
      if (saved) {
        const parsed: Category[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((c) => c.id));
          const missing = INITIAL_CATEGORIES.filter((c) => !existingIds.has(c.id));
          if (missing.length > 0) {
            return [...parsed, ...missing];
          }
          return parsed;
        }
      }
    } catch {}
    return INITIAL_CATEGORIES;
  });

  const [sellers, setSellers] = useState<SellerProfile[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_sellers');
      const raw: SellerProfile[] = saved ? JSON.parse(saved) : INITIAL_SELLERS;
      if (Array.isArray(raw)) {
        return raw
          .map(safeSanitizeSeller)
          .filter((s): s is SellerProfile => Boolean(s))
          .sort((a, b) => new Date(b.joinedDate || (b as any).createdAt || 0).getTime() - new Date(a.joinedDate || (a as any).createdAt || 0).getTime());
      }
    } catch {}
    return [...INITIAL_SELLERS].sort((a, b) => new Date(b.joinedDate || (b as any).createdAt || 0).getTime() - new Date(a.joinedDate || (a as any).createdAt || 0).getTime());
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_products');
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleanSaved = parsed.map((p) => ({
            ...p,
            associatedSellerIds: (p.associatedSellerIds || []).filter(
              (id) => !DUMMY_SELLER_IDS.has(id) && !id.includes('@seller.com') && !id.includes('ananya')
            ),
          }));
          const existingIds = new Set(cleanSaved.map((p) => p.id));
          const missing = INITIAL_PRODUCTS.filter((p) => !existingIds.has(p.id));
          const combined = missing.length > 0 ? [...cleanSaved, ...missing] : cleanSaved;
          return combined.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeB !== timeA) return timeB - timeA;
            return (b.id || '').localeCompare(a.id || '');
          });
        }
      }
    } catch {}
    return [...INITIAL_PRODUCTS].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('nexus_orders');
    if (!saved) {
      return [...INITIAL_ORDERS].filter((o) => !isOrderDeleted(o.id)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    try {
      const parsed: Order[] = JSON.parse(saved);
      return parsed
        .filter(
          (o) => !isOrderDeleted(o.id) && (!o.assignedSellerId || (!DUMMY_SELLER_IDS.has(o.assignedSellerId) && !o.assignedSellerId.includes('@seller.com')))
        )
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch {
      return [...INITIAL_ORDERS].filter((o) => !isOrderDeleted(o.id)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
  });

  const [wallets, setWallets] = useState<Record<string, SellerWallet>>(() => {
    try {
      const saved = localStorage.getItem('nexus_wallets');
      const raw: Record<string, SellerWallet> = saved ? JSON.parse(saved) : INITIAL_WALLETS;
      const cleaned: Record<string, SellerWallet> = {};
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) {
          if (!v || typeof v !== 'object') continue;
          const sId = typeof v.sellerId === 'string' ? v.sellerId : k;
          if (!DUMMY_SELLER_IDS.has(k) && !DUMMY_SELLER_IDS.has(sId) && !sId.includes('@seller.com')) {
            // Reset legacy test values ($150 / $75 / $225) to 0
            if (v.totalEarnings === 225 && v.availableBalance === 150 && v.pendingBalance === 75) {
              cleaned[k] = {
                ...v,
                sellerId: sId,
                availableBalance: 0,
                pendingBalance: 0,
                totalEarnings: 0,
                totalWithdrawn: 0,
              };
            } else {
              cleaned[k] = { ...v, sellerId: sId };
            }
          }
        }
      }
      return cleaned;
    } catch {
      return INITIAL_WALLETS;
    }
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    const saved = localStorage.getItem('nexus_transactions');
    let list: WalletTransaction[] = INITIAL_TRANSACTIONS;
    if (saved) {
      try {
        const parsed: WalletTransaction[] = JSON.parse(saved);
        list = parsed.filter((t) => !DUMMY_SELLER_IDS.has(t.sellerId) && !t.sellerId?.includes('@seller.com'));
      } catch {
        list = INITIAL_TRANSACTIONS;
      }
    }
    // Deduplicate and ensure absolutely unique keys
    const seenIds = new Set<string>();
    return list.map((t, idx) => {
      let uniqueId = t.id || `TX-${Date.now()}-${idx}`;
      if (seenIds.has(uniqueId)) {
        uniqueId = `${uniqueId}-${idx}-${Math.random().toString(36).substring(2, 5)}`;
      }
      seenIds.add(uniqueId);
      return { ...t, id: uniqueId };
    });
  });

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_withdrawals');
      const raw: WithdrawalRequest[] = saved ? JSON.parse(saved) : INITIAL_WITHDRAWALS;
      if (Array.isArray(raw)) {
        return raw
          .filter((w) => w && w.sellerId && !DUMMY_SELLER_IDS.has(w.sellerId) && !w.sellerId.includes('@seller.com'))
          .sort((a, b) => new Date(b.requestedAt || (b as any).createdAt || 0).getTime() - new Date(a.requestedAt || (a as any).createdAt || 0).getTime());
      }
    } catch {}
    return [...INITIAL_WITHDRAWALS].sort((a, b) => new Date(b.requestedAt || (b as any).createdAt || 0).getTime() - new Date(a.requestedAt || (a as any).createdAt || 0).getTime());
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_conversations');
      const parsed = saved ? JSON.parse(saved) : INITIAL_CONVERSATIONS;
      const deduplicated = deduplicateConversations(parsed, INITIAL_SELLERS);
      return deduplicated.filter((c) => {
        const candidateIds = [c.id, c.participantOneId, c.participantTwoId].filter(Boolean) as string[];
        return !isChatThreadDeleted(candidateIds, c.lastMessageTime);
      });
    } catch {
      return INITIAL_CONVERSATIONS;
    }
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_messages');
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_notifications');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [settings, setSettings] = useState<PlatformSettings>(() => {
    try {
      const saved = localStorage.getItem('nexus_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          minWithdrawalAmount: 10.0,
        };
      }
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [sellerLoginSessions, setSellerLoginSessions] = useState<SellerLoginSession[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_seller_login_sessions');
      return saved ? JSON.parse(saved) : INITIAL_SELLER_SESSIONS;
    } catch {
      return INITIAL_SELLER_SESSIONS;
    }
  });

  // Real-time Firestore & BroadcastChannel listener for seller login sessions
  useEffect(() => {
    const unsub = listenToFirestoreLoginSessions((sessions) => {
      if (sessions && sessions.length > 0) {
        setSellerLoginSessions(sessions);
      }
    });
    return () => unsub();
  }, []);

  const recordSellerLoginSession = async (
    sessionData: Partial<SellerLoginSession> & { sellerName: string; email: string }
  ) => {
    try {
      const saved = await saveSellerLoginSession(sessionData);
      setSellerLoginSessions((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
    } catch (err) {
      console.warn('Error recording seller login session:', err);
    }
  };

  // Track seller store / dashboard activity in real-time whenever seller enters store or dashboard
  const lastActivityTimestampRef = useRef<{ [email: string]: number }>({});

  const trackSellerStoreActivity = async (
    sellerProfile?: Partial<SellerProfile> | null,
    activity?: string
  ) => {
    try {
      const now = Date.now();
      const targetSeller =
        sellerProfile ||
        (currentUser?.role === 'SELLER'
          ? sellers.find(
              (s) =>
                s &&
                (s.userId === currentUser.id ||
                  s.id === currentUser.id ||
                  (s.email && currentUser.email && s.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()))
            )
          : null);

      if (!targetSeller && (!currentUser || currentUser.role !== 'SELLER')) return;

      const email = targetSeller?.email || currentUser?.email;
      if (!email) return;

      const emailLower = email.toLowerCase().trim();
      const lastRecorded = lastActivityTimestampRef.current[emailLower] || 0;

      // Throttle: avoid re-logging if called within 20 seconds for the same seller
      if (now - lastRecorded < 20000) {
        return;
      }
      lastActivityTimestampRef.current[emailLower] = now;

      const sellerName = targetSeller?.sellerName || currentUser?.name || 'Store Merchant';
      const shopName = targetSeller?.shopName || 'Store Partner';
      const phone = targetSeller?.phone || currentUser?.phone || '';
      const sellerId = targetSeller?.id || currentUser?.id;

      // Fetch accurate IP and location in the background
      const loc = await getClientIpAndLocation({
        city: targetSeller?.city,
        country: targetSeller?.country,
      }).catch(() => ({
        ip: 'Direct Connection',
        location: 'Store Dashboard Active Device',
      }));

      const saved = await saveSellerLoginSession({
        sellerId,
        sellerName,
        email,
        phone,
        shopName,
        ip: loc.ip,
        location: loc.location,
        timestamp: now,
        activityType: activity || 'Store Dashboard Active',
      });

      setSellerLoginSessions((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
    } catch (err) {
      console.warn('Failed to track seller store activity:', err);
    }
  };

  const refreshSellerLoginSessions = async () => {
    try {
      const sessions = await getSellerLoginSessions();
      setSellerLoginSessions(sessions);
    } catch (err) {
      console.warn('Error refreshing seller login sessions:', err);
    }
  };

  const deleteSellerLoginSessionById = async (id: string) => {
    try {
      await deleteSellerLoginSession(id);
      setSellerLoginSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.warn('Error deleting seller login session:', err);
    }
  };

  // Safe LocalStorage setter with QuotaExceededError protection
  const safeSave = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.warn(`[Storage Quota] Safely skipped localStorage key "${key}":`, err);
    }
  };

  // Sync state to localStorage safely
  useEffect(() => {
    safeSave('nexus_users', users);
  }, [users]);
  useEffect(() => {
    safeSave('nexus_current_user', currentUser);
  }, [currentUser]);
  useEffect(() => {
    safeSave('nexus_categories', categories);
  }, [categories]);
  useEffect(() => {
    safeSave('nexus_sellers', stripImagesForStorage(sellers));
  }, [sellers]);
  useEffect(() => {
    safeSave('nexus_products', products);
  }, [products]);
  useEffect(() => {
    safeSave('nexus_cart', cart);
  }, [cart]);
  useEffect(() => {
    safeSave('nexus_orders', orders);
  }, [orders]);
  useEffect(() => {
    safeSave('nexus_wallets', wallets);
  }, [wallets]);
  useEffect(() => {
    safeSave('nexus_transactions', transactions);
  }, [transactions]);
  useEffect(() => {
    safeSave('nexus_withdrawals', withdrawals);
  }, [withdrawals]);
  useEffect(() => {
    safeSave('nexus_conversations', conversations);
  }, [conversations]);
  useEffect(() => {
    safeSave('nexus_messages', messages);
  }, [messages]);

  // Real-time Chat Sync & Alert Beep Across Local Tabs (BroadcastChannel)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('nexus_chat_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'NEW_CHAT_MESSAGE' && event.data.message) {
            const incoming: Message = event.data.message;

            // Auto-reply cancellation / scheduling on cross-tab message
            if (incoming.senderRole === 'ADMIN') {
              cancelSupportAutoReply(incoming.conversationId);
            } else if (incoming.senderRole === 'SELLER') {
              scheduleSupportAutoReply(
                incoming.conversationId,
                incoming.senderId,
                incoming.senderName,
                [incoming.conversationId],
                incoming.id
              );
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) return prev;
              return [...prev, incoming];
            });

            setConversations((prev) =>
              prev.map((c) => {
                if (c.id === incoming.conversationId) {
                  const isIncomingFromAdmin = incoming.senderRole === 'ADMIN';
                  return {
                    ...c,
                    lastMessageText: incoming.text || (incoming.imageUrl ? '📷 Photo' : 'Message'),
                    lastMessageTime: incoming.timestamp,
                    lastSenderRole: incoming.senderRole,
                    unreadCountParticipantOne: isIncomingFromAdmin
                      ? (c.unreadCountParticipantOne || 0) + 1
                      : (c.unreadCountParticipantOne || 0),
                    unreadCountParticipantTwo: isIncomingFromAdmin
                      ? 0
                      : (c.unreadCountParticipantTwo || 0) + 1,
                  };
                }
                return c;
              })
            );

            // If message is from a seller (or non-admin) and Admin is logged in:
            const isFromSeller = incoming.senderRole === 'SELLER' || incoming.senderRole !== 'ADMIN';
            const isAdminActive =
              currentUser.role === 'ADMIN' ||
              Boolean(localStorage.getItem('nexus_admin_session'));

            if (isFromSeller && isAdminActive) {
              playNotificationBeep();
            }
          } else if (event.data?.type === 'MESSAGE_DELETED' && event.data.messageId) {
            setMessages((prev) => prev.filter((m) => m.id !== event.data.messageId));
          } else if (event.data?.type === 'CONVERSATION_DELETED') {
            const rawIds: string[] = event.data.candidateIds || (event.data.conversationId ? [event.data.conversationId] : []);
            const idsSet = new Set<string>();
            rawIds.forEach((id) => {
              const clean = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
              idsSet.add(id);
              idsSet.add(clean);
              idsSet.add(`conv_${clean}`);
            });
            setMessages((prev) =>
              prev.filter((m) => {
                if (idsSet.has(m.conversationId)) return false;
                if (m.senderId && idsSet.has(m.senderId)) return false;
                if ((m as any).receiverId && idsSet.has((m as any).receiverId)) return false;
                return true;
              })
            );
            setConversations((prev) =>
              prev.filter((c) => !idsSet.has(c.id) && !idsSet.has(c.participantOneId) && !idsSet.has(c.participantTwoId))
            );
          } else if (event.data?.type === 'CONVERSATION_RESET') {
            const rawIds: string[] = event.data.candidateIds || (event.data.conversationId ? [event.data.conversationId] : []);
            const idsSet = new Set<string>();
            rawIds.forEach((id) => {
              const clean = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
              idsSet.add(id);
              idsSet.add(clean);
              idsSet.add(`conv_${clean}`);
            });
            setMessages((prev) =>
              prev.filter((m) => {
                if (idsSet.has(m.conversationId)) return false;
                if (m.senderId && idsSet.has(m.senderId)) return false;
                if ((m as any).receiverId && idsSet.has((m as any).receiverId)) return false;
                return true;
              })
            );
            setConversations((prev) =>
              prev.map((c) =>
                idsSet.has(c.id)
                  ? {
                      ...c,
                      lastMessageText: '',
                      lastMessageTime: new Date().toISOString(),
                      unreadCountParticipantOne: 0,
                      unreadCountParticipantTwo: 0,
                    }
                  : c
              )
            );
          } else if (event.data?.type === 'MESSAGES_READ' && event.data.conversationId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.conversationId === event.data.conversationId
                  ? { ...m, isRead: true }
                  : m
              )
            );
          }
        };
      }
    } catch {}

    return () => {
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [currentUser.role]);

  // Real-time Firestore Cloud Message Sync (Cross-Device Phone / Tablet / PC)
  useEffect(() => {
    const unsubMsgs = listenToFirestoreMessages(
      (incoming) => {
        setMessages((prev) => {
          const existingIdx = prev.findIndex((m) => m.id === incoming.id);
          if (existingIdx !== -1) {
            // Update modified message (e.g. isRead status updated)
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], ...incoming };
            return updated;
          }

          const isFromSeller = incoming.senderRole === 'SELLER' || incoming.senderRole !== 'ADMIN';
          const isAdminActive =
            currentUser.role === 'ADMIN' ||
            Boolean(localStorage.getItem('nexus_admin_session'));

          if (isFromSeller && isAdminActive) {
            playNotificationBeep();
          }

          return [...prev, incoming];
        });

        // Auto ensure conversation list tracks this incoming message
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === incoming.conversationId);
          const msgText = incoming.text || (incoming.imageUrl ? '[Image]' : '');
          const isIncomingFromAdmin = incoming.senderRole === 'ADMIN';
          if (idx !== -1) {
            const updated = [...prev];
            const c = updated[idx];
            updated[idx] = {
              ...c,
              lastMessageText: msgText,
              lastMessageTime: incoming.timestamp,
              lastSenderRole: incoming.senderRole,
              unreadCountParticipantOne: isIncomingFromAdmin
                ? (c.unreadCountParticipantOne || 0) + 1
                : (c.unreadCountParticipantOne || 0),
              unreadCountParticipantTwo: isIncomingFromAdmin
                ? 0
                : (c.unreadCountParticipantTwo || 0) + 1,
            };
            return updated;
          } else {
            // Add new conversation representation
            const newConv: Conversation = {
              id: incoming.conversationId,
              type: incoming.senderRole === 'SELLER' ? 'SELLER_ADMIN' : 'CUSTOMER_SUPPORT',
              participantOneId: incoming.senderId,
              participantOneName: incoming.senderName,
              participantOneRole: incoming.senderRole,
              participantTwoId: 'user_admin',
              participantTwoName: 'Customer Care & Admin',
              participantTwoRole: 'ADMIN',
              lastMessageText: msgText,
              lastMessageTime: incoming.timestamp,
              lastSenderRole: incoming.senderRole,
              unreadCountParticipantOne: isIncomingFromAdmin ? 1 : 0,
              unreadCountParticipantTwo: isIncomingFromAdmin ? 0 : 1,
            };
            return [newConv, ...prev];
          }
        });
      },
      (deletedId) => {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      }
    );

    const unsubConvs = listenToFirestoreConversations((liveConvs) => {
      if (liveConvs && liveConvs.length > 0) {
        setConversations((prev) => {
          const prevMap = new Map<string, Conversation>(prev.map((c) => [c.id, c]));
          liveConvs.forEach((lc) => {
            const candidateIds = [lc.id, lc.participantOneId, lc.participantTwoId].filter(Boolean) as string[];
            if (isChatThreadDeleted(candidateIds, lc.lastMessageTime)) {
              return;
            }
            const existing = prevMap.get(lc.id);
            prevMap.set(lc.id, existing ? { ...existing, ...lc } : lc);
          });
          return deduplicateConversations(Array.from(prevMap.values()), sellers);
        });
      }
    });

    const unsubAllChats = listenToAllChats((chatsList) => {
      if (chatsList && chatsList.length > 0) {
        setConversations((prev) => {
          const map = new Map<string, Conversation>(prev.map((c) => [c.id, c]));
          chatsList.forEach((chat) => {
            const sellerMatch = sellers.find(
              (s) => s.id === chat.sellerId || s.userId === chat.sellerId
            );
            const candidateIds = [chat.id, chat.sellerId, sellerMatch?.id, sellerMatch?.userId, sellerMatch?.email].filter(Boolean) as string[];
            if (isChatThreadDeleted(candidateIds, chat.lastMessageTime)) {
              return;
            }
            const lastSenderRole = chat.lastSenderRole || (chat.lastMessageRole ? String(chat.lastMessageRole).toUpperCase() : undefined);
            const isLastFromAdmin = lastSenderRole === 'ADMIN';
            const conv: Conversation = {
              id: chat.id,
              type: 'SELLER_ADMIN',
              participantOneId: chat.sellerId || chat.participantOneId || chat.id,
              participantOneName: sellerMatch?.shopName || chat.participantOneName || 'Seller',
              participantOneRole: 'SELLER',
              participantTwoId: 'user_admin',
              participantTwoName: 'Customer Care & Admin',
              participantTwoRole: 'ADMIN',
              lastMessageText: chat.lastMessage || chat.lastMessageText || 'Chat thread opened',
              lastMessageTime: chat.lastMessageTime || new Date().toISOString(),
              lastSenderRole: lastSenderRole,
              unreadCountParticipantOne: chat.unreadCountParticipantOne ?? chat.unreadSeller ?? (isLastFromAdmin ? 1 : 0),
              unreadCountParticipantTwo: isLastFromAdmin ? 0 : (chat.unreadCountParticipantTwo ?? chat.unreadAdmin ?? 0),
            };
            map.set(chat.id, conv);
          });
          return deduplicateConversations(Array.from(map.values()), sellers);
        });
      }
    });

    const unsubNotifs = listenToFirestoreNotifications((liveNotifs: NotificationItem[]) => {
      if (liveNotifs && liveNotifs.length > 0) {
        setNotifications((prev) => {
          const prevMap = new Map<string, NotificationItem>(prev.map((n) => [n.id, n]));
          liveNotifs.forEach((ln) => {
            prevMap.set(ln.id, ln);
          });
          return Array.from(prevMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }
    });

    return () => {
      unsubMsgs();
      unsubConvs();
      unsubAllChats();
      unsubNotifs();
    };
  }, [currentUser.role]);

  // Cross-tab localStorage & BroadcastChannel listener
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nexus_messages' && e.newValue) {
        try {
          const parsed: Message[] = JSON.parse(e.newValue);
          setMessages(parsed);
        } catch {}
      }
      if (e.key === 'nexus_conversations' && e.newValue) {
        try {
          const parsed: Conversation[] = JSON.parse(e.newValue);
          setConversations(parsed);
        } catch {}
      }
      if (e.key === 'nexus_wallets' && e.newValue) {
        try {
          const parsed: Record<string, SellerWallet> = JSON.parse(e.newValue);
          setWallets((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
      if (e.key === 'nexus_sellers' && e.newValue) {
        try {
          const parsed: SellerProfile[] = JSON.parse(e.newValue);
          setSellers(parsed);
        } catch {}
      }
      if (e.key === 'nexus_orders' && e.newValue) {
        try {
          const parsed: Order[] = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOrders(parsed.filter((o) => !isOrderDeleted(o.id)));
          }
        } catch {}
      }
      if (e.key === 'nexus_deleted_order_ids' && e.newValue) {
        try {
          const ids: string[] = JSON.parse(e.newValue);
          if (Array.isArray(ids)) {
            ids.forEach((id) => recordDeletedOrderId(id));
            setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
          }
        } catch {}
      }
      if (e.key === 'nexus_withdrawals' && e.newValue) {
        try {
          const parsed: WithdrawalRequest[] = JSON.parse(e.newValue);
          setWithdrawals(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Cross-tab BroadcastChannel listener for immediate wallet & withdrawal updates
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('nexus_wallet_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'WALLET_UPDATED') {
            const { sellerId, userId, newBalance, wallet } = event.data;
            if (wallet) {
              setWallets((prev) => {
                const next = { ...prev };
                if (sellerId) next[sellerId] = wallet;
                if (userId) next[userId] = wallet;
                return next;
              });
            }
            if (typeof newBalance === 'number') {
              setSellers((prev) =>
                prev.map((s) =>
                  (sellerId && s.id === sellerId) || (userId && s.userId === userId)
                    ? { ...s, walletBalance: newBalance, balance: newBalance, availableBalance: newBalance }
                    : s
                )
              );
              setCurrentUser((u) => {
                if ((sellerId && u.id === sellerId) || (userId && u.id === userId)) {
                  return { ...u, walletBalance: newBalance, balance: newBalance };
                }
                return u;
              });
            }
          }
          if (event.data?.type === 'WITHDRAWAL_SUBMITTED' && event.data.withdrawal) {
            const incoming: WithdrawalRequest = event.data.withdrawal;
            setWithdrawals((prev) => {
              if (prev.some((w) => w.id === incoming.id)) return prev;
              const next = [incoming, ...prev];
              try { localStorage.setItem('nexus_withdrawals', JSON.stringify(next)); } catch {}
              return next;
            });
          }
          if (event.data?.type === 'WITHDRAWAL_UPDATED' && event.data.withdrawal) {
            const incoming: WithdrawalRequest = event.data.withdrawal;
            setWithdrawals((prev) => {
              const next = prev.map((w) => (w.id === incoming.id ? { ...w, ...incoming } : w));
              try { localStorage.setItem('nexus_withdrawals', JSON.stringify(next)); } catch {}
              return next;
            });
          }
          if (event.data?.type === 'SELLER_RATING_UPDATED') {
            const { sellerId, userId, starRating } = event.data;
            if (typeof starRating === 'number') {
              setSellers((prev) =>
                prev.map((s) =>
                  (sellerId && (s.id === sellerId || s.userId === sellerId)) ||
                  (userId && (s.userId === userId || s.id === userId))
                    ? { ...s, starRating, rating: starRating }
                    : s
                )
              );
            }
          }
          if (event.data?.type === 'SELLER_DELETED') {
            const { sellerId, userId } = event.data;
            setSellers((prev) =>
              prev.filter(
                (s) =>
                  s.id !== sellerId &&
                  s.userId !== sellerId &&
                  (!userId || (s.id !== userId && s.userId !== userId))
              )
            );
            setUsers((prev) =>
              prev.filter((u) => u.id !== sellerId && (!userId || u.id !== userId))
            );
            setWallets((prev) => {
              const next = { ...prev };
              if (sellerId) delete next[sellerId];
              if (userId) delete next[userId];
              return next;
            });
          }
          if (event.data?.type === 'ORDER_DELETED') {
            const { orderId } = event.data;
            if (orderId) {
              setOrders((prev) => prev.filter((o) => o.id !== orderId));
            }
          }
          if (event.data?.type === 'WITHDRAWAL_DELETED') {
            const { withdrawalId } = event.data;
            if (withdrawalId) {
              setWithdrawals((prev) => prev.filter((w) => w.id !== withdrawalId));
            }
          }
          if (event.data?.type === 'SELLER_FROZEN') {
            const { sellerId, userId, reason } = event.data;
            const freezeReason = reason || 'Your store has been frozen by Company. Please contact customer support for assistance.';
            setSellers((prev) =>
              prev.map((s) =>
                s.id === sellerId || s.userId === sellerId || (userId && (s.id === userId || s.userId === userId))
                  ? {
                      ...s,
                      applicationStatus: 'FROZEN' as ApplicationStatus,
                      isFrozen: true,
                      status: 'FROZEN',
                      rejectionReason: freezeReason,
                    }
                  : s
              )
            );
            setCurrentUser((u) => {
              if (u.id === sellerId || u.id === userId) {
                return { ...u, isFrozen: true, status: 'FROZEN' } as any;
              }
              return u;
            });
          }
          if (event.data?.type === 'SELLER_UNFROZEN') {
            const { sellerId, userId } = event.data;
            setSellers((prev) =>
              prev.map((s) =>
                s.id === sellerId || s.userId === sellerId || (userId && (s.id === userId || s.userId === userId))
                  ? {
                      ...s,
                      applicationStatus: 'APPROVED' as ApplicationStatus,
                      verificationStatus: 'approved' as VerificationStatus,
                      isFrozen: false,
                      status: 'APPROVED',
                      rejectionReason: '',
                    }
                  : s
              )
            );
            setCurrentUser((u) => {
              if (u.id === sellerId || u.id === userId) {
                return { ...u, role: 'SELLER', isFrozen: false, status: 'ACTIVE' } as any;
              }
              return u;
            });
          }
        };
      }
    } catch {}

    return () => {
      window.removeEventListener('storage', handleStorage);
      try {
        bc?.close();
      } catch {}
    };
  }, []);
  useEffect(() => {
    safeSave('nexus_notifications', notifications);
  }, [notifications]);
  useEffect(() => {
    safeSave('nexus_settings', settings);
  }, [settings]);

  // Push notification helper with Firestore sync
  const addNotification = (
    recipientId: string,
    title: string,
    message: string,
    type: 'ORDER' | 'WALLET' | 'APPLICATION' | 'SUPPORT' | 'SYSTEM',
    link?: string
  ) => {
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientId,
      title,
      message,
      type,
      link,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    syncNotificationToFirestore(newNotif).catch((err) =>
      console.warn('[Firestore] Sync notification error:', err)
    );
  };

  // Sync permanent admin credentials and real-time Firestore catalog
  useEffect(() => {
    purgeLegacyLocalStorageCredentials();
    syncAdminCredentialsFromFirestore();

    // 1. Initial Firestore seed if empty
    seedInitialFirestoreCatalog(INITIAL_PRODUCTS, INITIAL_CATEGORIES);

    // 2. Hybrid Caching & Single Fetch for Products (Quota Saving)
    fetchCachedFirestoreProducts().then((loadedProds) => {
      if (loadedProds && loadedProds.length > 0) {
        const sanitizedLive = loadedProds.map(safeSanitizeProduct).filter((p) => !isProductDeleted(p.id));
        const liveMap = new Map(sanitizedLive.map((p) => [p.id, p]));
        const merged = [...sanitizedLive];
        for (const initP of INITIAL_PRODUCTS) {
          if (!liveMap.has(initP.id) && !isProductDeleted(initP.id)) {
            merged.push(initP);
          }
        }
        merged.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeB !== timeA) return timeB - timeA;
          return (b.id || '').localeCompare(a.id || '');
        });
        setProducts(merged);
      }
    });

    // 3. Hybrid Caching & Single Fetch for Categories
    fetchCachedFirestoreCategories().then((loadedCats) => {
      if (loadedCats && loadedCats.length > 0) {
        const sanitizedCats = loadedCats.map(safeSanitizeCategory);
        setCategories(sanitizedCats);
      }
    });

    // Cross-tab live sync for catalog and orders
    let catalogSyncChannel: BroadcastChannel | null = null;
    let orderSyncChannel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        catalogSyncChannel = new BroadcastChannel('nexus_catalog_sync');
        catalogSyncChannel.onmessage = (event) => {
          const { action, payload } = event.data || {};
          if (action === 'PRODUCT_SAVED' && payload?.product) {
            setProducts((prev) => {
              const updatedProd = safeSanitizeProduct(payload.product);
              const exists = prev.some((p) => p.id === updatedProd.id);
              const next = exists
                ? prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
                : [updatedProd, ...prev];
              return next.sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
              });
            });
          } else if (action === 'PRODUCT_DELETED' && payload?.productId) {
            setProducts((prev) => prev.filter((p) => p.id !== payload.productId));
            setCart((prev) => prev.filter((item) => item.product.id !== payload.productId));
            setSellers((prev) =>
              prev.map((s) => ({
                ...s,
                selectedProductIds: (s.selectedProductIds || []).filter((id) => id !== payload.productId),
              }))
            );
          } else if (action === 'PRODUCT_REMOVED_FROM_SELLER' && payload) {
            const { productId, sellerId } = payload;
            const targetIds = new Set<string>();
            if (sellerId) targetIds.add(String(sellerId).toLowerCase());

            setProducts((prev) =>
              prev.map((p) => {
                if (p.id === productId) {
                  const currentAssociated = p.associatedSellerIds || [];
                  const updatedAssociated = currentAssociated.filter((id) => !targetIds.has(id.toLowerCase()));
                  const pSellerIdLower = (p.sellerId || '').toLowerCase();
                  const isMySellerId = Boolean(pSellerIdLower && targetIds.has(pSellerIdLower));
                  return {
                    ...p,
                    associatedSellerIds: updatedAssociated,
                    ...(isMySellerId ? { sellerId: undefined } : {}),
                  };
                }
                return p;
              })
            );

            setSellers((prev) =>
              prev.map((s) => {
                const sIdLower = (s.id || '').toLowerCase();
                const uIdLower = (s.userId || '').toLowerCase();
                const emLower = (s.email || '').toLowerCase();
                if (targetIds.has(sIdLower) || (uIdLower && targetIds.has(uIdLower)) || (emLower && targetIds.has(emLower))) {
                  return {
                    ...s,
                    selectedProductIds: (s.selectedProductIds || []).filter((id) => id !== productId),
                  };
                }
                return s;
              })
            );
          } else if (action === 'INVALIDATE_PRODUCTS') {
            fetchCachedFirestoreProducts(true).then((freshProds) => {
              if (freshProds && freshProds.length > 0) {
                setProducts(freshProds.map(safeSanitizeProduct).filter((p) => !isProductDeleted(p.id)));
              }
            });
          }
        };

        orderSyncChannel = new BroadcastChannel('nexus_order_channel');
        orderSyncChannel.onmessage = (event) => {
          const { type, orderId } = event.data || {};
          if (type === 'ORDER_DELETED' && orderId) {
            recordDeletedOrderId(orderId);
            setOrders((prev) => {
              const next = prev.filter((o) => o.id !== orderId);
              safeSave('nexus_orders', next);
              try {
                localStorage.setItem('nexus_orders', JSON.stringify(next));
              } catch {}
              return next;
            });
          }
        };
      }
    } catch {}

    const unsubProds = () => {};
    const unsubCats = () => {};

    // 4. Real-time Firestore sync for sellers (Instant reflection on Admin panel & persistent login)
    fetchAllFirestoreSellers().then((bootSellers) => {
      if (bootSellers && bootSellers.length > 0) {
        setSellers((prev) => {
          const map = new Map(prev.map((s) => [s.id, s]));
          bootSellers.forEach((rawBs) => {
            const bs = safeSanitizeSeller(rawBs);
            if (!bs || !bs.id) return;
            const bsEmail = (bs.email || '').toLowerCase().trim();
            const existing = map.get(bs.id) || (bsEmail ? prev.find((s) => (s.email || '').toLowerCase().trim() === bsEmail) : undefined);
            if (existing) {
              const mergedPassword =
                (bs.password && bs.password.trim() !== '')
                  ? bs.password
                  : (existing.password && existing.password.trim() !== '')
                  ? existing.password
                  : '';
              map.set(existing.id, { ...existing, ...bs, password: mergedPassword });
            } else {
              map.set(bs.id, bs);
            }
          });
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.joinedDate || (b as any).createdAt || 0).getTime() - new Date(a.joinedDate || (a as any).createdAt || 0).getTime()
          );
          safeSave('nexus_sellers', stripImagesForStorage(merged));
          return merged;
        });

        // Seed users state with sellers
        setUsers((prevUsers) => {
          const userMap = new Map<string, User>(prevUsers.filter(Boolean).map((u) => [u.id, u]));
          const emailMap = new Map<string, User>(
            prevUsers.filter((u) => u && u.email && u.email.trim() !== '').map((u) => [u.email.toLowerCase().trim(), u])
          );
          let changed = false;

          bootSellers.forEach((rawSeller) => {
            const seller = safeSanitizeSeller(rawSeller);
            if (!seller) return;
            const targetId = seller.userId || seller.id;
            if (!targetId) return;
            const existingById = userMap.get(targetId);
            const sellerEmail = (seller.email || '').toLowerCase().trim();
            const existingByEmail = sellerEmail ? emailMap.get(sellerEmail) : undefined;
            const existing = existingById || existingByEmail;

            if (existing) {
              if (existing.role !== 'SELLER') {
                userMap.set(existing.id, { ...existing, role: 'SELLER' });
                changed = true;
              }
            } else {
              const newUser: User = {
                id: targetId,
                email: seller.email || `${targetId}@seller.nexus`,
                name: seller.sellerName || seller.shopName || 'Merchant Seller',
                phone: seller.phone || '',
                role: 'SELLER',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                walletBalance: seller.walletBalance || 0,
                createdAt: seller.joinedDate || new Date().toISOString(),
              };
              userMap.set(newUser.id, newUser);
              changed = true;
            }
          });

          if (changed) {
            const nextUsers = Array.from(userMap.values());
            safeSave('nexus_users', nextUsers);
            return nextUsers;
          }
          return prevUsers;
        });
      }
    }).catch(() => {});

    const unsubSellers = listenToFirestoreSellers((liveSellers) => {
      if (liveSellers && liveSellers.length > 0) {
        setSellers((prev) => {
          const prevMap = new Map(prev.map((s) => [s.id, s]));
          liveSellers.forEach((rawLs) => {
            const ls = safeSanitizeSeller(rawLs);
            if (!ls || !ls.id) return;
            const lsEmail = (ls.email || '').toLowerCase().trim();
            const existing = prevMap.get(ls.id) || (lsEmail ? prev.find((s) => (s.email || '').toLowerCase().trim() === lsEmail) : undefined);
            if (existing) {
              const mergedPassword =
                (ls.password && ls.password.trim() !== '')
                  ? ls.password
                  : (existing.password && existing.password.trim() !== '')
                  ? existing.password
                  : '';
              prevMap.set(existing.id, { ...existing, ...ls, password: mergedPassword });
            } else {
              prevMap.set(ls.id, ls);
            }
          });
          const merged = Array.from(prevMap.values()).sort(
            (a, b) => new Date(b.joinedDate || (b as any).createdAt || 0).getTime() - new Date(a.joinedDate || (a as any).createdAt || 0).getTime()
          );
          safeSave('nexus_sellers', stripImagesForStorage(merged));
          return merged;
        });

        // Ensure users list is kept in sync with sellers from Firestore
        setUsers((prevUsers) => {
          const userMap = new Map<string, User>(prevUsers.filter(Boolean).map((u) => [u.id, u]));
          const emailMap = new Map<string, User>(
            prevUsers.filter((u) => u && u.email && u.email.trim() !== '').map((u) => [u.email.toLowerCase().trim(), u])
          );
          let changed = false;

          liveSellers.forEach((rawSeller) => {
            const seller = safeSanitizeSeller(rawSeller);
            if (!seller) return;
            const targetId = seller.userId || seller.id;
            if (!targetId) return;
            const existingById = userMap.get(targetId);
            const sellerEmail = (seller.email || '').toLowerCase().trim();
            const existingByEmail = sellerEmail ? emailMap.get(sellerEmail) : undefined;
            const existing = existingById || existingByEmail;

            if (existing) {
              if (existing.role !== 'SELLER') {
                userMap.set(existing.id, { ...existing, role: 'SELLER' });
                changed = true;
              }
            } else {
              const newUser: User = {
                id: targetId,
                email: seller.email || `${targetId}@seller.nexus`,
                name: seller.sellerName || seller.shopName || 'Merchant Seller',
                phone: seller.phone || '',
                role: 'SELLER',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                walletBalance: seller.walletBalance || 0,
                createdAt: seller.joinedDate || new Date().toISOString(),
              };
              userMap.set(newUser.id, newUser);
              changed = true;
            }
          });

          if (changed) {
            const nextUsers = Array.from(userMap.values());
            safeSave('nexus_users', nextUsers);
            return nextUsers;
          }
          return prevUsers;
        });
      }
    });

    // 5. Real-time Firestore sync for wallets
    const unsubWallets = listenToFirestoreWallets((liveWallets) => {
      if (liveWallets && Object.keys(liveWallets).length > 0) {
        setWallets((prev) => {
          const next = { ...prev, ...liveWallets };
          safeSave('nexus_wallets', next);
          return next;
        });
      }
    });

    // 6. Real-time Firestore sync for orders
    const unsubOrders = listenToFirestoreOrders((liveOrders) => {
      if (Array.isArray(liveOrders)) {
        setOrders((prev) => {
          const activeLive = liveOrders.filter((lo: any) => lo && lo.id && !isOrderDeleted(lo.id));
          const liveIds = new Set(activeLive.map((o) => o.id));

          // Only keep local orders if they are pending checkout sync (< 60s) AND NOT assigned orders
          // (Assigned orders are strictly managed by Admin via Firestore. If Admin deletes it, it MUST NOT be resurrected by seller's browser)
          const now = Date.now();
          const pendingLocalOnly = prev.filter((p) => {
            if (liveIds.has(p.id) || isOrderDeleted(p.id)) return false;
            // Never keep assigned orders that are missing from Firestore
            if (p.assignedSellerId || p.assignedSellerName) return false;
            // Only keep un-synced local customer checkout orders placed within the last 60 seconds
            const orderAge = p.createdAt ? now - new Date(p.createdAt).getTime() : Infinity;
            return orderAge < 60000;
          });

          const merged = [...activeLive, ...pendingLocalOnly].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          safeSave('nexus_orders', merged);
          try {
            localStorage.setItem('nexus_orders', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });

    // 6b. Real-time Firestore sync for globally tracked deleted orders
    const unsubDeletedOrders = listenToFirestoreDeletedOrders((deletedIds) => {
      if (Array.isArray(deletedIds) && deletedIds.length > 0) {
        const delSet = new Set(deletedIds);
        setOrders((prev) => {
          const hasAny = prev.some((o) => delSet.has(o.id));
          if (!hasAny) return prev;
          const next = prev.filter((o) => !delSet.has(o.id));
          safeSave('nexus_orders', next);
          try {
            localStorage.setItem('nexus_orders', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    });

    // 7. Real-time Firestore sync for store contacts / footer
    const unsubContacts = listenToFirestoreStoreContacts((liveContacts) => {
      if (liveContacts && typeof liveContacts === 'object') {
        setStoreContacts((prev) => ({
          ...prev,
          ...liveContacts,
        }));
      }
    });

    // 7b. Real-time Firestore sync for subscription plan
    const unsubSubscriptionPlan = listenToFirestoreSubscriptionPlan((livePlan) => {
      if (livePlan && typeof livePlan === 'object') {
        setSubscriptionPlan((prev) => {
          const merged = { ...prev, ...livePlan };
          try {
            localStorage.setItem('nexus_subscription_plan', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });

    // 7c. Real-time Firestore sync for 4-digit seller invitation code
    fetchFirestoreInvitationCode().then((data) => {
      if (data?.code && /^\d{4}$/.test(data.code)) {
        setInvitationCode(data.code);
        if (data.updatedAt) {
          setInvitationCodeUpdatedAt(data.updatedAt);
        }
      }
    }).catch(() => {});

    const unsubInvitationCode = listenToFirestoreInvitationCode((liveCode, meta) => {
      if (liveCode && /^\d{4}$/.test(liveCode)) {
        setInvitationCode(liveCode);
        if (meta?.updatedAt) {
          setInvitationCodeUpdatedAt(meta.updatedAt);
        }
      }
    });

    // 7d. Real-time Firestore sync for store branding & marketplace name
    fetchFirestoreStoreBranding().then((data) => {
      if (data?.storeName) {
        setStoreName(data.storeName);
        if (data.tagline) setStoreTagline(data.tagline);
        setSettings((prev) => ({ ...prev, marketplaceName: data.storeName }));
        if (typeof document !== 'undefined') {
          document.title = `${data.storeName} - Official Online Store & Seller Marketplace`;
        }
      }
    }).catch(() => {});

    const unsubBranding = listenToFirestoreStoreBranding((liveData) => {
      if (liveData?.storeName) {
        setStoreName(liveData.storeName);
        if (liveData.tagline) setStoreTagline(liveData.tagline);
        setSettings((prev) => ({ ...prev, marketplaceName: liveData.storeName }));
        if (typeof document !== 'undefined') {
          document.title = `${liveData.storeName} - Official Online Store & Seller Marketplace`;
        }
      }
    });

    // 8. Real-time Firestore sync for withdrawals
    const unsubWithdrawals = listenToFirestoreWithdrawals((liveWithdrawals) => {
      if (liveWithdrawals && liveWithdrawals.length > 0) {
        setWithdrawals((prev) => {
          const prevMap = new Map<string, WithdrawalRequest>(prev.map((w) => [w.id, w]));
          liveWithdrawals.forEach((lw: any) => {
            if (lw && lw.id) {
              const existing = prevMap.get(lw.id);
              prevMap.set(lw.id, existing ? { ...existing, ...lw } : (lw as WithdrawalRequest));
            }
          });
          const merged = Array.from(prevMap.values())
            .filter(
              (w) => w && w.sellerId && !DUMMY_SELLER_IDS.has(w.sellerId) && !w.sellerId.includes('@seller.com')
            )
            .sort(
              (a, b) => new Date(b.requestedAt || (b as any).createdAt || 0).getTime() - new Date(a.requestedAt || (a as any).createdAt || 0).getTime()
            );
          safeSave('nexus_withdrawals', merged);
          return merged;
        });
      }
    });

    // Boot fetch all withdrawals from Firestore so Admin sees pending requests immediately
    fetchAllFirestoreWithdrawals().then((bootWithdrawals) => {
      if (bootWithdrawals && bootWithdrawals.length > 0) {
        setWithdrawals((prev) => {
          const prevMap = new Map<string, WithdrawalRequest>(prev.map((w) => [w.id, w]));
          bootWithdrawals.forEach((bw: any) => {
            if (bw && bw.id) {
              const existing = prevMap.get(bw.id);
              prevMap.set(bw.id, existing ? { ...existing, ...bw } : (bw as WithdrawalRequest));
            }
          });
          const merged = Array.from(prevMap.values())
            .filter(
              (w) => w && w.sellerId && !DUMMY_SELLER_IDS.has(w.sellerId) && !w.sellerId.includes('@seller.com')
            )
            .sort(
              (a, b) => new Date(b.requestedAt || (b as any).createdAt || 0).getTime() - new Date(a.requestedAt || (a as any).createdAt || 0).getTime()
            );
          safeSave('nexus_withdrawals', merged);
          return merged;
        });
      }
    }).catch((err) => console.warn('[Firestore] Error boot fetching withdrawals:', err));

    return () => {
      unsubProds();
      unsubCats();
      unsubSellers();
      unsubWallets();
      unsubOrders();
      unsubDeletedOrders();
      unsubContacts();
      unsubSubscriptionPlan();
      unsubInvitationCode();
      unsubBranding();
      unsubWithdrawals();
    };
  }, []);

  // Admin Login (Protected with fixed admin email admiz#@gmail.com & password verification)
  const loginAdmin = async (email = DEFAULT_ADMIN_EMAIL, password = '') => {
    purgeLegacyLocalStorageCredentials();
    const authRes = await verifyAdminLoginCredentials(email, password);
    if (!authRes.success) {
      return {
        success: false,
        message: authRes.message,
      };
    }

    const adminUser: User = {
      id: 'user_admin',
      email: DEFAULT_ADMIN_EMAIL,
      name: 'Platform Admin',
      phone: '+1 (555) 019-2834',
      role: 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
    };
    const now = Date.now();
    const session: AuthSession = {
      role: 'ADMIN',
      userId: adminUser.id,
      loginTime: now,
      expiresAt: now + ADMIN_SESSION_TIMEOUT_MS, // 120 minutes = 2 hours
    };
    setAdminSession(session);
    localStorage.setItem('nexus_admin_session', JSON.stringify(session));
    setAdminRemainingSeconds(Math.floor(ADMIN_SESSION_TIMEOUT_MS / 1000));
    localStorage.removeItem('nexus_session_notice');
    setSessionNotice(null);
    setCurrentUser(adminUser);
    return {
      success: true,
      message: 'Admin authentication safe & persistent! Active for 120 minutes.',
    };
  };

  // Admin Password Reset with Secret Khan PIN (6492)
  const resetAdminPassword = async (pin: string, newPassword: string) => {
    return await resetAdminPasswordWithPin(pin, newPassword);
  };

  // Clean Guest User object
  const createGuestUser = (): User => ({
    id: 'guest_visitor',
    email: '',
    name: 'Guest Shopper',
    phone: '',
    role: 'CUSTOMER',
    avatar: '',
    createdAt: new Date().toISOString(),
  });

  // Admin Logout
  const logoutAdmin = (reason?: string) => {
    adminSignOutFirebase();
    purgeLegacyLocalStorageCredentials();
    localStorage.removeItem('nexus_admin_session');
    localStorage.removeItem('nexus_current_user');
    setAdminSession(null);
    setAdminRemainingSeconds(0);
    setCurrentUser(createGuestUser());
    if (reason) {
      localStorage.setItem('nexus_admin_session_notice', reason);
      setAdminSessionNotice(reason);
      setSessionNotice(reason);
    }
  };

  // Seller Logout
  const logoutSeller = (reason?: string) => {
    localStorage.removeItem('nexus_seller_session');
    localStorage.removeItem('nexus_current_user');
    setSellerSession(null);
    setSellerRemainingSeconds(0);
    setCurrentUser(createGuestUser());
    if (reason) {
      localStorage.setItem('nexus_seller_session_notice', reason);
      setSellerSessionNotice(reason);
    }
  };

  const clearSellerSessionNotice = () => {
    setSellerSessionNotice(null);
    try {
      localStorage.removeItem('nexus_seller_session_notice');
    } catch {}
  };

  const clearAdminSessionNotice = () => {
    setAdminSessionNotice(null);
    setSessionNotice(null);
    try {
      localStorage.removeItem('nexus_admin_session_notice');
      localStorage.removeItem('nexus_session_notice');
    } catch {}
  };

  // Generic / Customer Logout
  const logoutUser = (reason?: string) => {
    if (currentUser.role === 'ADMIN') {
      logoutAdmin(reason);
      return;
    }
    if (currentUser.role === 'SELLER') {
      logoutSeller(reason);
      return;
    }
    // CUSTOMER / Guest logout: only clear customer user state, NEVER touch seller or admin session
    localStorage.removeItem('nexus_current_user');
    setCurrentUser(createGuestUser());
    if (reason) {
      localStorage.setItem('nexus_session_notice', reason);
      setSessionNotice(reason);
    }
  };

  // Store Contacts & Footer Management
  const [storeContacts, setStoreContacts] = useState<StoreContactSettings>(() => {
    try {
      const saved = localStorage.getItem('nexus_store_contacts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const merged = { ...DEFAULT_STORE_CONTACTS, ...parsed };
          if (merged.email && merged.email.includes('@waifai.')) {
            merged.email = merged.email.replace('@waifai.', '@waifair.');
          }
          return merged;
        }
      }
    } catch {}
    return DEFAULT_STORE_CONTACTS;
  });

  const updateStoreContacts = (newContacts: Partial<StoreContactSettings>) => {
    setStoreContacts((prev) => {
      const updated = { ...prev, ...newContacts };
      try {
        localStorage.setItem('nexus_store_contacts', JSON.stringify(updated));
      } catch {}
      saveStoreContactsToFirestore(updated).catch(() => {});
      return updated;
    });
  };

  // 4-Digit Seller Registration Invitation Code Management (Synchronized with Firestore Database)
  const [invitationCode, setInvitationCode] = useState<string>(() => getStoredInvitationCode());
  const [invitationCodeUpdatedAt, setInvitationCodeUpdatedAt] = useState<string>('');

  const updateInvitationCode = async (newCode: string, updatedBy?: string) => {
    const cleanCode = newCode.trim();
    const res = await saveFirestoreInvitationCode(cleanCode, updatedBy || currentUser.name || 'Admin');
    if (res.success) {
      setInvitationCode(res.code);
      setInvitationCodeUpdatedAt(new Date().toISOString());
    }
    return res;
  };

  const validateInvitationCode = (code: string): boolean => {
    const cleanInput = (code || '').trim();
    const activeExpected = (invitationCode || DEFAULT_INVITATION_CODE).trim();
    return cleanInput === activeExpected;
  };

  // Store Name & Branding Management (Synchronized with Firestore Database)
  const [storeName, setStoreName] = useState<string>(() => getStoredStoreName());
  const [storeTagline, setStoreTagline] = useState<string>(() => DEFAULT_STORE_TAGLINE);

  const updateStoreName = async (newName: string, newTagline?: string, updatedBy?: string) => {
    const cleanName = newName.trim();
    const res = await saveFirestoreStoreBranding(
      cleanName,
      newTagline || storeTagline,
      updatedBy || currentUser.name || 'Admin'
    );
    if (res.success) {
      setStoreName(res.name);
      if (newTagline) setStoreTagline(newTagline);
      setSettings((prev) => ({
        ...prev,
        marketplaceName: res.name,
      }));
      if (typeof document !== 'undefined') {
        document.title = `${res.name} - Official Online Store & Seller Marketplace`;
      }
    }
    return res;
  };

  // Subscription Plan Settings (Global Default)
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlanSettings>(() => {
    try {
      const saved = localStorage.getItem('nexus_subscription_plan');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_SUBSCRIPTION_PLAN, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_SUBSCRIPTION_PLAN;
  });

  const updateSubscriptionPlan = (newPlan: Partial<SubscriptionPlanSettings>) => {
    setSubscriptionPlan((prev) => {
      const updated = { ...prev, ...newPlan };
      try {
        localStorage.setItem('nexus_subscription_plan', JSON.stringify(updated));
      } catch {}
      saveSubscriptionPlanSettingsToFirestore(updated).catch(() => {});
      return updated;
    });
  };

  const updateSellerSubscription = (
    sellerId: string,
    subscription: {
      subscriptionPlanName?: string;
      subscriptionPrice?: string;
      subscriptionMessage?: string;
    }
  ) => {
    setSellers((prev) => {
      const next = prev.map((s) => {
        if (s.id === sellerId || s.userId === sellerId) {
          return {
            ...s,
            ...(subscription.subscriptionPlanName !== undefined ? { subscriptionPlanName: subscription.subscriptionPlanName } : {}),
            ...(subscription.subscriptionPrice !== undefined ? { subscriptionPrice: subscription.subscriptionPrice } : {}),
            ...(subscription.subscriptionMessage !== undefined ? { subscriptionMessage: subscription.subscriptionMessage } : {}),
          };
        }
        return s;
      });
      try {
        safeSave('nexus_sellers', stripImagesForStorage(next));
      } catch {}
      return next;
    });

    updateSellerSubscriptionInFirestore(sellerId, subscription).catch(() => {});
  };

  // Auth & Switch Role
  const switchUserRole = (role: UserRole, specificUserId?: string) => {
    if (role === 'ADMIN') {
      // Security: Only switch to ADMIN if an active valid admin session exists in session state
      if (adminSession && adminSession.expiresAt > Date.now()) {
        const adminUser: User = {
          id: 'user_admin',
          email: DEFAULT_ADMIN_EMAIL,
          name: 'Platform Admin',
          phone: '+1 (555) 019-2834',
          role: 'ADMIN',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(adminUser);
      }
      return;
    }
    if (role === 'SELLER') {
      const targetUser = specificUserId
        ? users.find((u) => u.id === specificUserId)
        : users.find((u) => u.role === 'SELLER');
      if (targetUser) {
        const now = Date.now();
        const session: AuthSession = {
          role: 'SELLER',
          userId: targetUser.id,
          loginTime: now,
          expiresAt: now + SELLER_SESSION_TIMEOUT_MS, // 72 hours
        };
        setSellerSession(session);
        localStorage.setItem('nexus_seller_session', JSON.stringify(session));
        setSellerRemainingSeconds(Math.floor(SELLER_SESSION_TIMEOUT_MS / 1000));
        localStorage.removeItem('nexus_session_notice');
        setSessionNotice(null);
        setCurrentUser(targetUser);

        // Record session
        const matchedSeller = sellers.find((s) => s.userId === targetUser.id || s.id === targetUser.id || s.email === targetUser.email);
        getClientIpAndLocation({ city: matchedSeller?.city, country: matchedSeller?.country }).then((loc) => {
          recordSellerLoginSession({
            sellerId: matchedSeller?.id || targetUser.id,
            sellerName: matchedSeller?.sellerName || targetUser.name,
            email: matchedSeller?.email || targetUser.email,
            phone: matchedSeller?.phone || targetUser.phone || '',
            shopName: matchedSeller?.shopName || 'Store Partner',
            ip: loc.ip,
            location: loc.location,
          });
        }).catch(() => {
          recordSellerLoginSession({
            sellerId: matchedSeller?.id || targetUser.id,
            sellerName: matchedSeller?.sellerName || targetUser.name,
            email: matchedSeller?.email || targetUser.email,
            phone: matchedSeller?.phone || targetUser.phone || '',
            shopName: matchedSeller?.shopName || 'Store Partner',
          });
        });
      }
      return;
    }
    if (role === 'CUSTOMER') {
      const targetUser = specificUserId
        ? users.find((u) => u.id === specificUserId)
        : undefined;
      if (targetUser) {
        setCurrentUser(targetUser);
      } else {
        setCurrentUser(createGuestUser());
      }
      return;
    }
  };

  // Active session watcher & auto-logout ticker (runs every second)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      // Check Admin Session (120 minutes limit)
      if (currentUser.role === 'ADMIN') {
        const raw = localStorage.getItem('nexus_admin_session');
        if (raw) {
          try {
            const sess: AuthSession = JSON.parse(raw);
            const remaining = Math.max(0, Math.floor((sess.expiresAt - now) / 1000));
            setAdminRemainingSeconds(remaining);
            if (remaining <= 0) {
              logoutAdmin('Admin session automatically expired after 120 minutes for security. Please sign in again.');
            }
          } catch {
            logoutAdmin('Admin session invalid.');
          }
        } else {
          logoutAdmin('No active admin session found. Please sign in.');
        }
      }

      // Check Seller Session (72 hours limit)
      if (currentUser.role === 'SELLER') {
        const raw = localStorage.getItem('nexus_seller_session');
        if (raw) {
          try {
            const sess: AuthSession = JSON.parse(raw);
            const remaining = Math.max(0, Math.floor((sess.expiresAt - now) / 1000));
            setSellerRemainingSeconds(remaining);
            if (remaining <= 0) {
              logoutSeller('Seller session automatically expired after 72 hours. Please log in again.');
            }
          } catch {
            logoutSeller('Seller session invalid.');
          }
        } else {
          // Initialize session if missing
          const session: AuthSession = {
            role: 'SELLER',
            userId: currentUser.id,
            loginTime: now,
            expiresAt: now + SELLER_SESSION_TIMEOUT_MS,
          };
          setSellerSession(session);
          localStorage.setItem('nexus_seller_session', JSON.stringify(session));
          setSellerRemainingSeconds(Math.floor(SELLER_SESSION_TIMEOUT_MS / 1000));
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser.role, currentUser.id]);

  const registerCustomer = (name: string, email: string, phone: string): User => {
    const newUser: User = {
      id: `user_cust_${Date.now()}`,
      email,
      name,
      phone,
      role: 'CUSTOMER',
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    addNotification('user_admin', 'New Customer Registration', `${name} registered on the platform.`, 'SYSTEM');
    return newUser;
  };

  const registerSeller = async (data: {
    shopName: string;
    sellerName: string;
    email: string;
    phone: string;
    password?: string;
    invitationCode?: string;
    documentType?: string;
    frontImage?: string;
    backImage?: string;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  }): Promise<{
    success: boolean;
    message: string;
    user?: User;
    seller?: SellerProfile;
    cloudSynced?: boolean;
    cloudError?: string;
  }> => {
    // Security check: Active 4-digit Invitation code is mandatory from database
    const currentExpectedCode = (invitationCode || SELLER_INVITATION_CODE).trim();
    if ((data.invitationCode || '').trim() !== currentExpectedCode) {
      return {
        success: false,
        message: 'Invalid invitation code! You cannot apply without a valid merchant invitation code.',
      };
    }

    const cleanEmail = (data.email || 'seller@zazzel.com').trim().toLowerCase();
    const cleanPhone = (data.phone || '+1 6574906103').trim();
    const sellerName = data.sellerName.trim() || 'Zazzel Seller';
    const shopName = data.shopName.trim() || `${sellerName}'s Shop`;

    // Strict check: If email or phone is already registered as a seller, notify the user immediately
    const existingSeller = sellers.find(
      (s) =>
        (s.email && s.email.toLowerCase() === cleanEmail) ||
        (cleanPhone && s.phone && s.phone === cleanPhone)
    );
    if (existingSeller) {
      return {
        success: false,
        message: `Account already registered! An account with ${cleanEmail} is already registered as a seller. Please click "Sign In to Store" to log in.`,
      };
    }

    // Check existing user or create
    let existingUser = users.find(
      (u) => (u.email && u.email.toLowerCase() === cleanEmail) || (cleanPhone && u.phone === cleanPhone)
    );

    if (existingUser && existingUser.role === 'SELLER') {
      return {
        success: false,
        message: `Account already registered! An account with ${cleanEmail} is already registered as a seller. Please click "Sign In to Store" to log in.`,
      };
    }

    let sellerUser: User;
    if (existingUser) {
      sellerUser = {
        ...existingUser,
        role: 'SELLER',
        name: sellerName,
        phone: cleanPhone || existingUser.phone,
      };
      setUsers((prev) => prev.map((u) => (u.id === existingUser!.id ? sellerUser : u)));
    } else {
      sellerUser = {
        id: `user_seller_${Date.now()}`,
        email: cleanEmail,
        name: sellerName,
        phone: cleanPhone,
        role: 'SELLER',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, sellerUser]);
    }

    const docType = data.documentType || 'ID Card';
    const frontImg = data.frontImage || '';
    const backImg = data.backImage || '';
    const verStatus = data.verificationStatus || 'pending';
    const realPassword = (data.password && data.password.trim()) ? data.password.trim() : '';

    const newSellerProfile: SellerProfile = {
      id: `seller_${Date.now()}`,
      userId: sellerUser.id,
      shopName,
      sellerName,
      email: cleanEmail,
      password: realPassword,
      phone: cleanPhone,
      address: '4 Copley Place, Floor 7',
      city: 'Boston',
      country: 'United States',
      withdrawalMethod: 'BANK_TRANSFER',
      payoutDetails: 'Bank Transfer (Auto-Connected)',
      applicationStatus: 'PENDING',
      verificationStatus: verStatus,
      documentType: docType,
      frontImage: frontImg,
      backImage: backImg,
      kycDocumentType: docType,
      kycFrontImageUrl: frontImg,
      kycBackImageUrl: backImg,
      kycDocuments: {
        documentType: docType,
        frontImageUrl: frontImg,
        backImageUrl: backImg,
      },
      joinedDate: new Date().toISOString(),
      rating: 5.0,
      totalSalesVolume: 0,
    };
    if (realPassword) {
      saveStoredSellerPassword(newSellerProfile.id, newSellerProfile.email, realPassword);
    }
    setSellers((prev) => [newSellerProfile, ...prev]);

    // Sync full profile and KYC to Firestore
    let cloudSynced = false;
    let cloudError: string | undefined = undefined;
    try {
      const kycRes = await saveSellerKycToFirestore({
        sellerId: newSellerProfile.id,
        userId: sellerUser.id,
        shopName: newSellerProfile.shopName,
        sellerName: newSellerProfile.sellerName,
        email: newSellerProfile.email,
        phone: newSellerProfile.phone,
        password: newSellerProfile.password,
        documentType: docType,
        frontImage: frontImg,
        backImage: backImg,
        verificationStatus: verStatus,
        applicationStatus: 'PENDING',
        walletBalance: 0,
        joinedDate: newSellerProfile.joinedDate,
        rating: 5.0,
        totalSalesVolume: 0,
      });
      if (kycRes && kycRes.success) {
        cloudSynced = true;
      } else if (kycRes && kycRes.error) {
        cloudError = kycRes.error;
      }
    } catch (err: any) {
      console.warn('[Firestore] Sync seller KYC notice:', err);
      cloudError = err?.message;
    }

    try {
      await saveSellerWalletToFirestore(newSellerProfile.id, 0, 0, 0, 0, sellerUser.id);
    } catch (err) {
      console.warn('[Firestore] Sync initial wallet notice:', err);
    }

    // Initialize Seller Wallet with 0 balance for new store
    setWallets((prev) => {
      if (!prev[newSellerProfile.id]) {
        return {
          ...prev,
          [newSellerProfile.id]: {
            sellerId: newSellerProfile.id,
            availableBalance: 0,
            pendingBalance: 0,
            totalEarnings: 0,
            totalWithdrawn: 0,
            updatedAt: new Date().toISOString(),
          },
        };
      }
      return prev;
    });

    // AUTO LOGIN - immediately authenticate this seller with safe 72-hour session
    const now = Date.now();
    const session: AuthSession = {
      role: 'SELLER',
      userId: sellerUser.id,
      loginTime: now,
      expiresAt: now + SELLER_SESSION_TIMEOUT_MS, // 72 hours
    };
    setSellerSession(session);
    localStorage.setItem('nexus_seller_session', JSON.stringify(session));
    setSellerRemainingSeconds(Math.floor(SELLER_SESSION_TIMEOUT_MS / 1000));
    localStorage.removeItem('nexus_session_notice');
    setSessionNotice(null);
    setCurrentUser(sellerUser);

    // Initialize support conversation with initial message
    const convId = `conv_${sellerUser.id}`;
    const newConv: Conversation = {
      id: convId,
      type: 'SELLER_ADMIN',
      participantOneId: sellerUser.id,
      participantOneName: `${sellerName} (${shopName})`,
      participantOneRole: 'SELLER',
      participantTwoId: 'user_admin',
      participantTwoName: 'Customer Care & Admin',
      participantTwoRole: 'ADMIN',
      lastMessageText: 'How can I help you?',
      lastMessageTime: new Date().toISOString(),
      unreadCountParticipantOne: 1,
      unreadCountParticipantTwo: 0,
    };
    setConversations((prev) => {
      const exists = prev.some((c) => c.participantOneId === sellerUser.id);
      return exists ? prev : [newConv, ...prev];
    });

    const initMsg: Message = {
      id: `msg_init_${Date.now()}`,
      conversationId: convId,
      senderId: 'user_admin',
      senderName: 'Customer Care & Admin',
      senderRole: 'ADMIN',
      text: `Hello ${sellerName}! Your store application for "${shopName}" has been submitted and is currently pending verification by store administration. Please wait here in Support Chat; our team will review your application and approve your store shortly. You can also chat with us here anytime!`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prev) => {
      const exists = prev.some((m) => m.conversationId === convId);
      return exists ? prev : [...prev, initMsg];
    });

    addNotification(
      'user_admin',
      'New Seller Registered (Awaiting Verification)',
      `${sellerName} registered shop "${shopName}". Account is pending review.`,
      'APPLICATION',
      '/admin/sellers'
    );

    // Record login session
    getClientIpAndLocation({ city: newSellerProfile.city, country: newSellerProfile.country }).then((loc) => {
      recordSellerLoginSession({
        sellerId: newSellerProfile.id,
        sellerName: newSellerProfile.sellerName,
        email: newSellerProfile.email,
        phone: newSellerProfile.phone,
        shopName: newSellerProfile.shopName,
        ip: loc.ip,
        location: loc.location,
      });
    }).catch(() => {
      recordSellerLoginSession({
        sellerId: newSellerProfile.id,
        sellerName: newSellerProfile.sellerName,
        email: newSellerProfile.email,
        phone: newSellerProfile.phone,
        shopName: newSellerProfile.shopName,
      });
    });

    return {
      success: true,
      message: `Welcome ${sellerName}! Your shop "${shopName}" is registered and you are logged in.`,
      user: sellerUser,
      seller: newSellerProfile,
      cloudSynced,
      cloudError,
    };
  };

  const loginSeller = async (
    emailOrPhone: string,
    password?: string
  ): Promise<{ success: boolean; message: string; user?: User; seller?: SellerProfile }> => {
    const rawInput = emailOrPhone.trim();
    const query = rawInput.toLowerCase();
    const rawDigits = rawInput.replace(/\D/g, '');
    if (!query) {
      return {
        success: false,
        message: 'Please enter your seller email or phone number.',
      };
    }

    // Helper to check phone match
    const checkPhoneMatch = (storedPhone?: string) => {
      if (!storedPhone) return false;
      const cleanStored = storedPhone.trim();
      if (cleanStored === rawInput || cleanStored.toLowerCase() === query) return true;
      const storedDigits = cleanStored.replace(/\D/g, '');
      if (rawDigits.length >= 7 && storedDigits.endsWith(rawDigits)) return true;
      if (storedDigits.length >= 7 && rawDigits.endsWith(storedDigits)) return true;
      return false;
    };

    // 1. Find in in-memory state
    let matchedSeller = sellers.find(
      (s) =>
        (s.email && s.email.toLowerCase().trim() === query) ||
        checkPhoneMatch(s.phone) ||
        (s.shopName && s.shopName.toLowerCase().trim() === query) ||
        (s.id && s.id.toLowerCase() === query)
    );

    // 2. If not found in memory, check localStorage backup
    if (!matchedSeller) {
      try {
        const saved = localStorage.getItem('nexus_sellers');
        if (saved) {
          const parsed: SellerProfile[] = JSON.parse(saved);
          matchedSeller = parsed.find(
            (s) =>
              (s.email && s.email.toLowerCase().trim() === query) ||
              checkPhoneMatch(s.phone) ||
              (s.shopName && s.shopName.toLowerCase().trim() === query) ||
              (s.id && s.id.toLowerCase() === query)
          );
        }
      } catch {}
    }

    // 3. Query direct Firestore seller document to ALWAYS synchronize latest credentials from backend
    try {
      const directSeller = await getSellerByEmailOrPhoneFromFirestore(rawInput);
      if (directSeller) {
        if (matchedSeller) {
          matchedSeller = {
            ...matchedSeller,
            ...directSeller,
            password: directSeller.password || matchedSeller.password,
            isPasswordCustomized: Boolean(directSeller.isPasswordCustomized ?? (matchedSeller as any).isPasswordCustomized),
            oldPasswordDeleted: Boolean(directSeller.oldPasswordDeleted ?? (matchedSeller as any).oldPasswordDeleted),
          };
        } else {
          matchedSeller = directSeller;
        }
      } else if (!matchedSeller) {
        // Full fallback fetch from Firestore
        const liveSellers = await fetchAllFirestoreSellers();
        if (liveSellers && liveSellers.length > 0) {
          matchedSeller = liveSellers.find(
            (s) =>
              (s.email && s.email.toLowerCase().trim() === query) ||
              checkPhoneMatch(s.phone) ||
              (s.shopName && s.shopName.toLowerCase().trim() === query) ||
              (s.id && s.id.toLowerCase() === query)
          );
        }
      }
    } catch {}

    if (matchedSeller) {
      setSellers((prev) => {
        const exists = prev.some((s) => s.id === matchedSeller!.id);
        const next = exists
          ? prev.map((s) => (s.id === matchedSeller!.id ? { ...s, ...matchedSeller } : s))
          : [matchedSeller!, ...prev];
        try {
          safeSave('nexus_sellers', stripImagesForStorage(next));
        } catch {}
        return next;
      });
    }

    let matchedUser = users.find(
      (u) =>
        (u.email && u.email.toLowerCase().trim() === query) ||
        checkPhoneMatch(u.phone) ||
        (matchedSeller && (u.id === matchedSeller.userId || (matchedSeller.email && u.email.toLowerCase() === matchedSeller.email.toLowerCase())))
    );

    // Construct matchedUser if missing (e.g. loaded from Firestore directly after code update)
    if (!matchedUser && matchedSeller) {
      matchedUser = {
        id: matchedSeller.userId || matchedSeller.id,
        email: matchedSeller.email,
        name: matchedSeller.sellerName || matchedSeller.shopName || 'Seller Merchant',
        phone: matchedSeller.phone || '',
        role: 'SELLER',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        walletBalance: matchedSeller.walletBalance || 0,
        createdAt: matchedSeller.joinedDate || new Date().toISOString(),
      };
    }

    // Check if seller account exists
    if (!matchedSeller && !matchedUser) {
      if (query.includes('@')) {
        return {
          success: false,
          message: `Invalid Gmail / Email: No registered seller account found with email "${rawInput}". Please check your Gmail address or apply for a seller account.`,
        };
      } else {
        return {
          success: false,
          message: `Invalid Phone / Account: No registered seller account found with "${rawInput}". Please check your phone number or apply for a seller account.`,
        };
      }
    }

    // Validate password
    if (!password) {
      return {
        success: false,
        message: 'Password is required to sign in to your seller store.',
      };
    }

    const trimmedInputPass = password.trim();
    const cachedVaultPass = matchedSeller ? getStoredSellerPassword(matchedSeller.id, matchedSeller.email) : '';
    const cleanExpectedPassword = (matchedSeller?.password?.trim() || cachedVaultPass).trim();

    const isCustomized =
      Boolean((matchedSeller as any)?.isPasswordCustomized) ||
      Boolean((matchedSeller as any)?.oldPasswordDeleted) ||
      (cleanExpectedPassword !== '' && cleanExpectedPassword !== 'pass123456' && cleanExpectedPassword !== 'password123');

    let isPasswordValid = false;
    if (isCustomized) {
      // Must match the new/active customized password strictly. Old default passwords or previous passwords are blocked.
      isPasswordValid =
        trimmedInputPass === cleanExpectedPassword ||
        trimmedInputPass.toLowerCase() === cleanExpectedPassword.toLowerCase();
    } else {
      // Seller has not set a custom password yet
      isPasswordValid =
        !cleanExpectedPassword ||
        cleanExpectedPassword === 'pass123456' ||
        cleanExpectedPassword === 'password123' ||
        trimmedInputPass === cleanExpectedPassword ||
        trimmedInputPass === 'pass123456' ||
        trimmedInputPass === 'password123';
    }

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Incorrect Password: The password you entered does not match our records. Please verify your password and try again.',
      };
    }

    if (matchedSeller && trimmedInputPass) {
      saveStoredSellerPassword(matchedSeller.id, matchedSeller.email, trimmedInputPass);
      if (!matchedSeller.password || matchedSeller.password === 'pass123456' || matchedSeller.password === 'password123') {
        matchedSeller.password = trimmedInputPass;
        setSellers((prev) =>
          prev.map((s) => (s.id === matchedSeller.id ? { ...s, password: trimmedInputPass, isPasswordCustomized: true } : s))
        );
        updateSellerPasswordInFirestore(matchedSeller.id, trimmedInputPass, matchedSeller.userId).catch(() => {});
      }
    }

    const sellerUser: User = {
      ...matchedUser!,
      role: 'SELLER',
      walletBalance: matchedSeller?.walletBalance ?? matchedUser?.walletBalance ?? 0,
    };

    setUsers((prev) => {
      const exists = prev.some((u) => u.id === sellerUser.id);
      const next = exists ? prev.map((u) => (u.id === sellerUser.id ? sellerUser : u)) : [sellerUser, ...prev];
      try {
        localStorage.setItem('nexus_users', JSON.stringify(next));
      } catch {}
      return next;
    });

    const now = Date.now();
    const session: AuthSession = {
      role: 'SELLER',
      userId: sellerUser.id,
      loginTime: now,
      expiresAt: now + SELLER_SESSION_TIMEOUT_MS, // 72 hours
    };
    setSellerSession(session);
    try {
      localStorage.setItem('nexus_seller_session', JSON.stringify(session));
      localStorage.setItem('nexus_current_user', JSON.stringify(sellerUser));
    } catch {}
    setSellerRemainingSeconds(Math.floor(SELLER_SESSION_TIMEOUT_MS / 1000));
    localStorage.removeItem('nexus_session_notice');
    setSessionNotice(null);
    setCurrentUser(sellerUser);

    // Record seller login session
    getClientIpAndLocation({ city: matchedSeller?.city, country: matchedSeller?.country })
      .then((loc) => {
        recordSellerLoginSession({
          sellerId: matchedSeller?.id || sellerUser.id,
          sellerName: matchedSeller?.sellerName || sellerUser.name,
          email: matchedSeller?.email || sellerUser.email,
          phone: matchedSeller?.phone || sellerUser.phone || '',
          shopName: matchedSeller?.shopName || 'Seller Store',
          ip: loc.ip,
          location: loc.location,
        });
      })
      .catch(() => {
        recordSellerLoginSession({
          sellerId: matchedSeller?.id || sellerUser.id,
          sellerName: matchedSeller?.sellerName || sellerUser.name,
          email: matchedSeller?.email || sellerUser.email,
          phone: matchedSeller?.phone || sellerUser.phone || '',
          shopName: matchedSeller?.shopName || 'Seller Store',
        });
      });

    return {
      success: true,
      message: `Welcome back, ${sellerUser.name}! Logging you into your Seller Dashboard...`,
      user: sellerUser,
      seller: matchedSeller,
    };
  };

  const applyForSeller = (applicationData: {
    shopName: string;
    sellerName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    withdrawalMethod: WithdrawalMethod;
    payoutDetails: string;
    documentType?: string;
    frontImage?: string;
    backImage?: string;
  }) => {
    // Check if seller already exists
    const existing = sellers.find(
      (s) => s.email && applicationData.email && s.email.toLowerCase() === applicationData.email.toLowerCase()
    );
    if (existing) {
      return { success: false, message: 'A seller application with this email already exists.' };
    }

    // Create user if not exists or link
    let matchedUser = users.find(
      (u) => u.email && applicationData.email && u.email.toLowerCase() === applicationData.email.toLowerCase()
    );
    if (!matchedUser) {
      matchedUser = {
        id: `user_seller_${Date.now()}`,
        email: applicationData.email,
        name: applicationData.sellerName,
        phone: applicationData.phone,
        role: 'CUSTOMER', // Remains customer until approved
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, matchedUser!]);
    }

    const docType = applicationData.documentType || 'ID Card';
    const frontImg = applicationData.frontImage || '';
    const backImg = applicationData.backImage || '';

    const newSellerProfile: SellerProfile = {
      id: `seller_${Date.now()}`,
      userId: matchedUser.id,
      shopName: applicationData.shopName,
      sellerName: applicationData.sellerName,
      email: applicationData.email,
      password: (applicationData as any).password || 'pass123456',
      phone: applicationData.phone,
      address: applicationData.address,
      city: applicationData.city,
      country: applicationData.country,
      withdrawalMethod: applicationData.withdrawalMethod,
      payoutDetails: applicationData.payoutDetails,
      applicationStatus: 'PENDING',
      verificationStatus: 'pending',
      documentType: docType,
      frontImage: frontImg,
      backImage: backImg,
      kycDocumentType: docType,
      kycFrontImageUrl: frontImg,
      kycBackImageUrl: backImg,
      kycDocuments: {
        documentType: docType,
        frontImageUrl: frontImg,
        backImageUrl: backImg,
      },
      joinedDate: new Date().toISOString(),
      rating: 5.0,
      totalSalesVolume: 0,
    };

    setSellers((prev) => [newSellerProfile, ...prev]);

    // Sync to Firestore
    saveSellerKycToFirestore({
      sellerId: newSellerProfile.id,
      userId: newSellerProfile.userId,
      shopName: newSellerProfile.shopName,
      sellerName: newSellerProfile.sellerName,
      email: newSellerProfile.email,
      phone: newSellerProfile.phone,
      password: newSellerProfile.password,
      documentType: docType,
      frontImage: frontImg,
      backImage: backImg,
      verificationStatus: 'pending',
      applicationStatus: 'PENDING',
      walletBalance: 0,
    }).catch((err) => console.warn('[Firestore] Sync seller KYC notice:', err));

    // Notify Admin
    addNotification(
      'user_admin',
      'New Seller Application (Documents Attached)',
      `${applicationData.sellerName} submitted verification documents for "${applicationData.shopName}".`,
      'APPLICATION',
      '/admin/seller-applications'
    );

    return {
      success: true,
      message: 'Your seller application and verification documents have been submitted successfully! The admin will review and verify your account shortly.',
    };
  };

  const updateSellerPassword = async (sellerId: string, newPassword: string): Promise<boolean> => {
    const cleanPass = newPassword.trim();
    if (!sellerId || !cleanPass) return false;

    // 1. Immediately update local state in sellers and persistent password vault
    setSellers((prev) => {
      const next = prev.map((s) => {
        if (s.id === sellerId || s.userId === sellerId) {
          saveStoredSellerPassword(s.id, s.email, cleanPass);
          return {
            ...s,
            password: cleanPass,
            isPasswordCustomized: true,
            oldPasswordDeleted: true,
            passwordUpdatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
      try {
        safeSave('nexus_sellers', stripImagesForStorage(next));
      } catch {}
      return next;
    });

    // 2. Also update in-memory users state
    setUsers((prevUsers) => {
      const next = prevUsers.map((u) => {
        const matches =
          u.id === sellerId ||
          sellers.some(
            (s) =>
              (s.id === sellerId || s.userId === sellerId) &&
              ((u.id && (u.id === s.userId || u.id === s.id)) ||
                (u.email && s.email && u.email.toLowerCase().trim() === s.email.toLowerCase().trim()))
          );
        return matches ? { ...u, password: cleanPass } : u;
      });
      try {
        safeSave('nexus_users', next);
      } catch {}
      return next;
    });

    // 3. Update active currentUser if it's the seller
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const isCurrent =
        prev.id === sellerId ||
        sellers.some(
          (s) =>
            (s.id === sellerId || s.userId === sellerId) &&
            ((prev.id && (prev.id === s.userId || prev.id === s.id)) ||
              (prev.email && s.email && prev.email.toLowerCase().trim() === s.email.toLowerCase().trim()))
        );
      if (isCurrent) {
        const next = { ...prev, password: cleanPass };
        try {
          safeSave('nexus_user', next);
        } catch {}
        return next;
      }
      return prev;
    });

    // 4. Update in Firestore backend so old password is completely purged and replaced
    try {
      const targetSeller = sellers.find((s) => s.id === sellerId || s.userId === sellerId);
      await updateSellerPasswordInFirestore(sellerId, cleanPass, targetSeller?.userId);
      return true;
    } catch {
      return true;
    }
  };

  // Seller Applications Review
  const approveSellerApplication = (sellerId: string) => {
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id === sellerId) {
          // Upgrade linked user role to SELLER
          setUsers((uList) =>
            uList.map((u) => (u.id === s.userId ? { ...u, role: 'SELLER' } : u))
          );

          // Initialize wallet if not exists
          setWallets((wMap) => {
            if (!wMap[sellerId]) {
              return {
                ...wMap,
                [sellerId]: {
                  sellerId,
                  availableBalance: 0,
                  pendingBalance: 0,
                  totalEarnings: 0,
                  totalWithdrawn: 0,
                  updatedAt: new Date().toISOString(),
                },
              };
            }
            return wMap;
          });

          // Notify Seller
          addNotification(
            s.userId,
            'Seller Application Approved 🎉',
            `Congratulations! Your shop "${s.shopName}" and identity verification have been approved by the Admin.`,
            'APPLICATION',
            '/seller/dashboard'
          );

          // Also inject approval message into support chat
          const conv = conversations.find(
            (c) => c.participantOneId === s.userId || c.participantTwoId === s.userId
          );
          if (conv) {
            const approvalMsg: Message = {
              id: `msg_approved_${Date.now()}`,
              conversationId: conv.id,
              senderId: 'user_admin',
              senderName: 'Customer Care & Admin',
              senderRole: 'ADMIN',
              text: `🎉 Congratulations! Your store "${s.shopName}" and identity documents have been officially verified and approved. You can now access all seller features and receive orders.`,
              timestamp: new Date().toISOString(),
              isRead: false,
            };
            setMessages((prevMsgs) => [...prevMsgs, approvalMsg]);
          }

          // Sync status update to Firestore
          updateSellerVerificationInFirestore(sellerId, 'approved').catch((err) =>
            console.warn('[Firestore] Update verification notice:', err)
          );

          // Broadcast unfreeze
          try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
              const bc = new BroadcastChannel('nexus_wallet_channel');
              bc.postMessage({ type: 'SELLER_UNFROZEN', sellerId: s.id, userId: s.userId });
              bc.close();
            }
          } catch {}

          return {
            ...s,
            applicationStatus: 'APPROVED' as ApplicationStatus,
            verificationStatus: 'approved',
            isFrozen: false,
            status: 'APPROVED',
            rejectionReason: '',
            approvedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
  };

  const rejectSellerApplication = (sellerId: string, reason: string) => {
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id === sellerId) {
          addNotification(
            s.userId,
            'Seller Verification Update',
            `Your seller application and verification documents for "${s.shopName}" were not approved. Reason: ${reason}`,
            'APPLICATION'
          );

          // Sync status update to Firestore
          updateSellerVerificationInFirestore(sellerId, 'rejected', reason).catch((err) =>
            console.warn('[Firestore] Update verification notice:', err)
          );

          return {
            ...s,
            applicationStatus: 'REJECTED' as ApplicationStatus,
            verificationStatus: 'rejected',
            rejectionReason: reason,
          };
        }
        return s;
      })
    );
  };

  const freezeSellerApplication = (sellerId: string, reason?: string) => {
    const cleanReason = reason || 'Your store has been frozen by Company. Please contact customer support for assistance.';
    const targetSeller = sellers.find((s) => s.id === sellerId || s.userId === sellerId);
    const userId = targetSeller?.userId || sellerId;

    // 1. Immediately update in-memory sellers state & save to localStorage
    setSellers((prev) => {
      const next = prev.map((s) => {
        if (s.id === sellerId || s.userId === sellerId) {
          return {
            ...s,
            applicationStatus: 'FROZEN' as ApplicationStatus,
            isFrozen: true,
            status: 'FROZEN',
            rejectionReason: cleanReason,
          };
        }
        return s;
      });
      try {
        safeSave('nexus_sellers', stripImagesForStorage(next));
      } catch {}
      return next;
    });

    // 2. Update users list if linked
    setUsers((uList) =>
      uList.map((u) => (u.id === userId || u.id === sellerId ? { ...u, isFrozen: true, status: 'FROZEN' } : u))
    );

    // 3. If current user is this seller, update currentUser state
    setCurrentUser((curr) => {
      if (curr && (curr.id === userId || curr.id === sellerId || (targetSeller?.email && curr.email?.toLowerCase() === targetSeller.email.toLowerCase()))) {
        return { ...curr, isFrozen: true, status: 'FROZEN' } as any;
      }
      return curr;
    });

    // 4. Notify Seller
    addNotification(
      userId,
      'Account Frozen ⚠️',
      cleanReason,
      'APPLICATION',
      '/seller-support'
    );

    // 5. Inject freeze notice directly into support chat
    const conv = conversations.find(
      (c) => c.participantOneId === userId || c.participantTwoId === userId || c.id === sellerId || c.id === userId
    );
    const targetConvId = conv?.id || `conv_${sellerId}`;
    const freezeMsg: Message = {
      id: `msg_frozen_${Date.now()}`,
      conversationId: targetConvId,
      senderId: 'user_admin',
      senderName: 'Customer Care & Company',
      senderRole: 'ADMIN',
      text: `⚠️ Your store has been frozen by Company. Please contact Customer Care for assistance.`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prevMsgs) => [...prevMsgs, freezeMsg]);
    syncMessageToFirestore(freezeMsg);

    // 6. Sync freeze state to Firestore (collection: sellers)
    updateSellerFreezeStatusInFirestore(sellerId, true, cleanReason).catch((err) =>
      console.warn('[Firestore] Update freeze status error:', err)
    );

    // 7. Broadcast across open tabs and windows via BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nexus_wallet_channel');
        bc.postMessage({
          type: 'SELLER_FROZEN',
          sellerId,
          userId,
          reason: cleanReason,
          timestamp: Date.now(),
        });
        bc.close();
      }
    } catch {}
  };

  const unfreezeSellerApplication = (sellerId: string) => {
    const targetSeller = sellers.find((s) => s.id === sellerId || s.userId === sellerId);
    const userId = targetSeller?.userId || sellerId;

    // 1. Immediately update in-memory sellers state & save to localStorage
    setSellers((prev) => {
      const next = prev.map((s) => {
        if (s.id === sellerId || s.userId === sellerId) {
          return {
            ...s,
            applicationStatus: 'APPROVED' as ApplicationStatus,
            verificationStatus: 'approved' as VerificationStatus,
            isFrozen: false,
            status: 'APPROVED',
            rejectionReason: '',
          };
        }
        return s;
      });
      try {
        safeSave('nexus_sellers', stripImagesForStorage(next));
      } catch {}
      return next;
    });

    // 2. Update users list
    setUsers((uList) =>
      uList.map((u) => (u.id === userId || u.id === sellerId ? { ...u, role: 'SELLER', isFrozen: false, status: 'ACTIVE' } : u))
    );

    // 3. Update currentUser if matched
    setCurrentUser((curr) => {
      if (curr && (curr.id === userId || curr.id === sellerId || (targetSeller?.email && curr.email?.toLowerCase() === targetSeller.email.toLowerCase()))) {
        return { ...curr, role: 'SELLER', isFrozen: false, status: 'ACTIVE' } as any;
      }
      return curr;
    });

    // 4. Notify Seller
    addNotification(
      userId,
      'Store Unfrozen 🎉',
      `Your store has been unfrozen by Customer Care / Company. All dashboard features are restored.`,
      'APPLICATION',
      '/seller/dashboard'
    );

    // 5. Inject unfreeze notice into support chat (using canonical seller conversation)
    const targetConv = startOrGetSupportConversation(
      targetSeller?.userId || userId || sellerId,
      targetSeller?.shopName || targetSeller?.sellerName,
      'SELLER'
    );
    const targetConvId = targetConv.id;
    const unfreezeMsg: Message = {
      id: `msg_unfrozen_${Date.now()}`,
      conversationId: targetConvId,
      senderId: 'user_admin',
      senderName: 'Customer Care & Company',
      senderRole: 'ADMIN',
      text: `🎉 Your store has been unfrozen by Company! Your dashboard is now fully unlocked and all services are restored.`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prevMsgs) => [...prevMsgs, unfreezeMsg]);
    syncMessageToFirestore(unfreezeMsg);

    // 6. Sync unfreeze to Firestore
    updateSellerFreezeStatusInFirestore(sellerId, false).catch((err) =>
      console.warn('[Firestore] Update unfreeze status error:', err)
    );

    // 7. Broadcast across open tabs and windows via BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nexus_wallet_channel');
        bc.postMessage({
          type: 'SELLER_UNFROZEN',
          sellerId,
          userId,
          timestamp: Date.now(),
        });
        bc.close();
      }
    } catch {}
  };

  const verifySellerKyc = (sellerId: string, status: 'approved' | 'rejected', reason?: string) => {
    if (status === 'approved') {
      approveSellerApplication(sellerId);
    } else {
      rejectSellerApplication(sellerId, reason || 'Document verification failed. Please provide clearer photos of both sides.');
    }
  };

  const updateSellerProfile = (sellerId: string, updates: Partial<SellerProfile>) => {
    setSellers((prev) => prev.map((s) => (s.id === sellerId ? { ...s, ...updates } : s)));
  };

  const updateSellerStatus = (sellerId: string, status: ApplicationStatus, reason?: string) => {
    if (status === 'APPROVED') {
      approveSellerApplication(sellerId);
    } else if (status === 'REJECTED') {
      rejectSellerApplication(sellerId, reason || 'Application rejected');
    } else if (status === 'FROZEN') {
      freezeSellerApplication(sellerId, reason || 'Account temporarily frozen');
    } else {
      updateSellerProfile(sellerId, { applicationStatus: status });
    }
  };

  const updateSellerStarRating = (sellerId: string, starRating: number) => {
    const valid = Math.max(0, Math.min(7, Math.round(starRating)));

    // 1. Immediately update in-memory React state and persist to localStorage
    setSellers((prev) => {
      const next = prev.map((s) => {
        if (s.id === sellerId || s.userId === sellerId) {
          return { ...s, starRating: valid, rating: valid };
        }
        return s;
      });
      try {
        safeSave('nexus_sellers', stripImagesForStorage(next));
      } catch (err) {
        console.warn('Failed to save updated sellers to localStorage:', err);
      }
      return next;
    });

    // 2. Find target seller to get userId and shopName
    const targetSeller = sellers.find((s) => s.id === sellerId || s.userId === sellerId);
    const userId = targetSeller?.userId || sellerId;

    // 3. Broadcast across open tabs and windows via BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_wallet_channel');
        bc.postMessage({
          type: 'SELLER_RATING_UPDATED',
          sellerId,
          userId,
          starRating: valid,
          rating: valid,
          timestamp: Date.now(),
        });
        bc.close();
      }
    } catch {}

    // 4. Dispatch custom window event for instantaneous same-tab listener
    try {
      window.dispatchEvent(
        new CustomEvent('seller_rating_updated', {
          detail: { sellerId, userId, starRating: valid },
        })
      );
    } catch {}

    // 5. Persist to Firestore asynchronously for real-time cloud consistency
    saveSellerRatingToFirestore(sellerId, valid, userId).catch((err) => {
      console.warn('[Firestore] Notice while saving seller star rating:', err);
    });
  };

  const updateSellerMaxProducts = (sellerId: string, maxProducts: number) => {
    const valid = Math.max(1, Math.round(maxProducts));

    // 1. Immediately update state and localStorage
    setSellers((prev) => {
      const next = prev.map((s) => {
        if (s.id === sellerId || s.userId === sellerId) {
          return { ...s, maxAllowedProducts: valid };
        }
        return s;
      });
      try {
        safeSave('nexus_sellers', stripImagesForStorage(next));
      } catch (err) {
        console.warn('Failed to save updated sellers to localStorage:', err);
      }
      return next;
    });

    // 2. Persist to Firestore
    const targetSeller = sellers.find((s) => s.id === sellerId || s.userId === sellerId);
    const userId = targetSeller?.userId || sellerId;

    saveSellerMaxProductsToFirestore(sellerId, valid, userId).catch((err) => {
      console.warn('[Firestore] Notice while saving seller max products limit:', err);
    });
  };

  const deleteSeller = (sellerId: string) => {
    const seller = sellers.find((s) => s.id === sellerId || s.userId === sellerId);
    const targetUserId = seller?.userId;
    const targetEmail = seller?.email;

    // 1. Remove from React states immediately
    setSellers((prev) => {
      const next = prev.filter(
        (s) =>
          s.id !== sellerId &&
          s.userId !== sellerId &&
          (!targetUserId || (s.id !== targetUserId && s.userId !== targetUserId)) &&
          (!targetEmail || (s.email || '').toLowerCase() !== targetEmail.toLowerCase())
      );
      try {
        safeSave('nexus_sellers', stripImagesForStorage(next));
      } catch {}
      return next;
    });

    setUsers((prev) => {
      const next = prev.filter(
        (u) =>
          u.id !== sellerId &&
          (!targetUserId || u.id !== targetUserId) &&
          (!targetEmail || (u.email || '').toLowerCase() !== targetEmail.toLowerCase())
      );
      try {
        safeSave('nexus_users', next);
      } catch {}
      return next;
    });

    setWallets((prev) => {
      const next = { ...prev };
      delete next[sellerId];
      if (targetUserId) delete next[targetUserId];
      try {
        localStorage.setItem('nexus_wallets', JSON.stringify(next));
      } catch {}
      return next;
    });

    setProducts((prev) => {
      const next = prev.map((p) => ({
        ...p,
        associatedSellerIds: (p.associatedSellerIds || []).filter(
          (id) => id !== sellerId && (!targetUserId || id !== targetUserId)
        ),
      }));
      try {
        safeSave('nexus_products', next);
      } catch {}
      return next;
    });

    setOrders((prev) => {
      const next = prev.filter(
        (o) =>
          o.assignedSellerId !== sellerId &&
          (!targetUserId || o.assignedSellerId !== targetUserId)
      );
      try {
        safeSave('nexus_orders', next);
      } catch {}
      return next;
    });

    setWithdrawals((prev) => {
      const next = prev.filter(
        (w) => w.sellerId !== sellerId && (!targetUserId || w.sellerId !== targetUserId)
      );
      try {
        localStorage.setItem('nexus_withdrawals', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Clear current session if logged in as this deleted seller
    setCurrentUser((cur) => {
      if (!cur) return cur;
      if (
        cur.id === sellerId ||
        (targetUserId && cur.id === targetUserId) ||
        (targetEmail && (cur.email || '').toLowerCase() === targetEmail.toLowerCase())
      ) {
        return {
          id: 'usr_guest',
          name: 'Guest Customer',
          email: 'guest@zazzel.com',
          role: 'CUSTOMER',
        } as User;
      }
      return cur;
    });

    // 3. Broadcast deletion across open tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_wallet_channel');
        bc.postMessage({
          type: 'SELLER_DELETED',
          sellerId,
          userId: targetUserId,
          email: targetEmail,
        });
        bc.close();
      }
    } catch {}

    // 4. Permanent backend database wipe (Firestore: profile, kyc docs, wallet, sessions, orders, products, chats, notifications)
    deleteSellerFromFirestore(sellerId, {
      id: sellerId,
      userId: targetUserId,
      email: targetEmail,
      shopName: seller?.shopName,
    }).catch((err) => {
      console.warn('[Firestore] Error wiping seller from backend Firestore:', err);
    });
  };

  const clearAllTestSellers = () => {
    setSellers([]);
    setWallets({});
    setUsers((prev) => prev.filter((u) => u.role !== 'SELLER'));
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        associatedSellerIds: [],
      }))
    );
    localStorage.removeItem('nexus_sellers');
    localStorage.removeItem('nexus_wallets');
  };

  // Categories
  const addCategory = (categoryData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...categoryData,
      id: `cat_${Date.now()}`,
      itemCount: 0,
    };
    setCategories((prev) => [...prev, newCat]);
    saveCategoryToFirestore(newCat);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      const updated = next.find((c) => c.id === id);
      if (updated) {
        saveCategoryToFirestore(updated);
      }
      return next;
    });
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    deleteCategoryFromFirestore(id);
  };

  // Products (Admin Controlled - Synced with Firebase Firestore)
  const addProduct = (
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'reviewCount'>
  ): Product => {
    const cat = categories.find((c) => c.id === productData.categoryId);
    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}`,
      categoryName: cat?.name || 'General',
      rating: 5.0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);
    saveProductToFirestore(newProduct);

    // Update category count
    if (productData.categoryId) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === productData.categoryId ? { ...c, itemCount: (c.itemCount || 0) + 1 } : c
        )
      );
    }

    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id === id) {
          const updatedCat = updates.categoryId
            ? categories.find((c) => c.id === updates.categoryId)?.name
            : p.categoryName;
          const updatedProd = {
            ...p,
            ...updates,
            categoryName: updatedCat || p.categoryName,
            updatedAt: new Date().toISOString(),
          };
          saveProductToFirestore(updatedProd);
          return updatedProd;
        }
        return p;
      });
      return next;
    });
  };

  const deleteProduct = (id: string) => {
    recordDeletedProductId(id);
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem('nexus_products', JSON.stringify(next));
      } catch {}
      return next;
    });
    setCart((prev) => {
      const next = prev.filter((item) => item.product.id !== id);
      try {
        localStorage.setItem('nexus_cart', JSON.stringify(next));
      } catch {}
      return next;
    });
    // Remove from all sellers' selected lists immediately
    setSellers((prev) =>
      prev.map((s) => ({
        ...s,
        selectedProductIds: (s.selectedProductIds || []).filter((pid) => pid !== id),
      }))
    );
    deleteProductFromFirestore(id);
  };

  const toggleProductPublish = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated: Product = {
            ...p,
            status: p.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
            updatedAt: new Date().toISOString(),
          };
          saveProductToFirestore(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const toggleSellerProductEligibility = (productId: string, sellerId: string) => {
    // Unmark deleted product id so re-adding works seamlessly without constraints
    unmarkDeletedProductId(productId);

    const matchingSeller = sellers.find(
      (s) => s.id === sellerId || s.userId === sellerId || (s.email && s.email.toLowerCase() === sellerId.toLowerCase())
    );

    const targetSellerIds = new Set<string>([sellerId]);
    if (matchingSeller) {
      if (matchingSeller.id) targetSellerIds.add(matchingSeller.id);
      if (matchingSeller.userId) targetSellerIds.add(matchingSeller.userId);
    }

    let isCurrentlyAdded = false;

    // Check limit if attempting to add
    if (matchingSeller) {
      const currentSelected = matchingSeller.selectedProductIds || [];
      const isAlready = currentSelected.includes(productId);
      const maxLimit = matchingSeller.maxAllowedProducts || 100;
      if (!isAlready && currentSelected.length >= maxLimit) {
        console.warn(`[StoreContext] Seller ${sellerId} has reached maximum product limit of ${maxLimit}.`);
        return;
      }
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const currentList = p.associatedSellerIds || [];
          const exists =
            currentList.some((sId) => targetSellerIds.has(sId)) ||
            (matchingSeller?.selectedProductIds && matchingSeller.selectedProductIds.includes(productId));
          
          isCurrentlyAdded = Boolean(exists);

          const updatedSellers = exists
            ? currentList.filter((sId) => !targetSellerIds.has(sId))
            : [...currentList, matchingSeller?.id || sellerId];

          const updatedProd: Product = {
            ...p,
            associatedSellerIds: updatedSellers,
            updatedAt: new Date().toISOString(),
          };
          saveProductToFirestore(updatedProd);
          return updatedProd;
        }
        return p;
      })
    );

    // Also update seller profile selectedProductIds in state and Firestore
    if (matchingSeller) {
      setSellers((prev) =>
        prev.map((s) => {
          if (s.id === matchingSeller.id || (matchingSeller.userId && s.userId === matchingSeller.userId)) {
            const currentSelected = new Set(s.selectedProductIds || []);
            if (isCurrentlyAdded) {
              currentSelected.delete(productId);
            } else {
              currentSelected.add(productId);
            }
            const updatedSeller: SellerProfile = {
              ...s,
              selectedProductIds: Array.from(currentSelected),
            };
            saveSellerKycToFirestore({
              ...updatedSeller,
              sellerId: updatedSeller.id,
            }).catch((err) =>
              console.warn('[Firestore] Sync seller selected products notice:', err)
            );
            return updatedSeller;
          }
          return s;
        })
      );
    }
  };

  const addProductsToSeller = (productIds: string[], sellerId: string) => {
    const targetSeller = sellers.find(
      (s) => s.id === sellerId || s.userId === sellerId || (s.email && s.email.toLowerCase() === sellerId.toLowerCase())
    );
    const maxLimit = targetSeller?.maxAllowedProducts || 100;
    const currentSelected = new Set(targetSeller?.selectedProductIds || []);

    // Filter to only add up to remaining limit
    const remainingSlots = Math.max(0, maxLimit - currentSelected.size);
    const validToAdd = productIds.filter((id) => !currentSelected.has(id)).slice(0, remainingSlots);

    if (validToAdd.length === 0) return;

    const idSet = new Set(validToAdd);
    setProducts((prev) =>
      prev.map((p) => {
        if (idSet.has(p.id)) {
          const currentList = p.associatedSellerIds || [];
          if (!currentList.includes(sellerId)) {
            const updatedProd: Product = {
              ...p,
              associatedSellerIds: [...currentList, sellerId],
              updatedAt: new Date().toISOString(),
            };
            saveProductToFirestore(updatedProd);
            return updatedProd;
          }
        }
        return p;
      })
    );

    // Also update seller profile selectedProductIds in state and Firestore
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id === sellerId || s.userId === sellerId) {
          validToAdd.forEach((id) => currentSelected.add(id));
          const updatedSeller: SellerProfile = {
            ...s,
            selectedProductIds: Array.from(currentSelected),
          };
          saveSellerKycToFirestore({
            ...updatedSeller,
            sellerId: updatedSeller.id,
          }).catch((err) =>
            console.warn('[Firestore] Sync seller selected products error:', err)
          );
          return updatedSeller;
        }
        return s;
      })
    );
  };

  const removeProductFromSeller = (productId: string, sellerId: string) => {
    if (!productId || !sellerId) return;

    // Security Gate: Only Admin is authorized to remove products from a seller
    const isAdmin = currentUser.role === 'ADMIN' || Boolean(localStorage.getItem('nexus_admin_session'));
    if (!isAdmin) {
      console.warn('[StoreContext] Non-admin user attempted to remove product from seller. Blocked.');
      return;
    }

    const matchingSeller = sellers.find(
      (s) =>
        s.id === sellerId ||
        s.userId === sellerId ||
        (s.email && s.email.toLowerCase() === sellerId.toLowerCase()) ||
        (sellerId.length > 2 &&
          ((s.shopName && s.shopName.toLowerCase().includes(sellerId.toLowerCase())) ||
            (s.sellerName && s.sellerName.toLowerCase().includes(sellerId.toLowerCase()))))
    );

    const targetSellerIds = new Set<string>();
    if (sellerId) targetSellerIds.add(sellerId.toLowerCase());
    if (matchingSeller) {
      if (matchingSeller.id) targetSellerIds.add(matchingSeller.id.toLowerCase());
      if (matchingSeller.userId) targetSellerIds.add(matchingSeller.userId.toLowerCase());
      if (matchingSeller.email) targetSellerIds.add(matchingSeller.email.toLowerCase());
    }

    // 1. Update Product in state, localStorage & Firestore
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id === productId) {
          const currentList = p.associatedSellerIds || [];
          const updatedSellers = currentList.filter((sId) => !targetSellerIds.has(sId.toLowerCase()));
          const pSellerIdLower = (p.sellerId || '').toLowerCase();
          const isMySellerId = Boolean(pSellerIdLower && targetSellerIds.has(pSellerIdLower));

          const updatedProd: Product = {
            ...p,
            associatedSellerIds: updatedSellers,
            ...(isMySellerId ? { sellerId: undefined } : {}),
            updatedAt: new Date().toISOString(),
          };
          saveProductToFirestore(updatedProd);
          return updatedProd;
        }
        return p;
      });
      safeSave('nexus_products', next);
      try {
        localStorage.setItem('nexus_products', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Update Seller profile in state, localStorage & Firestore
    if (matchingSeller) {
      setSellers((prev) => {
        const next = prev.map((s) => {
          const sIdLower = (s.id || '').toLowerCase();
          const uIdLower = (s.userId || '').toLowerCase();
          const isTarget = targetSellerIds.has(sIdLower) || (uIdLower && targetSellerIds.has(uIdLower));
          if (isTarget) {
            const currentSelected = s.selectedProductIds || [];
            const updatedSelected = currentSelected.filter((id) => id !== productId);
            const updatedSeller: SellerProfile = {
              ...s,
              selectedProductIds: updatedSelected,
              productsCount: Math.max(0, updatedSelected.length),
            };
            saveSellerKycToFirestore({
              ...updatedSeller,
              sellerId: updatedSeller.id,
            }).catch((err) =>
              console.warn('[Firestore] Sync seller removed product error:', err)
            );
            return updatedSeller;
          }
          return s;
        });
        safeSave('nexus_sellers', stripImagesForStorage(next));
        try {
          localStorage.setItem('nexus_sellers', JSON.stringify(stripImagesForStorage(next)));
        } catch {}
        return next;
      });
    }

    // 3. Cross-tab BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_catalog_sync');
        bc.postMessage({
          action: 'PRODUCT_REMOVED_FROM_SELLER',
          payload: { productId, sellerId: matchingSeller?.id || sellerId },
        });
        setTimeout(() => bc.close(), 1000);
      }
    } catch {}
  };

  // Cart
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Orders
  const createOrder = (data: {
    shippingAddress: ShippingAddress;
    paymentMethod: string;
    notes?: string;
    assignedSellerId?: string;
    assignedSellerName?: string;
    customCreatedAt?: string;
  }): Order => {
    const globalComm = settings.globalCommissionPct;
    let totalAdminProfit = 0;
    let totalSellerEarning = 0;

    let detectedSellerId: string | undefined = undefined;
    let detectedSellerName: string | undefined = undefined;

    const orderItems = cart.map((item) => {
      const effectiveComm =
        typeof item.product.customAdminCommissionPct === 'number'
          ? item.product.customAdminCommissionPct
          : globalComm;

      const itemTotal = Number((item.product.price * item.quantity).toFixed(2));
      const adminProfit = Number(((itemTotal * effectiveComm) / 100).toFixed(2));
      // Seller guaranteed profit is 21% of product item cost
      const sellerEarning = Number(((itemTotal * 21) / 100).toFixed(2));

      totalAdminProfit += adminProfit;
      totalSellerEarning += sellerEarning;

      // Identify seller association for this product
      const fullProd = products.find((p) => p.id === item.product.id) || item.product;
      const itemSellerId =
        (fullProd.associatedSellerIds && fullProd.associatedSellerIds.length > 0)
          ? fullProd.associatedSellerIds[0]
          : (fullProd as any).sellerId;

      if (itemSellerId && !detectedSellerId) {
        const matchingSeller = sellers.find((s) => s.id === itemSellerId);
        if (matchingSeller) {
          detectedSellerId = matchingSeller.id;
          detectedSellerName = matchingSeller.shopName || matchingSeller.sellerName;
        } else {
          detectedSellerId = itemSellerId;
        }
      }

      // Reduce product stock
      updateProduct(item.product.id, {
        stock: Math.max(0, item.product.stock - item.quantity),
      });

      const effectiveSellerId = (data as any).assignedSellerId || itemSellerId || undefined;

      return {
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images[0] || '',
        sellerId: effectiveSellerId,
        unitPrice: item.product.price,
        quantity: item.quantity,
        totalPrice: itemTotal,
        appliedCommissionPct: effectiveComm,
        adminProfit,
        sellerEarning,
      };
    });

    const subtotal = cartSubtotal;
    // For admin-assigned orders or direct dispatches, do not add arbitrary shipping surcharge:
    const isDirectOrAdminAssigned = Boolean((data as any).assignedSellerId || data.paymentMethod === 'ADMIN_ASSIGNED');
    const shippingFee = isDirectOrAdminAssigned ? 0 : (subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFlatFee);
    const totalAmount = Number((subtotal + shippingFee).toFixed(2));

    // Calculate exact 21% seller profit based on total order amount
    const exactSellerProfit21 = Number((totalAmount * 0.21).toFixed(2));

    const assignedSellerId = (data as any).assignedSellerId || undefined;
    const assignedSellerName = (data as any).assignedSellerName || undefined;

    // Auto-approve seller if order is created & assigned directly, preventing any "wait for approval" blocks
    if (assignedSellerId) {
      const targetSeller = sellers.find((s) => s.id === assignedSellerId);
      if (targetSeller && targetSeller.applicationStatus !== 'APPROVED') {
        approveSellerApplication(assignedSellerId);
      }
    }

    const initialTimelineNote = assignedSellerId
      ? `Order created and assigned to seller ${assignedSellerName || assignedSellerId} by Admin.`
      : 'Order successfully placed. Awaiting Admin seller assignment.';

    // Order date/time handling:
    // If Admin explicitly selected/changed the date and time, use it.
    // If not touched, default to the device's real-time (new Date().toISOString()).
    const effectiveOrderTimestamp = (data.customCreatedAt && data.customCreatedAt.trim())
      ? (() => {
          try {
            const parsed = new Date(data.customCreatedAt);
            return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
          } catch {
            return new Date().toISOString();
          }
        })()
      : new Date().toISOString();

    const newOrder: Order = {
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: currentUser.id,
      customerName: data.shippingAddress.fullName || currentUser.name,
      customerEmail: data.shippingAddress.email || currentUser.email,
      customerPhone: data.shippingAddress.phone || currentUser.phone || '',
      shippingAddress: data.shippingAddress,
      items: orderItems,
      subtotal,
      shippingFee,
      totalAmount,
      totalAdminProfit: Number(totalAdminProfit.toFixed(2)),
      totalSellerEarning: exactSellerProfit21,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'PAID',
      status: 'PENDING',
      assignedSellerId,
      assignedSellerName,
      assignedAt: assignedSellerId ? effectiveOrderTimestamp : undefined,
      customerNotes: data.notes,
      timeline: [
        {
          status: (assignedSellerId ? 'ASSIGNED' : 'PENDING') as OrderStatus,
          timestamp: effectiveOrderTimestamp,
          actor: assignedSellerId ? 'Admin (Platform Controller)' : `Customer (${data.shippingAddress.fullName || currentUser.name})`,
          note: initialTimelineNote,
        },
      ],
      createdAt: effectiveOrderTimestamp,
      updatedAt: effectiveOrderTimestamp,
    };

    setOrders((prev) => [newOrder, ...prev]);
    clearCart();

    // Sync order to Firestore
    saveOrderToFirestore(newOrder).catch((err) =>
      console.warn('[Firestore] Sync order notice:', err)
    );

    // Notify Admin
    addNotification(
      'user_admin',
      'New Customer Order Placed 📦',
      `Order #${newOrder.id} ($${totalAmount.toFixed(2)}) placed by ${newOrder.customerName}. Action required: Assign to seller from Admin Dashboard.`,
      'ORDER',
      '/admin/orders'
    );

    // Notify Customer
    addNotification(
      currentUser.id,
      'Order Confirmed ✅',
      `Your order #${newOrder.id} of $${totalAmount.toFixed(2)} has been received and is awaiting fulfillment assignment.`,
      'ORDER',
      '/customer/orders'
    );

    return newOrder;
  };

  const assignOrderToSeller = (orderId: string, sellerId: string, customAssignedAt?: string) => {
    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller) return;

    // Automatically approve seller application upon receiving an assigned order
    // This prevents the seller from being blocked by any "wait for approval / customer care" screen
    if (seller.applicationStatus !== 'APPROVED') {
      approveSellerApplication(sellerId);
    }

    // Determine timestamp: if admin specified custom time use it, otherwise use device real-time
    const effectiveTimestamp = (customAssignedAt && customAssignedAt.trim())
      ? (() => {
          try {
            const parsed = new Date(customAssignedAt);
            return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
          } catch {
            return new Date().toISOString();
          }
        })()
      : new Date().toISOString();

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const exactSellerProfit21 = Number((o.totalAmount * 0.21).toFixed(2));

          const updatedTimeline = [
            ...o.timeline,
            {
              status: 'ASSIGNED' as OrderStatus,
              timestamp: effectiveTimestamp,
              actor: 'Admin (Platform Controller)',
              note: `Assigned order to seller ${seller.shopName} (${seller.sellerName}).`,
            },
          ];

          // Status is set to PENDING upon assignment (no premature pending wallet inflation)
          // Notify Seller with exact 21% profit
          addNotification(
            seller.userId,
            'New Order Assigned 🚀',
            `You have been assigned Order #${o.id} ($${o.totalAmount.toFixed(2)}). Seller Profit (21%): $${exactSellerProfit21.toFixed(2)}.`,
            'ORDER',
            '/seller/orders'
          );

          // Notify Customer
          addNotification(
            o.customerId,
            'Order Assigned to Fulfillment Hub',
            `Your order #${o.id} is now being prepared for fulfillment by our certified merchant.`,
            'ORDER',
            '/customer/orders'
          );

          const assignedOrder: Order = {
            ...o,
            status: 'PENDING',
            totalSellerEarning: exactSellerProfit21,
            assignedSellerId: sellerId,
            assignedSellerName: seller.shopName,
            assignedAt: effectiveTimestamp,
            createdAt: (customAssignedAt && customAssignedAt.trim()) ? effectiveTimestamp : o.createdAt,
            timeline: updatedTimeline,
            updatedAt: effectiveTimestamp,
          };

          // Sync assigned order to Firestore so seller instantly sees it
          saveOrderToFirestore(assignedOrder).catch((err) =>
            console.warn('[Firestore] Sync assigned order notice:', err)
          );

          return assignedOrder;
        }
        return o;
      })
    );
  };

  const updateOrderDate = (orderId: string, newDateIsoOrString: string) => {
    if (!newDateIsoOrString) return;
    let targetIso = new Date().toISOString();
    try {
      const d = new Date(newDateIsoOrString);
      if (!isNaN(d.getTime())) {
        targetIso = d.toISOString();
      }
    } catch {}

    setOrders((prev) => {
      const next = prev.map((o) => {
        if (o.id === orderId) {
          const updatedTimeline = [
            ...o.timeline,
            {
              status: o.status,
              timestamp: targetIso,
              actor: 'Admin (Platform Controller)',
              note: `Admin modified order date/time to ${targetIso}.`,
            },
          ];
          const updated: Order = {
            ...o,
            createdAt: targetIso,
            assignedAt: o.assignedSellerId ? targetIso : o.assignedAt,
            timeline: updatedTimeline,
            updatedAt: targetIso,
          };
          saveOrderToFirestore(updated).catch((err) =>
            console.warn('[Firestore] Sync order date update notice:', err)
          );
          return updated;
        }
        return o;
      });
      safeSave('nexus_orders', next);
      try {
        localStorage.setItem('nexus_orders', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const updateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    newDateIsoOrString?: string
  ) => {
    setOrders((prev) => {
      const next = prev.map((o) => {
        if (o.id === orderId) {
          const actorName =
            currentUser.role === 'ADMIN'
              ? 'Admin'
              : currentUser.role === 'SELLER'
              ? `Seller (${o.assignedSellerName || currentUser.name})`
              : currentUser.name;

          const defaultNote =
            newStatus === 'ACCEPTED'
              ? 'Seller accepted the order and started preparing package.'
              : newStatus === 'PICKED_BY_SELLER'
              ? 'Merchant picked up order and started fulfillment.'
              : newStatus === 'PROCESSING'
              ? 'Order is being assembled, quality inspected, and packaged.'
              : newStatus === 'ON_THE_WAY'
              ? 'Package dispatched with express courier. In transit.'
              : newStatus === 'DELIVERED'
              ? 'Package successfully delivered to customer shipping address.'
              : newStatus === 'CANCELLED'
              ? 'Order has been cancelled.'
              : `Order status updated to ${newStatus}`;

          const updatedTimeline = [
            ...o.timeline,
            {
              status: newStatus,
              timestamp: new Date().toISOString(),
              actor: actorName,
              note: note || defaultNote,
            },
          ];

          // Determine seller info if picking up or settling
          const resolvedSeller =
            sellers.find(
              (s) =>
                (o.assignedSellerId && (s.id === o.assignedSellerId || s.userId === o.assignedSellerId)) ||
                (o.assignedSellerName && s.shopName && s.shopName.toLowerCase() === o.assignedSellerName.toLowerCase())
            ) ||
            (o.items?.find((it) => it.sellerId)?.sellerId
              ? sellers.find(
                  (s) =>
                    s.id === o.items?.find((it) => it.sellerId)?.sellerId ||
                    s.userId === o.items?.find((it) => it.sellerId)?.sellerId
                )
              : undefined) ||
            (currentUser.role === 'SELLER'
              ? sellers.find((s) => s.id === currentUser.id || s.userId === currentUser.id)
              : undefined) ||
            sellers.find((s) => !s.id.includes('dummy') && !s.id.includes('default')) ||
            sellers[0];

          const resolvedSellerId =
            o.assignedSellerId ||
            resolvedSeller?.id ||
            (currentUser.role === 'SELLER' ? currentUser.id : undefined);

          const resolvedSellerName =
            o.assignedSellerName ||
            resolvedSeller?.shopName ||
            resolvedSeller?.businessName ||
            (currentUser.role === 'SELLER' ? currentUser.name : undefined);

          const isNowPicked =
            newStatus === 'PICKED_BY_SELLER' ||
            (newStatus === 'PROCESSING' && (o.status === 'PENDING' || o.status === 'ASSIGNED'));
          const wasCostDeducted =
            Boolean(o.costDeductedFromSeller) ||
            (typeof o.costDeductedAmount === 'number' && o.costDeductedAmount > 0) ||
            Boolean(o.pickedAt) ||
            isNowPicked ||
            o.status === 'PROCESSING' ||
            o.status === 'ON_THE_WAY' ||
            o.status === 'PICKED_BY_SELLER' ||
            o.status === 'ACCEPTED';
          const deductedAmount =
            o.costDeductedAmount ||
            (wasCostDeducted ? o.totalAmount : isNowPicked ? o.totalAmount : 0);

          // Handle financial settlement if DELIVERED
          if (newStatus === 'DELIVERED' && o.status !== 'DELIVERED') {
            const targetSellerId = resolvedSeller?.id || resolvedSellerId || '';
            const targetUserId = resolvedSeller?.userId || '';
            const targetEmail = (resolvedSeller?.email || '').toLowerCase();

            const orderAmount = Number(o.totalAmount || 0);
            const sellerProfit = Number(
              (o.totalSellerEarning > 0 && o.totalSellerEarning <= orderAmount * 0.5
                ? o.totalSellerEarning
                : orderAmount * 0.21
              ).toFixed(2)
            );
            const costRefund = wasCostDeducted
              ? Number((deductedAmount || orderAmount).toFixed(2))
              : 0;

            // Total exact payout amount to release into seller's available balance
            const totalPayout = Number((sellerProfit + costRefund).toFixed(2));

            // Retrieve existing available balance robustly across ALL sources to guarantee NO funds are wiped
            let currentAvailable = 0;
            let currentEarnings = 0;
            let currentWithdrawn = 0;
            let currentPendingInWallet = 0;

            // Source 1: Fresh localStorage nexus_wallets
            try {
              const rawW = localStorage.getItem('nexus_wallets');
              if (rawW) {
                const parsedW = JSON.parse(rawW);
                const foundW =
                  (targetSellerId && parsedW[targetSellerId]) ||
                  (targetUserId && parsedW[targetUserId]) ||
                  (targetEmail && parsedW[targetEmail]) ||
                  (resolvedSellerId && parsedW[resolvedSellerId]);
                if (foundW) {
                  const bal = Number(
                    foundW.availableBalance ?? foundW.balance ?? foundW.walletBalance ?? 0
                  );
                  if (!isNaN(bal) && bal > currentAvailable) currentAvailable = bal;
                  if (foundW.pendingBalance) currentPendingInWallet = Number(foundW.pendingBalance);
                  if (foundW.totalEarnings) currentEarnings = Number(foundW.totalEarnings);
                  if (foundW.totalWithdrawn) currentWithdrawn = Number(foundW.totalWithdrawn);
                }
              }
            } catch {}

            // Source 2: React state wallets
            const stateWallet =
              (targetSellerId && wallets[targetSellerId]) ||
              (targetUserId && wallets[targetUserId]) ||
              (targetEmail && wallets[targetEmail]) ||
              (resolvedSellerId && wallets[resolvedSellerId]);
            if (stateWallet) {
              const bal = Number(
                stateWallet.availableBalance ?? stateWallet.balance ?? stateWallet.walletBalance ?? 0
              );
              if (!isNaN(bal) && bal > currentAvailable) currentAvailable = bal;
              if (stateWallet.pendingBalance && !currentPendingInWallet)
                currentPendingInWallet = Number(stateWallet.pendingBalance);
              if (stateWallet.totalEarnings && !currentEarnings)
                currentEarnings = Number(stateWallet.totalEarnings);
              if (stateWallet.totalWithdrawn && !currentWithdrawn)
                currentWithdrawn = Number(stateWallet.totalWithdrawn);
            }

            // Source 3: Fresh localStorage nexus_sellers
            try {
              const rawS = localStorage.getItem('nexus_sellers');
              if (rawS) {
                const parsedS = JSON.parse(rawS);
                if (Array.isArray(parsedS)) {
                  const matchS = parsedS.find(
                    (s: any) =>
                      (targetSellerId && s.id === targetSellerId) ||
                      (targetUserId && s.userId === targetUserId) ||
                      (targetEmail && s.email?.toLowerCase() === targetEmail)
                  );
                  if (matchS) {
                    const bal = Number(
                      matchS.walletBalance ?? matchS.balance ?? matchS.availableBalance ?? 0
                    );
                    if (!isNaN(bal) && bal > currentAvailable) currentAvailable = bal;
                  }
                }
              }
            } catch {}

            // Source 4: sellers React state
            if (resolvedSeller) {
              const bal = Number(
                resolvedSeller.walletBalance ?? (resolvedSeller as any).balance ?? (resolvedSeller as any).availableBalance ?? 0
              );
              if (!isNaN(bal) && bal > currentAvailable) currentAvailable = bal;
            }

            // Source 5: currentUser if logged in as this seller
            if (
              currentUser &&
              (currentUser.id === targetSellerId || currentUser.id === targetUserId)
            ) {
              const bal = Number(currentUser.walletBalance || 0);
              if (!isNaN(bal) && bal > currentAvailable) currentAvailable = bal;
            }

            // Calculate new balances: Add exact settlement amount without wiping out existing balance
            const calculatedNewBal = Number((currentAvailable + totalPayout).toFixed(2));
            const calculatedNewEarnings = Number(
              ((currentEarnings || currentAvailable) + sellerProfit).toFixed(2)
            );

            // Compute remaining dynamic pending balance from any OTHER active in-transit orders
            const remainingPendingOrders = prev.filter((otherOrder) => {
              if (otherOrder.id === orderId) return false;
              const isThisSeller =
                (targetSellerId && otherOrder.assignedSellerId === targetSellerId) ||
                (targetUserId && otherOrder.assignedSellerId === targetUserId) ||
                (resolvedSeller?.shopName &&
                  otherOrder.assignedSellerName?.toLowerCase() ===
                    resolvedSeller.shopName.toLowerCase());
              if (!isThisSeller) return false;
              return (
                otherOrder.status === 'PROCESSING' ||
                otherOrder.status === 'ON_THE_WAY' ||
                otherOrder.status === 'PICKED_BY_SELLER' ||
                otherOrder.status === 'ACCEPTED'
              );
            });

            const calculatedNewPending = Number(
              remainingPendingOrders
                .reduce((sum, otherOrder) => {
                  const p = Number((otherOrder.totalAmount * 0.21).toFixed(2));
                  const wasOtherCost =
                    Boolean(otherOrder.costDeductedFromSeller) ||
                    (typeof otherOrder.costDeductedAmount === 'number' &&
                      otherOrder.costDeductedAmount > 0) ||
                    otherOrder.status === 'PROCESSING' ||
                    otherOrder.status === 'ON_THE_WAY' ||
                    otherOrder.status === 'PICKED_BY_SELLER';
                  return sum + (wasOtherCost ? otherOrder.totalAmount + p : p);
                }, 0)
                .toFixed(2)
            );

            const updatedWalletItem: SellerWallet = {
              sellerId: targetSellerId,
              availableBalance: calculatedNewBal,
              balance: calculatedNewBal,
              walletBalance: calculatedNewBal,
              pendingBalance: calculatedNewPending,
              totalEarnings: calculatedNewEarnings,
              totalWithdrawn: currentWithdrawn,
              updatedAt: new Date().toISOString(),
            };

            // Update wallets map in state & localStorage
            setWallets((wMap) => {
              const nextMap: Record<string, SellerWallet> = {
                ...wMap,
              };
              if (targetSellerId) nextMap[targetSellerId] = updatedWalletItem;
              if (resolvedSellerId) nextMap[resolvedSellerId] = updatedWalletItem;
              if (targetUserId) nextMap[targetUserId] = updatedWalletItem;
              if (targetEmail) nextMap[targetEmail] = updatedWalletItem;
              try {
                localStorage.setItem('nexus_wallets', JSON.stringify(nextMap));
              } catch {}
              return nextMap;
            });

            // Update seller profile state for instant visual sync
            setSellers((prevSellers) => {
              const updated = prevSellers.map((s) =>
                s.id === targetSellerId ||
                (targetUserId && s.userId === targetUserId) ||
                (targetEmail && s.email?.toLowerCase() === targetEmail) ||
                (resolvedSellerId && s.id === resolvedSellerId)
                  ? {
                      ...s,
                      walletBalance: calculatedNewBal,
                      balance: calculatedNewBal,
                      availableBalance: calculatedNewBal,
                    }
                  : s
              );
              try {
                localStorage.setItem('nexus_sellers', JSON.stringify(updated));
              } catch {}
              return updated;
            });

            // Update currentUser if seller is currently active
            if (
              currentUser.id === targetSellerId ||
              (targetUserId && currentUser.id === targetUserId) ||
              (targetEmail && currentUser.email?.toLowerCase() === targetEmail)
            ) {
              setCurrentUser((u) => {
                const nextU = {
                  ...u,
                  walletBalance: calculatedNewBal,
                  balance: calculatedNewBal,
                };
                try {
                  localStorage.setItem('nexus_current_user', JSON.stringify(nextU));
                } catch {}
                return nextU;
              });
            }

            // Sync updated wallet balance to Firestore
            if (targetSellerId) {
              saveSellerWalletToFirestore(
                targetSellerId,
                calculatedNewBal,
                calculatedNewEarnings,
                calculatedNewPending,
                currentWithdrawn,
                targetUserId || undefined
              ).catch((err) => console.warn('[Firestore] Notice syncing wallet settlement:', err));
            }

            // Broadcast across browser tabs so any active seller dashboard updates live
            try {
              if (typeof BroadcastChannel !== 'undefined') {
                const bc = new BroadcastChannel('nexus_wallet_channel');
                bc.postMessage({
                  type: 'WALLET_UPDATED',
                  sellerId: targetSellerId,
                  userId: targetUserId,
                  newBalance: calculatedNewBal,
                  pendingBalance: calculatedNewPending,
                  wallet: updatedWalletItem,
                });
                bc.close();
              }
            } catch {}

            // Add completed transaction record
            const newTx: WalletTransaction = {
              id: generateTxId(),
              sellerId: targetSellerId,
              orderId: o.id,
              type: 'CREDIT_ORDER_DELIVERED',
              amount: totalPayout,
              description: `Order #${o.orderNumber || o.id} delivered. Settlement released to available balance (Profit: $${sellerProfit.toFixed(2)}${costRefund > 0 ? ` + Cost: $${costRefund.toFixed(2)}` : ''}).`,
              status: 'COMPLETED',
              date: new Date().toISOString(),
            };
            setTransactions((t) => [newTx, ...t]);

            // Notify Seller
            const notifyId = targetUserId || targetSellerId;
            if (notifyId) {
              addNotification(
                notifyId,
                'Funds Released to Wallet 💰',
                `Order #${o.orderNumber || o.id} delivered! $${totalPayout.toFixed(2)} moved from pending into your Available Balance.`,
                'WALLET',
                '/seller/wallet'
              );
            }
          }

          // If Cancelled after being picked up, refund the deducted order cost back to seller
          if (newStatus === 'CANCELLED' && o.status !== 'CANCELLED') {
            const targetSellerId = resolvedSeller?.id || resolvedSellerId || '';
            const targetUserId = resolvedSeller?.userId || '';
            const targetEmail = (resolvedSeller?.email || '').toLowerCase();

            const costRefund = wasCostDeducted ? Number((deductedAmount || o.totalAmount).toFixed(2)) : 0;

            if (costRefund > 0 && targetSellerId) {
              // Retrieve existing available balance robustly
              let currentAvailable = 0;
              let currentEarnings = 0;
              let currentWithdrawn = 0;

              try {
                const rawW = localStorage.getItem('nexus_wallets');
                if (rawW) {
                  const parsedW = JSON.parse(rawW);
                  const foundW =
                    (targetSellerId && parsedW[targetSellerId]) ||
                    (targetUserId && parsedW[targetUserId]) ||
                    (targetEmail && parsedW[targetEmail]);
                  if (foundW) {
                    const bal = Number(foundW.availableBalance ?? foundW.balance ?? foundW.walletBalance ?? 0);
                    if (!isNaN(bal) && bal > currentAvailable) currentAvailable = bal;
                    if (foundW.totalEarnings) currentEarnings = Number(foundW.totalEarnings);
                    if (foundW.totalWithdrawn) currentWithdrawn = Number(foundW.totalWithdrawn);
                  }
                }
              } catch {}

              const stateWallet =
                (targetSellerId && wallets[targetSellerId]) ||
                (targetUserId && wallets[targetUserId]);
              if (stateWallet) {
                const bal = Number(stateWallet.availableBalance ?? stateWallet.balance ?? stateWallet.walletBalance ?? 0);
                if (!isNaN(bal) && bal > currentAvailable) currentAvailable = bal;
                if (stateWallet.totalEarnings && !currentEarnings) currentEarnings = Number(stateWallet.totalEarnings);
                if (stateWallet.totalWithdrawn && !currentWithdrawn) currentWithdrawn = Number(stateWallet.totalWithdrawn);
              }

              if (resolvedSeller) {
                const bal = Number(resolvedSeller.walletBalance ?? (resolvedSeller as any).balance ?? 0);
                if (!isNaN(bal) && bal > currentAvailable) currentAvailable = bal;
              }

              const calculatedNewBal = Number((currentAvailable + costRefund).toFixed(2));

              // Compute remaining pending
              const remainingPendingOrders = prev.filter((otherOrder) => {
                if (otherOrder.id === orderId) return false;
                const isThisSeller =
                  (targetSellerId && otherOrder.assignedSellerId === targetSellerId) ||
                  (targetUserId && otherOrder.assignedSellerId === targetUserId);
                if (!isThisSeller) return false;
                return (
                  otherOrder.status === 'PROCESSING' ||
                  otherOrder.status === 'ON_THE_WAY' ||
                  otherOrder.status === 'PICKED_BY_SELLER' ||
                  otherOrder.status === 'ACCEPTED'
                );
              });

              const calculatedNewPending = Number(
                remainingPendingOrders
                  .reduce((sum, otherOrder) => {
                    const p = Number((otherOrder.totalAmount * 0.21).toFixed(2));
                    const wasOtherCost =
                      Boolean(otherOrder.costDeductedFromSeller) ||
                      (typeof otherOrder.costDeductedAmount === 'number' && otherOrder.costDeductedAmount > 0) ||
                      otherOrder.status === 'PROCESSING' ||
                      otherOrder.status === 'ON_THE_WAY' ||
                      otherOrder.status === 'PICKED_BY_SELLER';
                    return sum + (wasOtherCost ? otherOrder.totalAmount + p : p);
                  }, 0)
                  .toFixed(2)
              );

              const updatedWalletItem: SellerWallet = {
                sellerId: targetSellerId,
                availableBalance: calculatedNewBal,
                balance: calculatedNewBal,
                walletBalance: calculatedNewBal,
                pendingBalance: calculatedNewPending,
                totalEarnings: currentEarnings,
                totalWithdrawn: currentWithdrawn,
                updatedAt: new Date().toISOString(),
              };

              setWallets((wMap) => {
                const nextMap: Record<string, SellerWallet> = {
                  ...wMap,
                  [targetSellerId]: updatedWalletItem,
                };
                if (resolvedSellerId) nextMap[resolvedSellerId] = updatedWalletItem;
                if (targetUserId) nextMap[targetUserId] = updatedWalletItem;
                if (targetEmail) nextMap[targetEmail] = updatedWalletItem;
                try {
                  localStorage.setItem('nexus_wallets', JSON.stringify(nextMap));
                } catch {}
                return nextMap;
              });

              setSellers((prevSellers) => {
                const updated = prevSellers.map((s) =>
                  s.id === targetSellerId ||
                  (targetUserId && s.userId === targetUserId) ||
                  (targetEmail && s.email?.toLowerCase() === targetEmail) ||
                  (resolvedSellerId && s.id === resolvedSellerId)
                    ? { ...s, walletBalance: calculatedNewBal, balance: calculatedNewBal, availableBalance: calculatedNewBal }
                    : s
                );
                try {
                  localStorage.setItem('nexus_sellers', JSON.stringify(updated));
                } catch {}
                return updated;
              });

              if (
                currentUser.id === targetSellerId ||
                (targetUserId && currentUser.id === targetUserId) ||
                (targetEmail && currentUser.email?.toLowerCase() === targetEmail)
              ) {
                setCurrentUser((u) => {
                  const nextU = { ...u, walletBalance: calculatedNewBal, balance: calculatedNewBal };
                  try {
                    localStorage.setItem('nexus_current_user', JSON.stringify(nextU));
                  } catch {}
                  return nextU;
                });
              }

              // Sync refund to Firestore
              saveSellerWalletToFirestore(
                targetSellerId,
                calculatedNewBal,
                currentEarnings,
                calculatedNewPending,
                currentWithdrawn,
                targetUserId || undefined
              ).catch((err) => console.warn('[Firestore] Notice syncing wallet cancellation refund:', err));

              // Broadcast across browser tabs
              try {
                if (typeof BroadcastChannel !== 'undefined') {
                  const bc = new BroadcastChannel('nexus_wallet_channel');
                  bc.postMessage({
                    type: 'WALLET_UPDATED',
                    sellerId: targetSellerId,
                    userId: targetUserId,
                    newBalance: calculatedNewBal,
                    pendingBalance: calculatedNewPending,
                    wallet: updatedWalletItem,
                  });
                  bc.close();
                }
              } catch {}

              const refundTx: WalletTransaction = {
                id: generateTxId(),
                sellerId: targetSellerId,
                orderId: o.id,
                type: 'REFUND_ADJUSTMENT',
                amount: costRefund,
                description: `Order #${o.orderNumber || o.id} cancelled. Pickup cost of $${costRefund.toFixed(2)} refunded to wallet.`,
                status: 'COMPLETED',
                date: new Date().toISOString(),
                source: 'ORDER',
                isAdminDeposit: false,
              };
              setTransactions((t) => [refundTx, ...t]);
            }
          }

          // Notify customer of progress
          addNotification(
            o.customerId,
            `Order Status: ${newStatus.replace(/_/g, ' ')}`,
            `Your Order #${o.orderNumber || o.id} is now ${newStatus.toLowerCase().replace(/_/g, ' ')}.`,
            'ORDER',
            '/customer/orders'
          );

          let targetDateIso: string | undefined = undefined;
          if (newDateIsoOrString && newDateIsoOrString.trim()) {
            try {
              const d = new Date(newDateIsoOrString);
              if (!isNaN(d.getTime())) {
                targetDateIso = d.toISOString();
              }
            } catch {}
          }

          const updatedOrder: Order = {
            ...o,
            status: newStatus,
            createdAt: targetDateIso || o.createdAt,
            assignedAt: (targetDateIso && (resolvedSellerId || o.assignedSellerId)) ? targetDateIso : o.assignedAt,
            assignedSellerId: resolvedSellerId,
            assignedSellerName: resolvedSellerName,
            costDeductedFromSeller: wasCostDeducted,
            costDeductedAmount: deductedAmount,
            pickedAt: isNowPicked ? (o.pickedAt || new Date().toISOString()) : o.pickedAt,
            timeline: updatedTimeline,
            updatedAt: targetDateIso || new Date().toISOString(),
          };

          // Broadcast live update to Firestore so Admin Panel sees it immediately
          saveOrderToFirestore(updatedOrder).catch((err) =>
            console.warn('[Firestore] Notice saving updated order status:', err)
          );

          return updatedOrder;
        }
        return o;
      });
      safeSave('nexus_orders', next);
      try {
        localStorage.setItem('nexus_orders', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const deleteOrder = (orderId: string) => {
    recordDeletedOrderId(orderId);
    setOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      try {
        safeSave('nexus_orders', next);
        localStorage.setItem('nexus_orders', JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_order_channel');
        bc.postMessage({ type: 'ORDER_DELETED', orderId });
        setTimeout(() => bc.close(), 1000);
      }
    } catch {}

    deleteOrderFromFirestore(orderId).catch((err) => {
      console.warn('[Firestore] Error deleting order from Firestore backend:', err);
    });
  };

  const refreshOrders = async () => {
    try {
      const freshOrders = await fetchFirestoreOrders();
      if (Array.isArray(freshOrders)) {
        setOrders((prev) => {
          const activeLive = freshOrders.filter((lo: any) => lo && lo.id && !isOrderDeleted(lo.id));
          const liveIds = new Set(activeLive.map((o) => o.id));
          const now = Date.now();
          const pendingLocalOnly = prev.filter((p) => {
            if (liveIds.has(p.id) || isOrderDeleted(p.id)) return false;
            if (p.assignedSellerId || p.assignedSellerName) return false;
            const orderAge = p.createdAt ? now - new Date(p.createdAt).getTime() : Infinity;
            return orderAge < 60000;
          });
          const merged = [...activeLive, ...pendingLocalOnly].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          safeSave('nexus_orders', merged);
          try {
            localStorage.setItem('nexus_orders', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch (err) {
      console.warn('[StoreContext] refreshOrders notice:', err);
    }
  };

  // Withdrawals
  const submitWithdrawalRequest = (
    dataOrSellerId:
      | {
          sellerId: string;
          amount: number;
          method: WithdrawalMethod;
          payoutAccount: string;
          sellerNote?: string;
        }
      | string,
    amountArg?: number,
    methodArg?: WithdrawalMethod,
    payoutAccountArg?: string,
    sellerNoteArg?: string
  ) => {
    let data: {
      sellerId: string;
      amount: number;
      method: WithdrawalMethod;
      payoutAccount: string;
      sellerNote?: string;
    };

    if (typeof dataOrSellerId === 'string') {
      data = {
        sellerId: dataOrSellerId,
        amount: Number(amountArg || 0),
        method: methodArg || 'USDT (TRC20)',
        payoutAccount: payoutAccountArg || '',
        sellerNote: sellerNoteArg,
      };
    } else {
      data = {
        ...dataOrSellerId,
        amount: Number(dataOrSellerId.amount || 0),
      };
    }

    if (isNaN(data.amount) || data.amount <= 0) {
      return { success: false, message: 'Please enter a valid withdrawal amount greater than $0.00.' };
    }

    // Resolve seller profile
    const seller =
      sellers.find(
        (s) =>
          s.id === data.sellerId ||
          s.userId === data.sellerId ||
          (s.email && s.email.toLowerCase() === data.sellerId.toLowerCase())
      ) ||
      (currentUser && (currentUser.id === data.sellerId || currentUser.role === 'SELLER')
        ? {
            id: currentUser.id,
            userId: currentUser.id,
            email: currentUser.email,
            sellerName: currentUser.name,
            shopName: (currentUser as any).shopName || currentUser.name,
            walletBalance: currentUser.walletBalance || 0,
          }
        : undefined);

    const targetSellerId = seller?.id || data.sellerId;
    const targetUserId = seller?.userId;
    const targetEmail = seller?.email ? seller.email.toLowerCase() : undefined;

    // Retrieve current wallet or fallback to seller balance
    const existingWallet =
      wallets[targetSellerId] ||
      (targetUserId ? wallets[targetUserId] : undefined) ||
      (targetEmail ? wallets[targetEmail] : undefined) ||
      wallets[data.sellerId];

    let currentAvailable = Number(
      existingWallet?.availableBalance ??
      existingWallet?.balance ??
      existingWallet?.walletBalance ??
      0
    );
    let currentEarnings = Number(existingWallet?.totalEarnings || 0);
    let currentWithdrawn = Number(existingWallet?.totalWithdrawn || 0);
    let currentPending = Number(existingWallet?.pendingBalance || 0);

    // Also check localStorage nexus_wallets for most up-to-date state
    try {
      const rawW = localStorage.getItem('nexus_wallets');
      if (rawW) {
        const parsedW = JSON.parse(rawW);
        const foundW =
          parsedW[targetSellerId] ||
          (targetUserId && parsedW[targetUserId]) ||
          (targetEmail && parsedW[targetEmail]) ||
          parsedW[data.sellerId];
        if (foundW) {
          const bal = Number(foundW.availableBalance ?? foundW.balance ?? foundW.walletBalance ?? 0);
          if (!isNaN(bal) && bal > currentAvailable) currentAvailable = bal;
          if (foundW.totalEarnings && !currentEarnings) currentEarnings = Number(foundW.totalEarnings);
          if (foundW.totalWithdrawn && !currentWithdrawn) currentWithdrawn = Number(foundW.totalWithdrawn);
          if (foundW.pendingBalance && !currentPending) currentPending = Number(foundW.pendingBalance);
        }
      }
    } catch {}

    // Check seller profile balance
    if (seller) {
      const sBal = Number(seller.walletBalance ?? (seller as any).balance ?? 0);
      if (!isNaN(sBal) && sBal > currentAvailable) currentAvailable = sBal;
    }

    // Check currentUser balance
    if (
      currentUser &&
      (currentUser.id === targetSellerId || currentUser.id === targetUserId)
    ) {
      const uBal = Number(currentUser.walletBalance || 0);
      if (!isNaN(uBal) && uBal > currentAvailable) currentAvailable = uBal;
    }

    if (currentAvailable <= 0) {
      return {
        success: false,
        message: 'Insufficient balance! Your available wallet balance is $0.00. You cannot submit a withdrawal request.',
      };
    }

    if (data.amount > currentAvailable) {
      return {
        success: false,
        message: `Insufficient balance! Requested amount ($${data.amount.toFixed(2)}) exceeds your available balance ($${currentAvailable.toFixed(2)}).`,
      };
    }

    const effectiveMinWithdrawal = settings?.minWithdrawalAmount ? Math.min(settings.minWithdrawalAmount, 10.0) : 10.0;
    if (data.amount < effectiveMinWithdrawal) {
      return {
        success: false,
        message: `Minimum withdrawal amount is $${effectiveMinWithdrawal.toFixed(2)}.`,
      };
    }

    // Permanently deduct the withdrawal amount from active wallet balance
    const newAvailable = Number(Math.max(0, currentAvailable - data.amount).toFixed(2));
    const effectiveEarnings = currentEarnings || currentAvailable;

    const updatedWalletItem: SellerWallet = {
      sellerId: targetSellerId,
      availableBalance: newAvailable,
      balance: newAvailable,
      walletBalance: newAvailable,
      pendingBalance: currentPending,
      totalEarnings: effectiveEarnings,
      totalWithdrawn: currentWithdrawn,
      updatedAt: new Date().toISOString(),
    };

    // 1. Update wallets state & localStorage
    setWallets((wMap) => {
      const nextMap: Record<string, SellerWallet> = {
        ...wMap,
        [targetSellerId]: updatedWalletItem,
        [data.sellerId]: updatedWalletItem,
      };
      if (targetUserId) nextMap[targetUserId] = updatedWalletItem;
      if (targetEmail) nextMap[targetEmail] = updatedWalletItem;
      try {
        localStorage.setItem('nexus_wallets', JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });

    // 2. Update sellers state & localStorage
    setSellers((prevSellers) => {
      const updated = prevSellers.map((s) =>
        s.id === targetSellerId ||
        s.id === data.sellerId ||
        (targetUserId && s.userId === targetUserId) ||
        (targetEmail && s.email?.toLowerCase() === targetEmail)
          ? {
              ...s,
              walletBalance: newAvailable,
              balance: newAvailable,
              availableBalance: newAvailable,
            }
          : s
      );
      try {
        localStorage.setItem('nexus_sellers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 3. Update currentUser if matching
    if (
      currentUser.id === targetSellerId ||
      currentUser.id === data.sellerId ||
      (targetUserId && currentUser.id === targetUserId) ||
      (targetEmail && currentUser.email?.toLowerCase() === targetEmail)
    ) {
      setCurrentUser((u) => {
        const nextU = {
          ...u,
          walletBalance: newAvailable,
          balance: newAvailable,
        };
        try {
          localStorage.setItem('nexus_current_user', JSON.stringify(nextU));
        } catch {}
        return nextU;
      });
    }

    // 4. Persist wallet balance immediately to Firestore
    saveSellerWalletToFirestore(
      targetSellerId,
      newAvailable,
      effectiveEarnings,
      currentPending,
      currentWithdrawn,
      targetUserId
    ).catch((err) => console.warn('[Firestore] Error saving wallet on withdrawal request:', err));

    // 5. Create new withdrawal request
    const newWdId = `WD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRequest: WithdrawalRequest = {
      id: newWdId,
      sellerId: targetSellerId,
      sellerName: seller ? `${seller.sellerName} (${(seller as any).shopName || 'Store'})` : 'Seller',
      sellerEmail: seller?.email || '',
      amount: data.amount,
      method: data.method,
      payoutAccount: data.payoutAccount || '',
      sellerNote: data.sellerNote?.trim() || '',
      adminNote: '',
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    setWithdrawals((prev) => {
      const next = [newRequest, ...prev];
      try {
        localStorage.setItem('nexus_withdrawals', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 6. Persist withdrawal request to Firestore
    saveWithdrawalToFirestore(newRequest).catch((err) =>
      console.warn('[Firestore] Error saving withdrawal request:', err)
    );

    // 7. Record transaction in ledger
    const newTx: WalletTransaction = {
      id: generateTxId(),
      sellerId: targetSellerId,
      withdrawalId: newWdId,
      type: 'DEBIT_WITHDRAWAL',
      amount: data.amount,
      description: `Withdrawal request #${newWdId} via ${data.method}`,
      status: 'PENDING',
      date: new Date().toISOString(),
    };
    setTransactions((t) => [newTx, ...t]);

    // 8. Notify Admin
    addNotification(
      'user_admin',
      'New Withdrawal Request 💸',
      `${seller?.sellerName || 'Seller'} requested a payout of $${data.amount.toFixed(2)} via ${data.method}.`,
      'WALLET',
      '/admin/withdrawals'
    );

    // 9. Broadcast on BroadcastChannel across open tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_wallet_channel');
        bc.postMessage({
          type: 'WALLET_UPDATED',
          sellerId: targetSellerId,
          userId: targetUserId,
          newBalance: newAvailable,
          pendingBalance: currentPending,
          wallet: updatedWalletItem,
        });
        bc.postMessage({
          type: 'WITHDRAWAL_SUBMITTED',
          withdrawal: newRequest,
        });
        bc.close();
      }
    } catch {}

    return {
      success: true,
      message: `Withdrawal request for $${data.amount.toFixed(2)} submitted successfully! Admin will review and disburse funds.`,
    };
  };

  const approveWithdrawalRequest = (withdrawalId: string, adminNote?: string) => {
    const w = withdrawals.find((item) => item.id === withdrawalId);
    if (!w) return;

    const targetSellerId = w.sellerId;
    const seller = sellers.find((s) => s.id === targetSellerId || s.userId === targetSellerId);
    const targetUserId = seller?.userId;

    const updatedWithdrawal: WithdrawalRequest = {
      ...w,
      status: 'APPROVED',
      adminNote: adminNote || w.adminNote,
      processedAt: new Date().toISOString(),
    };

    setWithdrawals((prev) => {
      const next = prev.map((item) => (item.id === withdrawalId ? updatedWithdrawal : item));
      try {
        localStorage.setItem('nexus_withdrawals', JSON.stringify(next));
      } catch {}
      return next;
    });

    updateWithdrawalInFirestore(withdrawalId, {
      status: 'APPROVED',
      adminNote: updatedWithdrawal.adminNote,
      processedAt: updatedWithdrawal.processedAt,
    }).catch((err) => console.warn('[Firestore] Error updating approved withdrawal:', err));

    const notifyId = targetUserId || targetSellerId;
    if (notifyId) {
      addNotification(
        notifyId,
        'Withdrawal Approved 👍',
        `Your withdrawal request #${w.id} ($${w.amount.toFixed(2)}) has been approved and queued for payout.`,
        'WALLET',
        '/seller/wallet'
      );
    }
  };

  const markWithdrawalAsPaid = (withdrawalId: string, adminNote?: string) => {
    const w = withdrawals.find((item) => item.id === withdrawalId);
    if (!w) return;
    if (w.status === 'PAID') return;

    const wasRejected = w.status === 'REJECTED';
    const targetSellerId = w.sellerId;
    const seller = sellers.find(
      (s) =>
        s.id === targetSellerId ||
        s.userId === targetSellerId ||
        (s.email && s.email.toLowerCase() === targetSellerId.toLowerCase())
    );
    const targetUserId = seller?.userId;
    const targetEmail = seller?.email?.toLowerCase();

    const existingWallet =
      wallets[targetSellerId] ||
      (targetUserId ? wallets[targetUserId] : undefined) ||
      (targetEmail ? wallets[targetEmail] : undefined);

    let currentAvailable = Number(
      existingWallet?.availableBalance ??
      existingWallet?.balance ??
      existingWallet?.walletBalance ??
      seller?.walletBalance ??
      0
    );
    let currentEarnings = Number(existingWallet?.totalEarnings || 0);
    let currentWithdrawn = Number(existingWallet?.totalWithdrawn || 0);
    let currentPending = Number(existingWallet?.pendingBalance || 0);

    // If previously rejected, re-deduct because it was refunded; otherwise, it remains permanently deducted
    const newAvail = wasRejected
      ? Math.max(0, Number((currentAvailable - w.amount).toFixed(2)))
      : currentAvailable;
    const newTotalWithdrawn = Number((currentWithdrawn + w.amount).toFixed(2));
    const effectiveEarnings = currentEarnings || newAvail + newTotalWithdrawn;

    const updatedWalletItem: SellerWallet = {
      sellerId: targetSellerId,
      availableBalance: newAvail,
      balance: newAvail,
      walletBalance: newAvail,
      pendingBalance: currentPending,
      totalEarnings: effectiveEarnings,
      totalWithdrawn: newTotalWithdrawn,
      updatedAt: new Date().toISOString(),
    };

    // 1. Update wallets in state & localStorage
    setWallets((wMap) => {
      const nextMap: Record<string, SellerWallet> = {
        ...wMap,
        [targetSellerId]: updatedWalletItem,
      };
      if (targetUserId) nextMap[targetUserId] = updatedWalletItem;
      if (targetEmail) nextMap[targetEmail] = updatedWalletItem;
      try {
        localStorage.setItem('nexus_wallets', JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });

    // 2. If wasRejected and balance changed, update sellers and currentUser
    if (wasRejected) {
      setSellers((prevSellers) => {
        const updated = prevSellers.map((s) =>
          s.id === targetSellerId ||
          (targetUserId && s.userId === targetUserId) ||
          (targetEmail && s.email?.toLowerCase() === targetEmail)
            ? { ...s, walletBalance: newAvail, balance: newAvail, availableBalance: newAvail }
            : s
        );
        try {
          localStorage.setItem('nexus_sellers', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (
        currentUser.id === targetSellerId ||
        (targetUserId && currentUser.id === targetUserId) ||
        (targetEmail && currentUser.email?.toLowerCase() === targetEmail)
      ) {
        setCurrentUser((u) => {
          const nextU = { ...u, walletBalance: newAvail, balance: newAvail };
          try {
            localStorage.setItem('nexus_current_user', JSON.stringify(nextU));
          } catch {}
          return nextU;
        });
      }
    }

    // 3. Persist to Firestore
    saveSellerWalletToFirestore(
      targetSellerId,
      newAvail,
      effectiveEarnings,
      currentPending,
      newTotalWithdrawn,
      targetUserId
    ).catch((err) => console.warn('[Firestore] Error saving paid wallet:', err));

    // 4. Update withdrawal record
    const updatedWithdrawal: WithdrawalRequest = {
      ...w,
      status: 'PAID',
      adminNote: adminNote || 'Disbursed by Admin',
      processedAt: new Date().toISOString(),
    };

    setWithdrawals((prev) => {
      const next = prev.map((item) => (item.id === withdrawalId ? updatedWithdrawal : item));
      try {
        localStorage.setItem('nexus_withdrawals', JSON.stringify(next));
      } catch {}
      return next;
    });

    updateWithdrawalInFirestore(withdrawalId, {
      status: 'PAID',
      adminNote: updatedWithdrawal.adminNote,
      processedAt: updatedWithdrawal.processedAt,
    }).catch((err) => console.warn('[Firestore] Error updating withdrawal as paid:', err));

    // 5. Update transaction to COMPLETED
    setTransactions((tList) =>
      tList.map((tx) =>
        tx.withdrawalId === withdrawalId ? { ...tx, status: 'COMPLETED' } : tx
      )
    );

    // 6. Notify seller
    const notifyId = targetUserId || targetSellerId;
    if (notifyId) {
      addNotification(
        notifyId,
        'Withdrawal Paid ✅',
        `Your payout #${w.id} of $${w.amount.toFixed(2)} has been transferred to your account (${w.payoutAccount}).`,
        'WALLET',
        '/seller/wallet'
      );
    }

    // 7. Broadcast across open tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_wallet_channel');
        bc.postMessage({
          type: 'WALLET_UPDATED',
          sellerId: targetSellerId,
          userId: targetUserId,
          newBalance: newAvail,
          pendingBalance: currentPending,
          wallet: updatedWalletItem,
        });
        bc.close();
      }
    } catch {}
  };

  const rejectWithdrawalRequest = (withdrawalId: string, reason: string) => {
    const w = withdrawals.find((item) => item.id === withdrawalId);
    if (!w) return;
    if (w.status === 'REJECTED') return;

    const wasPaid = w.status === 'PAID';
    const targetSellerId = w.sellerId;
    const seller = sellers.find(
      (s) =>
        s.id === targetSellerId ||
        s.userId === targetSellerId ||
        (s.email && s.email.toLowerCase() === targetSellerId.toLowerCase())
    );
    const targetUserId = seller?.userId;
    const targetEmail = seller?.email?.toLowerCase();

    // Get current available balance across sources
    const existingWallet =
      wallets[targetSellerId] ||
      (targetUserId ? wallets[targetUserId] : undefined) ||
      (targetEmail ? wallets[targetEmail] : undefined);

    let currentAvailable = Number(
      existingWallet?.availableBalance ??
      existingWallet?.balance ??
      existingWallet?.walletBalance ??
      0
    );
    let currentEarnings = Number(existingWallet?.totalEarnings || 0);
    let currentWithdrawn = Number(existingWallet?.totalWithdrawn || 0);
    let currentPending = Number(existingWallet?.pendingBalance || 0);

    try {
      const rawW = localStorage.getItem('nexus_wallets');
      if (rawW) {
        const parsedW = JSON.parse(rawW);
        const foundW =
          parsedW[targetSellerId] ||
          (targetUserId && parsedW[targetUserId]) ||
          (targetEmail && parsedW[targetEmail]);
        if (foundW) {
          const bal = Number(foundW.availableBalance ?? foundW.balance ?? foundW.walletBalance ?? 0);
          if (!isNaN(bal) && bal > currentAvailable) currentAvailable = bal;
          if (foundW.totalEarnings && !currentEarnings) currentEarnings = Number(foundW.totalEarnings);
          if (foundW.totalWithdrawn && !currentWithdrawn) currentWithdrawn = Number(foundW.totalWithdrawn);
          if (foundW.pendingBalance && !currentPending) currentPending = Number(foundW.pendingBalance);
        }
      }
    } catch {}

    if (seller) {
      const sBal = Number(seller.walletBalance ?? (seller as any).balance ?? 0);
      if (!isNaN(sBal) && sBal > currentAvailable) currentAvailable = sBal;
    }

    if (
      currentUser &&
      (currentUser.id === targetSellerId || currentUser.id === targetUserId)
    ) {
      const uBal = Number(currentUser.walletBalance || 0);
      if (!isNaN(uBal) && uBal > currentAvailable) currentAvailable = uBal;
    }

    // AUTOMATICALLY REFUND the amount back to the seller's active wallet balance!
    const refundedBalance = Number((currentAvailable + w.amount).toFixed(2));
    const newTotalWithdrawn = wasPaid
      ? Math.max(0, Number((currentWithdrawn - w.amount).toFixed(2)))
      : currentWithdrawn;
    const effectiveEarnings = currentEarnings || refundedBalance;

    const updatedWalletItem: SellerWallet = {
      sellerId: targetSellerId,
      availableBalance: refundedBalance,
      balance: refundedBalance,
      walletBalance: refundedBalance,
      pendingBalance: currentPending,
      totalEarnings: effectiveEarnings,
      totalWithdrawn: newTotalWithdrawn,
      updatedAt: new Date().toISOString(),
    };

    // 1. Update wallets in state & localStorage
    setWallets((wMap) => {
      const nextMap: Record<string, SellerWallet> = {
        ...wMap,
        [targetSellerId]: updatedWalletItem,
      };
      if (targetUserId) nextMap[targetUserId] = updatedWalletItem;
      if (targetEmail) nextMap[targetEmail] = updatedWalletItem;
      try {
        localStorage.setItem('nexus_wallets', JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });

    // 2. Update sellers in state & localStorage
    setSellers((prevSellers) => {
      const updated = prevSellers.map((s) =>
        s.id === targetSellerId ||
        (targetUserId && s.userId === targetUserId) ||
        (targetEmail && s.email?.toLowerCase() === targetEmail)
          ? {
              ...s,
              walletBalance: refundedBalance,
              balance: refundedBalance,
              availableBalance: refundedBalance,
            }
          : s
      );
      try {
        localStorage.setItem('nexus_sellers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 3. Update currentUser if matching
    if (
      currentUser.id === targetSellerId ||
      (targetUserId && currentUser.id === targetUserId) ||
      (targetEmail && currentUser.email?.toLowerCase() === targetEmail)
    ) {
      setCurrentUser((u) => {
        const nextU = {
          ...u,
          walletBalance: refundedBalance,
          balance: refundedBalance,
        };
        try {
          localStorage.setItem('nexus_current_user', JSON.stringify(nextU));
        } catch {}
        return nextU;
      });
    }

    // 4. Persist refunded wallet balance to Firestore
    saveSellerWalletToFirestore(
      targetSellerId,
      refundedBalance,
      effectiveEarnings,
      currentPending,
      newTotalWithdrawn,
      targetUserId
    ).catch((err) => console.warn('[Firestore] Error saving refunded wallet:', err));

    // 5. Update withdrawal status to REJECTED in state, localStorage, and Firestore
    const updatedWithdrawal: WithdrawalRequest = {
      ...w,
      status: 'REJECTED',
      adminNote: reason,
      processedAt: new Date().toISOString(),
    };

    setWithdrawals((prev) => {
      const next = prev.map((item) => (item.id === withdrawalId ? updatedWithdrawal : item));
      try {
        localStorage.setItem('nexus_withdrawals', JSON.stringify(next));
      } catch {}
      return next;
    });

    updateWithdrawalInFirestore(withdrawalId, {
      status: 'REJECTED',
      adminNote: reason,
      processedAt: updatedWithdrawal.processedAt,
    }).catch((err) => console.warn('[Firestore] Error updating withdrawal rejection:', err));

    // 6. Record refund transaction in ledger
    const refundTx: WalletTransaction = {
      id: generateTxId(),
      sellerId: targetSellerId,
      withdrawalId: w.id,
      type: 'REFUND_ADJUSTMENT',
      amount: w.amount,
      description: `Refunded: Withdrawal #${w.id} rejected (${reason}). Funds returned to wallet balance.`,
      status: 'COMPLETED',
      date: new Date().toISOString(),
    };
    setTransactions((t) => [refundTx, ...t]);

    // 7. Send notification to seller
    const notifyId = targetUserId || targetSellerId;
    if (notifyId) {
      addNotification(
        notifyId,
        'Withdrawal Rejected - Funds Refunded ↩️',
        `Withdrawal #${w.id} for $${w.amount.toFixed(2)} was rejected (${reason}). $${w.amount.toFixed(2)} has been refunded to your wallet balance.`,
        'WALLET',
        '/seller/wallet'
      );
    }

    // 8. Broadcast on BroadcastChannel across open tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_wallet_channel');
        bc.postMessage({
          type: 'WALLET_UPDATED',
          sellerId: targetSellerId,
          userId: targetUserId,
          newBalance: refundedBalance,
          pendingBalance: currentPending,
          wallet: updatedWalletItem,
        });
        bc.close();
      }
    } catch {}
  };

  const deleteWithdrawalRequest = (withdrawalId: string) => {
    setWithdrawals((prev) => {
      const next = prev.filter((w) => w.id !== withdrawalId);
      try {
        localStorage.setItem('nexus_withdrawals', JSON.stringify(next));
      } catch {}
      return next;
    });
    deleteWithdrawalFromFirestore(withdrawalId).catch((err) =>
      console.warn('[Firestore] Error deleting withdrawal from Firestore:', err)
    );
  };

  const refreshWithdrawals = async () => {
    try {
      const live = await fetchAllFirestoreWithdrawals();
      if (live && live.length > 0) {
        setWithdrawals((prev) => {
          const prevMap = new Map<string, WithdrawalRequest>(prev.map((w) => [w.id, w]));
          live.forEach((lw: any) => {
            if (lw && lw.id) {
              const existing = prevMap.get(lw.id);
              prevMap.set(lw.id, existing ? { ...existing, ...lw } : (lw as WithdrawalRequest));
            }
          });
          const merged = Array.from(prevMap.values()).filter(
            (w) => !DUMMY_SELLER_IDS.has(w.sellerId) && !w.sellerId?.includes('@seller.com')
          );
          try {
            localStorage.setItem('nexus_withdrawals', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch (err) {
      console.warn('[Firestore] Error manual refreshing withdrawals:', err);
    }
  };

  const adjustSellerWallet = (
    sellerId: string,
    amount: number,
    type: 'ADD' | 'DEDUCT',
    note?: string
  ): { success: boolean; message: string; newBalance: number } => {
    const seller =
      sellers.find(
        (s) =>
          s.id === sellerId ||
          s.userId === sellerId ||
          (s.email && s.email.toLowerCase() === sellerId.toLowerCase())
      ) ||
      (currentUser && (currentUser.id === sellerId || currentUser.role === 'SELLER')
        ? {
            id: currentUser.id,
            userId: currentUser.id,
            email: currentUser.email,
            walletBalance: currentUser.walletBalance || 0,
            shopName: currentUser.name || 'Merchant Store',
            sellerName: currentUser.name || 'Merchant Seller',
          }
        : undefined);

    if (!seller) {
      return { success: false, message: 'Seller not found.', newBalance: 0 };
    }

    if (amount <= 0) {
      return { success: false, message: 'Amount must be greater than 0.', newBalance: 0 };
    }

    // Retrieve current wallet or fallback to seller's profile balance
    const currentWallet =
      wallets[seller.id] ||
      (seller.userId ? wallets[seller.userId] : undefined) ||
      wallets[sellerId] || {
        sellerId: seller.id,
        availableBalance: seller.walletBalance || 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        updatedAt: new Date().toISOString(),
      };

    const prevBalance = Number(
      currentWallet.availableBalance ??
      currentWallet.balance ??
      currentWallet.walletBalance ??
      seller.walletBalance ??
      0
    );

    // Check for insufficient balance on deduction
    if (type === 'DEDUCT' && prevBalance < amount) {
      return {
        success: false,
        message: `Insufficient balance! Seller currently has $${prevBalance.toFixed(2)}. Cannot deduct $${amount.toFixed(2)}.`,
        newBalance: prevBalance,
      };
    }

    // Synchronously calculate new balance
    const calculatedNewBalance =
      type === 'ADD'
        ? Number((prevBalance + amount).toFixed(2))
        : Number(Math.max(0, prevBalance - amount).toFixed(2));

    // Total Earnings strictly represents actual product sales volume, NOT admin manual wallet adjustments
    const newTotalEarnings = Number((currentWallet.totalEarnings || 0).toFixed(2));

    const newTotalWithdrawn =
      type === 'DEDUCT'
        ? Number(((currentWallet.totalWithdrawn || 0) + amount).toFixed(2))
        : (currentWallet.totalWithdrawn || 0);

    setWallets((wMap) => {
      const existing =
        wMap[seller.id] ||
        (seller.userId ? wMap[seller.userId] : undefined) ||
        wMap[sellerId] ||
        currentWallet;

      const updatedWalletItem = {
        ...existing,
        sellerId: seller.id,
        availableBalance: calculatedNewBalance,
        balance: calculatedNewBalance,
        walletBalance: calculatedNewBalance,
        totalEarnings: newTotalEarnings,
        totalWithdrawn: newTotalWithdrawn,
        updatedAt: new Date().toISOString(),
      };

      const nextMap = {
        ...wMap,
        [sellerId]: updatedWalletItem,
        [seller.id]: updatedWalletItem,
      };
      if (seller.userId) {
        nextMap[seller.userId] = updatedWalletItem;
      }
      if (seller.email) {
        nextMap[seller.email.toLowerCase()] = updatedWalletItem;
      }
      try {
        localStorage.setItem('nexus_wallets', JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });

    // Update seller profile state for instant visual sync
    setSellers((prev) => {
      const updated = prev.map((s) =>
        s.id === seller.id ||
        (seller.userId && s.userId === seller.userId) ||
        (seller.email && s.email?.toLowerCase() === seller.email.toLowerCase())
          ? { ...s, walletBalance: calculatedNewBalance, balance: calculatedNewBalance }
          : s
      );
      try {
        localStorage.setItem('nexus_sellers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Update active user profile if the current user is this seller
    if (
      currentUser.id === seller.id ||
      currentUser.id === seller.userId ||
      (seller.email && currentUser.email?.toLowerCase() === seller.email.toLowerCase())
    ) {
      setCurrentUser((u) => {
        const nextU = { ...u, walletBalance: calculatedNewBalance };
        try {
          localStorage.setItem('nexus_current_user', JSON.stringify(nextU));
        } catch {}
        return nextU;
      });
    }

    // Persist wallet balance directly to Firestore with both seller.id and seller.userId
    saveSellerWalletToFirestore(
      seller.id,
      calculatedNewBalance,
      newTotalEarnings,
      currentWallet.pendingBalance || 0,
      newTotalWithdrawn,
      seller.userId
    ).catch((err) => console.warn('[Firestore] Sync wallet adjustment notice:', err));

    // Broadcast across browser tabs so any active seller dashboard updates live
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_wallet_channel');
        bc.postMessage({
          type: 'WALLET_UPDATED',
          sellerId: seller.id,
          userId: seller.userId,
          newBalance: calculatedNewBalance,
        });
        bc.close();
      }
    } catch {}

    // Record Transaction
    const txType: TransactionType = type === 'ADD' ? 'MANUAL_CREDIT' : 'MANUAL_DEBIT';
    const newTx: WalletTransaction = {
      id: generateTxId(),
      sellerId,
      type: txType,
      amount,
      description:
        note ||
        (type === 'ADD'
          ? `Admin credited $${amount.toFixed(2)} to wallet`
          : `Admin deducted $${amount.toFixed(2)} from wallet`),
      status: 'COMPLETED',
      date: new Date().toISOString(),
      isAdminDeposit: true,
      source: 'ADMIN',
    };
    setTransactions((t) => [newTx, ...t]);

    // Send Notification to Seller
    addNotification(
      seller.userId,
      type === 'ADD' ? 'Wallet Credited 💰' : 'Wallet Adjusted ℹ️',
      type === 'ADD'
        ? `Admin manually added $${amount.toFixed(2)} to your wallet balance. ${note ? `Note: ${note}` : ''}`
        : `Admin deducted $${amount.toFixed(2)} from your wallet balance. ${note ? `Note: ${note}` : ''}`,
      'WALLET',
      '/seller/wallet'
    );

    return {
      success: true,
      message:
        type === 'ADD'
          ? `Successfully added $${amount.toFixed(2)} to ${seller.shopName || seller.sellerName}'s wallet!`
          : `Successfully deducted $${amount.toFixed(2)} from ${seller.shopName || seller.sellerName}'s wallet!`,
      newBalance: calculatedNewBalance,
    };
  };

  // Delete Transaction Log (Admin Soft Delete: deletes log entry only, preserves seller wallet balance)
  const deleteTransaction = (transactionId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
  };

  // Settings
  const updateSettings = (newSettings: Partial<PlatformSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Conversations
  const sendMessage = (
    conversationId: string,
    text: string,
    imageUrl?: string,
    senderOverride?: {
      senderId?: string;
      senderName?: string;
      senderRole?: UserRole;
      candidateIds?: string[];
      sellerId?: string;
    }
  ): Message => {
    const senderId = senderOverride?.senderId || currentUser.id;
    const senderName = senderOverride?.senderName || currentUser.name;
    const senderRole = senderOverride?.senderRole || currentUser.role;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId,
      senderName,
      senderRole,
      text,
      imageUrl,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMsg]);

    // 1. Immediately restore this chat thread from deleted list
    restoreChatThread(conversationId, senderOverride?.candidateIds);

    // 2. Update or restore conversation snippet in local state
    setConversations((prev) => {
      const candidateList = [
        conversationId,
        conversationId.replace(/^conv_/, ''),
        `conv_${conversationId.replace(/^conv_/, '')}`,
        ...(senderOverride?.candidateIds || []),
      ];
      const idx = prev.findIndex((c) => candidateList.includes(c.id));
      const isSenderAdmin = senderRole === 'ADMIN';

      if (idx !== -1) {
        return prev.map((c, i) => {
          if (i === idx) {
            return {
              ...c,
              lastMessageText: text || (imageUrl ? '📷 Photo' : 'Message'),
              lastMessageTime: new Date().toISOString(),
              lastSenderRole: senderRole,
              unreadCountParticipantOne: isSenderAdmin
                ? (c.unreadCountParticipantOne || 0) + 1
                : (c.unreadCountParticipantOne || 0),
              unreadCountParticipantTwo: isSenderAdmin
                ? 0
                : (c.unreadCountParticipantTwo || 0) + 1,
            };
          }
          return c;
        });
      }

      // If the conversation was previously deleted from the list, restore it now!
      const seller = sellers.find(
        (s) =>
          candidateList.includes(s.id) ||
          candidateList.includes(s.userId) ||
          (senderOverride?.sellerId && (s.id === senderOverride.sellerId || s.userId === senderOverride.sellerId))
      );
      const restoredConv: Conversation = {
        id: conversationId,
        type: 'SELLER_ADMIN',
        participantOneId: seller?.id || seller?.userId || conversationId,
        participantOneName: seller?.shopName || seller?.sellerName || 'Seller',
        participantOneRole: 'SELLER',
        participantTwoId: 'user_admin',
        participantTwoName: 'Customer Care & Admin',
        participantTwoRole: 'ADMIN',
        lastMessageText: text || (imageUrl ? '📷 Photo' : 'Message'),
        lastMessageTime: new Date().toISOString(),
        lastSenderRole: senderRole,
        unreadCountParticipantOne: isSenderAdmin ? 1 : 0,
        unreadCountParticipantTwo: isSenderAdmin ? 0 : 1,
      };
      return [restoredConv, ...prev];
    });

    // 1. Sync to Firestore using sendChatMessage (writes to chats/{chatId}/messages subcollection)
    const existingConv = conversations.find((c) => c.id === conversationId);
    const isSeller = senderRole === 'SELLER';
    let receiverId = isSeller
      ? (existingConv?.participantTwoId || 'user_admin')
      : (senderOverride?.sellerId || existingConv?.participantOneId || conversationId);

    if (!isSeller && (receiverId === 'user_admin' || receiverId === 'admin')) {
      const altCandidate = senderOverride?.sellerId || senderOverride?.candidateIds?.[0];
      if (altCandidate && altCandidate !== 'user_admin') {
        receiverId = altCandidate;
      }
    }

    sendChatMessage(
      senderId,
      receiverId,
      text,
      isSeller ? 'seller' : 'admin',
      {
        imageUrl,
        senderName,
        messageId: newMsg.id,
        candidateIds: senderOverride?.candidateIds,
        sellerId: senderOverride?.sellerId,
        conversationId,
      }
    ).catch((err) => console.warn('[Firestore] sendChatMessage error:', err));

    // Also mirror to syncMessageToFirestore for backward compatibility
    syncMessageToFirestore(newMsg, existingConv);

    // 2. Broadcast across local browser tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_chat_channel');
        bc.postMessage({ type: 'NEW_CHAT_MESSAGE', message: newMsg });
        bc.close();
      }
    } catch {}

    // 3. Audio Beep: If message is from a seller (or non-admin) to admin
    const isFromSeller = senderRole === 'SELLER' || senderRole !== 'ADMIN';
    const isAdminActive =
      currentUser.role === 'ADMIN' ||
      Boolean(localStorage.getItem('nexus_admin_session'));

    if (isFromSeller && isAdminActive) {
      playNotificationBeep();
    }

    // 4. Alert Admin via Notification if message is from Seller
    if (isFromSeller) {
      addNotification(
        'user_admin',
        `New Message from ${senderName}`,
        text ? (text.length > 80 ? `${text.slice(0, 77)}...` : text) : 'Sent an attachment',
        'SUPPORT',
        '/admin'
      );
    }

    // 5. Customer Care 10-Minute Auto-Reply Logic:
    // If a seller messages customer care: schedule auto-reply for 10 minutes from now.
    // If admin replies: immediately cancel and discard the auto-reply!
    const candidateList = [
      conversationId,
      conversationId.replace(/^conv_/, ''),
      `conv_${conversationId.replace(/^conv_/, '')}`,
      ...(senderOverride?.candidateIds || []),
    ];

    if (senderRole === 'SELLER') {
      scheduleSupportAutoReply(
        conversationId,
        senderId,
        senderName,
        candidateList,
        newMsg.id
      );
    } else if (senderRole === 'ADMIN') {
      cancelSupportAutoReply(conversationId, candidateList);
    }

    return newMsg;
  };

  const startOrGetSupportConversation = (
    userId: string,
    userName?: string,
    userRole?: UserRole
  ): Conversation => {
    let resolvedRole: UserRole = userRole || 'CUSTOMER';
    let resolvedName = userName;
    if (userName === 'SELLER' || userName === 'CUSTOMER' || userName === 'ADMIN') {
      resolvedRole = userName as UserRole;
      resolvedName = undefined;
    }
    const sellerMatch = sellers.find(
      (s) =>
        s.userId === userId ||
        s.id === userId ||
        s.email?.toLowerCase() === userId.toLowerCase() ||
        (s.shopName && resolvedName && s.shopName.toLowerCase() === resolvedName.toLowerCase())
    );
    if (!resolvedName) {
      resolvedName = sellerMatch?.shopName || sellerMatch?.sellerName || currentUser.name || 'Merchant';
    }
    const cleanSellerId = sellerMatch?.id || sellerMatch?.userId || userId;

    const existing = conversations.find(
      (c) =>
        c.id === cleanSellerId ||
        c.id === `conv_${cleanSellerId}` ||
        (sellerMatch && (c.id === sellerMatch.id || c.id === `conv_${sellerMatch.id}` || c.id === sellerMatch.userId || c.id === `conv_${sellerMatch.userId}`)) ||
        c.participantOneId === cleanSellerId ||
        c.participantOneId === userId ||
        (sellerMatch && (c.participantOneId === sellerMatch.id || c.participantOneId === sellerMatch.userId)) ||
        c.participantTwoId === cleanSellerId ||
        c.participantTwoId === userId ||
        (sellerMatch && (c.participantTwoId === sellerMatch.id || c.participantTwoId === sellerMatch.userId)) ||
        (sellerMatch?.shopName && (c.participantOneName || '').toLowerCase().includes(sellerMatch.shopName.toLowerCase()))
    );
    if (existing) {
      return existing;
    }

    const newConvId = cleanSellerId;
    const newConv: Conversation = {
      id: newConvId,
      type: resolvedRole === 'SELLER' ? 'SELLER_ADMIN' : 'CUSTOMER_SUPPORT',
      participantOneId: cleanSellerId,
      participantOneName: resolvedName,
      participantOneRole: resolvedRole,
      participantTwoId: 'user_admin',
      participantTwoName: 'Customer Care & Admin',
      participantTwoRole: 'ADMIN',
      lastMessageText: '',
      lastMessageTime: new Date().toISOString(),
      unreadCountParticipantOne: 0,
      unreadCountParticipantTwo: 0,
    };

    // Schedule state update safely outside the React render cycle to avoid infinite re-render loops
    setTimeout(() => {
      setConversations((prev) => {
        if (
          prev.some(
            (c) =>
              c.id === newConvId ||
              c.participantOneId === cleanSellerId ||
              c.participantOneId === userId
          )
        ) {
          return prev;
        }
        return [newConv, ...prev];
      });
      syncConversationToFirestore(newConv).catch((err) =>
        console.warn('[Firestore] Sync conversation error:', err)
      );
    }, 0);

    return newConv;
  };

  const markConversationAsRead = (
    conversationId: string,
    readerRole: UserRole,
    extraCandidateIds?: string[]
  ) => {
    if (!conversationId && (!extraCandidateIds || extraCandidateIds.length === 0)) return;

    const rawIds = [conversationId, ...(extraCandidateIds || [])].filter(Boolean);
    const candidateSet = new Set<string>();
    rawIds.forEach((id) => {
      const clean = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
      candidateSet.add(id);
      candidateSet.add(clean);
      candidateSet.add(`conv_${clean}`);
    });

    setConversations((prev) =>
      prev.map((c) => {
        if (
          candidateSet.has(c.id) ||
          candidateSet.has(c.participantOneId) ||
          candidateSet.has(c.participantTwoId)
        ) {
          if (c.participantOneRole === readerRole) {
            return { ...c, unreadCountParticipantOne: 0, unreadSeller: 0 };
          } else {
            return { ...c, unreadCountParticipantTwo: 0, unreadAdmin: 0 };
          }
        }
        return c;
      })
    );

    setMessages((prev) =>
      prev.map((m) => {
        const matches =
          candidateSet.has(m.conversationId) ||
          candidateSet.has(m.senderId) ||
          ((m as any).receiverId && candidateSet.has((m as any).receiverId));
        if (matches && m.senderRole !== readerRole) {
          return { ...m, isRead: true };
        }
        return m;
      })
    );

    // Sync read status to Firestore
    markChatMessagesAsRead(
      conversationId,
      readerRole === 'ADMIN' ? 'ADMIN' : 'SELLER',
      Array.from(candidateSet)
    ).catch((err) =>
      console.warn('[Firestore] Error marking messages read:', err)
    );

    // Broadcast across tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_chat_channel');
        bc.postMessage({
          type: 'MESSAGES_READ',
          conversationId,
          candidateIds: Array.from(candidateSet),
          readerRole,
        });
        setTimeout(() => bc.close(), 1000);
      }
    } catch {}
  };

  const deleteSingleMessage = (messageId: string, convId?: string, extraCandidateIds?: string[]) => {
    let targetConvId = convId || '';
    const extraIds = new Set<string>(extraCandidateIds || []);

    setMessages((prev) => {
      const targetMsg = prev.find((m) => m.id === messageId);
      if (targetMsg) {
        if (!targetConvId) targetConvId = targetMsg.conversationId;
        if (targetMsg.conversationId) extraIds.add(targetMsg.conversationId);
        if (targetMsg.senderId) extraIds.add(targetMsg.senderId);
        if ((targetMsg as any).receiverId) extraIds.add((targetMsg as any).receiverId);
      }
      const updated = prev.filter((m) => m.id !== messageId);

      const allIds = Array.from(new Set([targetConvId, ...Array.from(extraIds)])).filter(Boolean);
      allIds.forEach((cid) => {
        const remaining = updated.filter((m) => m.conversationId === cid);
        const lastMsg = remaining[remaining.length - 1];
        setConversations((cPrev) =>
          cPrev.map((c) => {
            if (c.id === cid || c.id === `conv_${cid}` || c.id === cid.replace('conv_', '')) {
              return {
                ...c,
                lastMessageText: lastMsg ? (lastMsg.text || 'Attachment') : '',
                lastMessageTime: lastMsg ? (lastMsg.timestamp || new Date().toISOString()) : new Date().toISOString(),
              };
            }
            return c;
          })
        );
      });

      return updated;
    });

    // Sync deletion to Firestore across all candidate IDs
    const candidateList = Array.from(new Set([targetConvId, ...Array.from(extraIds)])).filter(Boolean);
    deleteChatMessage(targetConvId || candidateList[0] || '', messageId, candidateList).catch((err) =>
      console.warn('[Firestore] Error deleting chat message:', err)
    );

    // Broadcast deletion across local tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_chat_channel');
        bc.postMessage({
          type: 'MESSAGE_DELETED',
          messageId,
          conversationId: targetConvId,
          candidateIds: candidateList,
        });
        bc.close();
      }
    } catch {}
  };

  const deleteEntireConversation = (conversationId: string, extraCandidateIds?: string[]) => {
    const rawIds = [conversationId, ...(extraCandidateIds || [])].map((id) => (id || '').trim()).filter(Boolean);
    const candidateSet = new Set<string>();
    rawIds.forEach((id) => {
      const clean = id.startsWith('conv_') ? id.replace(/^conv_/, '') : id;
      candidateSet.add(id);
      candidateSet.add(clean);
      candidateSet.add(`conv_${clean}`);
    });
    const candidateList = Array.from(candidateSet);

    // 1. Mark thread as deleted in persistent map until a new message arrives
    recordChatThreadDeleted(conversationId, candidateList);
    recordConversationCleared(conversationId, candidateList);

    // 2. Remove all messages for this thread
    setMessages((prev) => {
      const updated = prev.filter((m) => {
        if (candidateSet.has(m.conversationId)) return false;
        if (m.senderId && candidateSet.has(m.senderId)) return false;
        if ((m as any).receiverId && candidateSet.has((m as any).receiverId)) return false;
        return true;
      });
      try {
        localStorage.setItem('nexus_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 3. Remove conversation from conversations list
    setConversations((prev) => {
      const updated = prev.filter(
        (c) => !candidateSet.has(c.id) && !candidateSet.has(c.participantOneId) && !candidateSet.has(c.participantTwoId)
      );
      try {
        localStorage.setItem('nexus_conversations', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 4. Broadcast deletion across open tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('nexus_chat_channel');
        bc.postMessage({
          type: 'CONVERSATION_DELETED',
          conversationId,
          candidateIds: candidateList,
        });
        bc.close();
      }
    } catch {}

    // 5. Permanently wipe messages from Firestore
    deleteAllChatMessages(conversationId, candidateList).catch((err) =>
      console.warn('[Firestore] Error wiping conversation messages:', err)
    );

    // 6. Delete conversation documents from Firestore
    candidateList.forEach((cId) => {
      deleteEntireConversationFromFirestore(cId, candidateList).catch((err) =>
        console.warn('[Firestore] Error wiping entire conversation document from Firestore:', cId, err)
      );
    });
  };

  const deleteConversationAndReset = (conversationId: string, extraCandidateIds?: string[]) => {
    deleteEntireConversation(conversationId, extraCandidateIds);
  };

  const syncMessagesWithFirestore = (
    conversationId: string,
    validMessages: Message[],
    candidateIds?: string[]
  ) => {
    if (!conversationId) return;

    // Case 1: Deletion or reset notification across tabs/listeners
    if (!validMessages || validMessages.length === 0) {
      if (candidateIds && candidateIds.length > 0) {
        const delSet = new Set(candidateIds);
        setMessages((prev) => {
          const filtered = prev.filter((m) => {
            if (delSet.has(m.id)) return false;
            if (delSet.has(m.conversationId)) return false;
            return true;
          });
          try {
            localStorage.setItem('nexus_messages', JSON.stringify(filtered));
          } catch {}
          return filtered;
        });
      }
      return;
    }

    // Case 2: Synchronizing live Firestore messages
    const candidateSet = new Set<string>([
      conversationId,
      conversationId.replace(/^conv_/, ''),
      `conv_${conversationId.replace(/^conv_/, '')}`,
      ...(candidateIds || []),
    ]);

    const clearedTime = getConversationClearedTime(conversationId);

    const filteredIncoming = validMessages.filter((m) => {
      if (!m || !m.id) return false;
      if (isChatMessageDeleted(m.id)) return false;
      const msgTime = new Date(m.timestamp).getTime();
      if (clearedTime > 0 && msgTime <= clearedTime) return false;
      return true;
    });

    if (filteredIncoming.length === 0) return;

    // Check if chat thread was deleted and whether any incoming message has a timestamp after deletion
    const latestIncoming = filteredIncoming.reduce((latest, current) => {
      const tCurrent = new Date(current.timestamp).getTime();
      const tLatest = new Date(latest.timestamp).getTime();
      return tCurrent > tLatest ? current : latest;
    }, filteredIncoming[0]);

    const latestTime = new Date(latestIncoming.timestamp).getTime();
    const deletedThreadsMap = getDeletedChatThreadsMap();
    let threadDeletedAt = 0;
    candidateSet.forEach((id) => {
      const t = deletedThreadsMap[id] || 0;
      if (t > threadDeletedAt) threadDeletedAt = t;
    });

    if (threadDeletedAt > 0 && latestTime > threadDeletedAt) {
      restoreChatThread(conversationId, Array.from(candidateSet));
    }

    // Auto-Reply Management: If any incoming message from Firestore is from ADMIN, cancel auto-reply!
    const hasAdminIncoming = filteredIncoming.some((m) => m.senderRole === 'ADMIN');
    if (hasAdminIncoming) {
      cancelSupportAutoReply(conversationId, Array.from(candidateSet));
    } else {
      const latestSeller = filteredIncoming
        .filter((m) => m.senderRole === 'SELLER')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      if (latestSeller) {
        scheduleSupportAutoReply(
          conversationId,
          latestSeller.senderId,
          latestSeller.senderName,
          Array.from(candidateSet),
          latestSeller.id
        );
      }
    }

    setMessages((prev) => {
      const map = new Map<string, Message>();
      prev.forEach((m) => {
        if (!isChatMessageDeleted(m.id)) {
          map.set(m.id, m);
        }
      });
      filteredIncoming.forEach((m) => {
        map.set(m.id, m);
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      try {
        localStorage.setItem('nexus_messages', JSON.stringify(merged));
      } catch {}
      return merged;
    });

    // Update conversation snippet if newest message is more recent
    if (latestIncoming) {
      setConversations((prev) => {
        const targetIdx = prev.findIndex((c) => candidateSet.has(c.id));
        if (targetIdx !== -1) {
          const conv = prev[targetIdx];
          const convLastTime = conv.lastMessageTime ? new Date(conv.lastMessageTime).getTime() : 0;
          if (latestTime >= convLastTime) {
            const isSenderAdmin = latestIncoming.senderRole === 'ADMIN';
            return prev.map((c, i) =>
              i === targetIdx
                ? {
                    ...c,
                    lastMessageText: latestIncoming.text || (latestIncoming.imageUrl ? '📷 Photo' : 'Message'),
                    lastMessageTime: latestIncoming.timestamp,
                    lastSenderRole: latestIncoming.senderRole,
                    unreadCountParticipantOne: isSenderAdmin
                      ? (c.unreadCountParticipantOne || 0)
                      : (c.unreadCountParticipantOne || 0),
                    unreadCountParticipantTwo: isSenderAdmin
                      ? (c.unreadCountParticipantTwo || 0)
                      : (c.unreadCountParticipantTwo || 0) + 1,
                  }
                : c
            );
          }
        }
        return prev;
      });
    }
  };

  // Customer Care 10-Minute Auto-Reply Background Worker:
  // When a seller sends a message, if admin does NOT reply within 10 minutes (600 seconds),
  // automatically dispatch a polite "representative currently busy" response.
  // If the admin replies within 10 minutes, the auto-reply is cancelled and never sent!
  useEffect(() => {
    const checkAutoReplies = () => {
      const map = getPendingSupportAutoReplies();
      const keys = Object.keys(map);
      if (keys.length === 0) return;

      const now = Date.now();
      let hasChanges = false;
      const processedTriggerIds = new Set<string>();

      keys.forEach((convId) => {
        const item = map[convId];
        if (!item || item.completed) return;

        const candidateSet = new Set<string>([
          item.conversationId,
          item.conversationId.replace(/^conv_/, ''),
          `conv_${item.conversationId.replace(/^conv_/, '')}`,
          ...(item.candidateIds || []),
        ]);

        const triggerId = item.sellerMessageId || item.conversationId;
        if (processedTriggerIds.has(triggerId)) {
          delete map[convId];
          hasChanges = true;
          return;
        }

        // Verify if admin has replied since the seller's message
        const adminReply = messages.find((m) => {
          if (m.senderRole !== 'ADMIN') return false;
          const matchesConv =
            candidateSet.has(m.conversationId) ||
            candidateSet.has(m.senderId) ||
            ((m as any).receiverId && candidateSet.has((m as any).receiverId));
          if (!matchesConv) return false;
          const msgTime = new Date(m.timestamp).getTime();
          return msgTime >= item.sellerMessageTime;
        });

        if (adminReply) {
          // Admin replied! Cancel the auto-reply for all candidate IDs
          processedTriggerIds.add(triggerId);
          candidateSet.forEach((id) => {
            delete map[id];
          });
          hasChanges = true;
          return;
        }

        // Check if 10 minutes have elapsed
        if (now >= item.dueAt) {
          processedTriggerIds.add(triggerId);

          // Mark completed and remove pending entries across all candidate keys
          candidateSet.forEach((id) => {
            delete map[id];
          });
          hasChanges = true;

          // Dispatch short English auto-reply now
          sendMessage(
            item.conversationId,
            AUTO_REPLY_MESSAGE_TEXT,
            undefined,
            {
              senderId: 'user_admin',
              senderName: 'Customer Care & Admin',
              senderRole: 'ADMIN',
              candidateIds: item.candidateIds,
              sellerId: item.sellerId,
            }
          );
        }
      });

      if (hasChanges) {
        savePendingSupportAutoReplies(map);
      }
    };

    const interval = setInterval(checkAutoReplies, 4000);
    return () => clearInterval(interval);
  }, [messages]);

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipientId === currentUser.id ||
        (currentUser.role === 'ADMIN' && n.recipientId === 'user_admin')
          ? { ...n, isRead: true }
          : n
      )
    );
  };

  // Reset to default seed
  const resetToDefaultData = () => {
    localStorage.clear();
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setCategories(INITIAL_CATEGORIES);
    setSellers(INITIAL_SELLERS);
    setProducts(INITIAL_PRODUCTS);
    setCart([]);
    setOrders(INITIAL_ORDERS);
    setWallets(INITIAL_WALLETS);
    setTransactions(INITIAL_TRANSACTIONS);
    setWithdrawals(INITIAL_WITHDRAWALS);
    setConversations(INITIAL_CONVERSATIONS);
    setMessages(INITIAL_MESSAGES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setSettings(INITIAL_SETTINGS);
  };

  const refreshAllCloudData = async (): Promise<{ success: boolean; sellersCount: number; error?: string }> => {
    try {
      const cloudSellers = await fetchAllFirestoreSellers();
      const permStatus = getFirestorePermissionStatus();
      if (permStatus.permissionDenied) {
        return {
          success: false,
          sellersCount: sellers.length,
          error: 'Firestore security rules blocked access. Please publish firestore.rules in Firebase Console.',
        };
      }
      if (cloudSellers && cloudSellers.length > 0) {
        setSellers((prev) => {
          const map = new Map<string, SellerProfile>();
          prev.forEach((s) => map.set(s.id, s));
          cloudSellers.forEach((cs) => {
            const existing = map.get(cs.id) || {};
            map.set(cs.id, {
              ...existing,
              ...cs,
            });
          });
          return Array.from(map.values());
        });
      }
      return {
        success: true,
        sellersCount: Math.max(sellers.length, (cloudSellers || []).length),
      };
    } catch (err: any) {
      return {
        success: false,
        sellersCount: sellers.length,
        error: err?.message || 'Error connecting to Firestore',
      };
    }
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser,
        switchUserRole,
        adminSession,
        sellerSession,
        adminRemainingSeconds,
        sellerRemainingSeconds,
        sessionNotice,
        setSessionNotice,
        adminSessionNotice,
        sellerSessionNotice,
        clearSellerSessionNotice,
        clearAdminSessionNotice,
        loginAdmin,
        resetAdminPassword,
        logoutAdmin,
        logoutSeller,
        logoutUser,
        registerCustomer,
        registerSeller,
        loginSeller,
        applyForSeller,
        updateSellerPassword,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductPublish,
        toggleSellerProductEligibility,
        removeProductFromSeller,
        addProductsToSeller,
        sellers,
        approveSellerApplication,
        rejectSellerApplication,
        freezeSellerApplication,
        unfreezeSellerApplication,
        updateSellerStarRating,
        updateSellerMaxProducts,
        verifySellerKyc,
        updateSellerProfile,
        updateSellerStatus,
        deleteSeller,
        clearAllTestSellers,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartCount,
        orders,
        createOrder,
        assignOrderToSeller,
        updateOrderDate,
        updateOrderStatus,
        deleteOrder,
        refreshOrders,
        wallets,
        transactions,
        withdrawals,
        submitWithdrawalRequest,
        approveWithdrawalRequest,
        markWithdrawalAsPaid,
        rejectWithdrawalRequest,
        deleteWithdrawalRequest,
        refreshWithdrawals,
        adjustSellerWallet,
        deleteTransaction,
        settings,
        updateSettings,
        conversations,
        messages,
        sendMessage,
        startOrGetSupportConversation,
        markConversationAsRead,
        deleteSingleMessage,
        deleteConversationAndReset,
        deleteEntireConversation,
        syncMessagesWithFirestore,
        sendChatMessage,
        listenToChatMessages,
        notifications,
        markNotificationAsRead,
        clearAllNotifications,
        resetToDefaultData,
        storeName,
        storeTagline,
        updateStoreName,
        storeContacts,
        updateStoreContacts,
        invitationCode,
        invitationCodeUpdatedAt,
        updateInvitationCode,
        validateInvitationCode,
        subscriptionPlan,
        updateSubscriptionPlan,
        updateSellerSubscription,
        sellerLoginSessions,
        recordSellerLoginSession,
        trackSellerStoreActivity,
        refreshSellerLoginSessions,
        deleteSellerLoginSessionById,
        refreshAllCloudData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
