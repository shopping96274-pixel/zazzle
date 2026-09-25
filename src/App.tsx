import React, { useState, useEffect, useMemo } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { CustomerBottomNav } from './components/layout/CustomerBottomNav';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/storefront/CartDrawer';
import { AuthModal } from './pages/public/AuthModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { HomePage } from './pages/public/HomePage';
import { ShopPage } from './pages/public/ShopPage';
import { ProductDetailPage } from './pages/public/ProductDetailPage';
import { CheckoutPage } from './pages/public/CheckoutPage';
import { BecomeSellerPage } from './pages/public/BecomeSellerPage';

// Portal & Dashboards
import { CustomerPortal } from './pages/customer/CustomerPortal';
import { SellerDashboard } from './pages/seller/SellerDashboard';
import { SellerSupportChatPage } from './pages/seller/SellerSupportChatPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';

import { Product } from './types';
import { purgeLegacyLocalStorageCredentials } from './services/adminAuth';

// Immediately purge legacy admin credentials from local storage
purgeLegacyLocalStorageCredentials();

// Helper to check if a valid seller session exists in localStorage
function hasActiveSellerSession(): boolean {
  try {
    const sessionStr = localStorage.getItem('nexus_seller_session');
    if (sessionStr) {
      const sess = JSON.parse(sessionStr);
      if (sess && sess.role === 'SELLER' && sess.userId && Date.now() < (sess.expiresAt || Infinity)) {
        return true;
      }
    }
    const userStr = localStorage.getItem('nexus_current_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u && u.role === 'SELLER' && u.id && u.id !== 'guest_visitor') {
        return true;
      }
    }
  } catch {}
  return false;
}

// Helper to check if user has active admin session
function hasActiveAdminSession(): boolean {
  try {
    const adminSess = localStorage.getItem('nexus_admin_session') || sessionStorage.getItem('nexus_admin_session');
    if (adminSess) {
      const parsed = JSON.parse(adminSess);
      if (parsed && (parsed.role === 'ADMIN' || parsed.isAdmin) && Date.now() < (parsed.expiresAt || Infinity)) {
        return true;
      }
    }
    const userStr = localStorage.getItem('nexus_current_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u && u.role === 'ADMIN') {
        return true;
      }
    }
  } catch {}
  return false;
}

// Helper to detect if current URL/hash points specifically to admin
function isUrlAdminRoute(): boolean {
  try {
    const rawHref = window.location.href.toLowerCase();
    let decodedHref = rawHref;
    try {
      decodedHref = decodeURIComponent(rawHref);
    } catch {}

    const hash = window.location.hash.toLowerCase();
    let decodedHash = hash;
    try {
      decodedHash = decodeURIComponent(hash);
    } catch {}

    const search = window.location.search.toLowerCase();
    let decodedSearch = search;
    try {
      decodedSearch = decodeURIComponent(search);
    } catch {}

    const pathname = window.location.pathname.toLowerCase();
    let decodedPath = pathname;
    try {
      decodedPath = decodeURIComponent(pathname);
    } catch {}

    // Reject standard, predictable admin paths (/admin, /admin/dashboard, #admin, ?admin=true)
    // These paths are deliberately blocked from unauthenticated public access.
    const isStandardAdminPath =
      pathname === '/admin' ||
      pathname.startsWith('/admin/') ||
      hash === '#admin' ||
      hash === '#/admin' ||
      hash.startsWith('#/admin/') ||
      hash.startsWith('#admin/') ||
      search.includes('admin=true') ||
      search.includes('admin=1') ||
      search.includes('view=admin');

    if (isStandardAdminPath) {
      // Only allow if user already has an authenticated admin session
      if (hasActiveAdminSession()) {
        return true;
      }
      // Otherwise bounce to home cleanly
      try {
        window.history.replaceState(null, '', '/');
      } catch {}
      return false;
    }

    // Check for unique, secret token-based protected route pattern (*#**##x)
    const secretCode = '*#**##x';
    const isSecretTokenPresent =
      rawHref.includes(secretCode) ||
      decodedHref.includes(secretCode) ||
      hash.includes(secretCode) ||
      decodedHash.includes(secretCode) ||
      pathname.includes(secretCode) ||
      decodedPath.includes(secretCode) ||
      search.includes(secretCode) ||
      (pathname.includes('*') && hash.includes('**##x')) ||
      rawHref.includes('%2a#%2a%2a##x') ||
      rawHref.includes('*%23**%23%23x') ||
      rawHref.includes('%2a%23%2a%2a%23%23x');

    if (isSecretTokenPresent) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// Helper to determine view from browser location
function getViewFromLocation(): string {
  try {
    if (isUrlAdminRoute()) {
      return 'admin';
    }
    const hash = window.location.hash.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    // Seller route protection: if direct link pasted in another browser/window without valid session,
    // immediately direct to seller-login!
    if (hash === '#seller' || hash === '#/seller' || pathname === '/seller' || search.includes('view=seller')) {
      if (!hasActiveSellerSession()) {
        try {
          window.history.replaceState({ view: 'seller-login' }, '', '#/seller-login');
        } catch {}
        return 'seller-login';
      }
      return 'seller';
    }
    if (hash === '#seller-support' || hash === '#/seller-support' || pathname === '/seller-support' || search.includes('view=seller-support')) {
      if (!hasActiveSellerSession()) {
        try {
          window.history.replaceState({ view: 'seller-login' }, '', '#/seller-login');
        } catch {}
        return 'seller-login';
      }
      return 'seller-support';
    }
    if (hash === '#become-seller' || hash === '#/become-seller' || pathname === '/become-seller' || search.includes('view=become-seller')) {
      return 'become-seller';
    }
    if (hash === '#seller-login' || hash === '#/seller-login' || pathname === '/seller-login' || search.includes('view=seller-login')) {
      return 'seller-login';
    }
    if (hash === '#shop' || hash === '#/shop' || pathname === '/shop' || search.includes('view=shop')) {
      return 'shop';
    }
    if (hash === '#checkout' || hash === '#/checkout' || pathname === '/checkout' || search.includes('view=checkout')) {
      return 'checkout';
    }
    if (hash === '#customer' || hash === '#/customer' || pathname === '/customer' || search.includes('view=customer')) {
      return 'customer';
    }
  } catch {}
  return 'home';
}

function MainAppContent() {
  const { currentUser, sellers, switchUserRole, trackSellerStoreActivity, storeName } = useStore();

  // Dynamically synchronize document title with storeName
  useEffect(() => {
    if (storeName) {
      document.title = `${storeName} — Premium Electronics & Global Marketplace`;
    }
  }, [storeName]);

  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      // 1. If explicit admin route in URL, open admin
      if (isUrlAdminRoute()) {
        return 'admin';
      }

      // 2. If browser location specifies another route
      const locView = getViewFromLocation();
      if (locView && locView !== 'home') {
        return locView;
      }

      // 3. If at root URL (e.g. "/" without hash/query), NEVER force admin
      // Root URL should always open the storefront home page
      const hash = window.location.hash.trim();
      const search = window.location.search.trim();
      if (!hash && !search) {
        return 'home';
      }

      // 4. Otherwise check saved non-admin view if valid
      const savedView = localStorage.getItem('nexus_active_view');
      const savedUserStr = localStorage.getItem('nexus_current_user');
      let isSellerUser = false;
      try {
        if (savedUserStr) {
          const parsedU = JSON.parse(savedUserStr);
          if (parsedU?.role === 'SELLER') isSellerUser = true;
        }
      } catch {}

      // If user is a seller and was on any seller sub-view/support, always land on main seller dashboard on refresh
      if (isSellerUser && (savedView === 'seller' || savedView === 'seller-support')) {
        return 'seller';
      }

      if (savedView && savedView !== 'admin' && savedView !== 'product') {
        return savedView;
      }
    } catch {}
    return 'home';
  });

  // Keep active view saved in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nexus_active_view', currentView);
    } catch {}
  }, [currentView]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drawers & Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Browser navigation and Direct Admin Access Listener
  useEffect(() => {
    // Seed initial history state if not already set, ensuring back button always has a landing target
    try {
      if (!window.history.state || typeof window.history.state.view !== 'string') {
        const initialView = isUrlAdminRoute() ? 'admin' : (getViewFromLocation() || 'home');
        window.history.replaceState({ view: initialView }, '', window.location.href);
      }
    } catch {}

    // When browser Back / Forward button is clicked, update view from history / URL
    const handlePopState = (e: PopStateEvent) => {
      // Check state from history first
      if (e.state && typeof e.state.view === 'string') {
        setCurrentView(e.state.view);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }

      // If at root without hash/search, always return to home storefront
      const hash = window.location.hash.trim();
      const search = window.location.search.trim();
      if (!hash && !search && (window.location.pathname === '/' || window.location.pathname === '')) {
        setCurrentView('home');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }

      // Otherwise inspect URL
      const targetView = getViewFromLocation();
      setCurrentView(targetView);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    const handleHashChange = () => {
      const targetView = getViewFromLocation();
      setCurrentView(targetView);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);

    // Secret keyboard sequence listener for: *#**##x (or Ctrl + Shift + A)
    let secretKeyBuffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        try {
          window.history.pushState({ view: 'admin' }, '', '#/*#**##x');
        } catch {
          window.location.hash = '#/*#**##x';
        }
        setCurrentView('admin');
        return;
      }

      if (e.key && e.key.length === 1) {
        secretKeyBuffer = (secretKeyBuffer + e.key.toLowerCase()).slice(-10);
        if (secretKeyBuffer.includes('*#**##x')) {
          secretKeyBuffer = '';
          try {
            window.history.pushState({ view: 'admin' }, '', '#/*#**##x');
          } catch {
            window.location.hash = '#/*#**##x';
          }
          setCurrentView('admin');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Check if seller is legitimately authenticated
  const isSellerAuth = Boolean(
    (currentUser && currentUser.role === 'SELLER' && currentUser.id && currentUser.id !== 'guest_visitor') ||
    hasActiveSellerSession()
  );

  // Check if current seller is unverified or frozen
  const activeSellerProfile = useMemo(() => {
    // If not authenticated as seller, NEVER provide a fallback seller profile
    if (!isSellerAuth) return null;

    // 1. Check logged-in user matching seller by id or email
    if (currentUser && currentUser.id && currentUser.id !== 'guest_visitor') {
      const match = sellers.find(
        (s) =>
          s &&
          (s.userId === currentUser.id ||
            s.id === currentUser.id ||
            (s.email &&
              currentUser.email &&
              s.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()))
      );
      if (match) return match;
    }

    // 2. Check stored seller session
    try {
      const sessionStr = localStorage.getItem('nexus_seller_session');
      if (sessionStr) {
        const sess = JSON.parse(sessionStr);
        if (sess) {
          const match = sellers.find(
            (s) =>
              s &&
              ((sess.userId && (s.userId === sess.userId || s.id === sess.userId)) ||
                (sess.email &&
                  s.email &&
                  s.email.toLowerCase().trim() === sess.email.toLowerCase().trim()))
          );
          if (match) return match;
        }
      }
    } catch {}

    return null;
  }, [currentUser, sellers, isSellerAuth]);

  // Enforce route protection on seller views
  useEffect(() => {
    if ((currentView === 'seller' || currentView === 'seller-support') && !isSellerAuth) {
      setCurrentView('seller-login');
      try {
        window.history.replaceState({ view: 'seller-login' }, '', '#/seller-login');
      } catch {}
    }
  }, [currentView, isSellerAuth]);

  const isSellerUnverified = Boolean(
    currentUser.role === 'SELLER' &&
    activeSellerProfile &&
    activeSellerProfile.applicationStatus === 'PENDING'
  );

  const isSellerFrozen = Boolean(
    currentUser.role !== 'ADMIN' &&
    activeSellerProfile &&
    (activeSellerProfile.applicationStatus === 'FROZEN' ||
      (activeSellerProfile as any).isFrozen === true ||
      (activeSellerProfile as any).status === 'FROZEN' ||
      (currentUser as any).isFrozen === true ||
      (currentUser as any).status === 'FROZEN')
  );

  // If seller is frozen, lock into the live customer care chat box
  useEffect(() => {
    if (isSellerFrozen && currentView !== 'seller-support' && currentView !== 'admin') {
      setCurrentView('seller-support');
      try {
        window.history.replaceState({ view: 'seller-support' }, '', '#/seller-support');
      } catch {}
    }
  }, [isSellerFrozen, currentView]);

  // Whenever seller visits store dashboard or storefront, automatically record/update active session
  useEffect(() => {
    if (activeSellerProfile && (currentView === 'seller' || currentView === 'shop' || currentView === 'seller-support')) {
      const activityLabel =
        currentView === 'seller'
          ? 'Store Dashboard Active'
          : currentView === 'shop'
          ? 'Storefront Visit'
          : 'Support Visit';
      trackSellerStoreActivity(activeSellerProfile, activityLabel);
    }
  }, [currentView, activeSellerProfile?.id, activeSellerProfile?.email, trackSellerStoreActivity]);

  // Router handler with full browser history pushState support
  const handleNavigate = (view: string, id?: string) => {
    // If attempting to enter seller routes without seller authentication, route to seller-login
    if ((view === 'seller' || view === 'seller-support') && !isSellerAuth) {
      view = 'seller-login';
    }

    // If seller is frozen, restrict all navigation strictly to customer care chat
    if (isSellerFrozen && view !== 'seller-support' && view !== 'admin') {
      setCurrentView('seller-support');
      try {
        window.history.replaceState({ view: 'seller-support' }, '', '#/seller-support');
      } catch {}
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }

    try {
      localStorage.setItem('nexus_active_view', view);
    } catch {}

    // Map view to friendly hash or url for browser back/forward history
    let targetHash = '';
    if (view === 'admin') {
      targetHash = '#/*#**##x';
    } else if (view === 'seller') {
      targetHash = '#/seller';
    } else if (view === 'become-seller') {
      targetHash = '#/become-seller';
    } else if (view === 'seller-login') {
      targetHash = '#/seller-login';
    } else if (view === 'home') {
      targetHash = '';
    } else if (view === 'shop') {
      targetHash = '#/shop';
    } else if (view === 'checkout') {
      targetHash = '#/checkout';
    } else if (view === 'customer') {
      targetHash = '#/customer';
    } else if (view === 'seller-support') {
      targetHash = '#/seller-support';
    }

    try {
      const currentHash = window.location.hash;
      const targetUrl = targetHash ? `${window.location.pathname}${targetHash}` : window.location.pathname;
      if (currentHash !== targetHash) {
        window.history.pushState({ view }, '', targetUrl);
      }
    } catch {
      if (targetHash) {
        window.location.hash = targetHash;
      }
    }

    if (view === 'admin') {
      setCurrentView('admin');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }

    // Check if query params or special route passed
    if (view.startsWith('shop?cat=')) {
      const catId = view.split('=')[1];
      setCategoryFilter(catId);
      setSearchQuery('');
      setCurrentView('shop');
    } else if (view.startsWith('shop?q=')) {
      const q = decodeURIComponent(view.split('=')[1] || '');
      setSearchQuery(q);
      setCategoryFilter('ALL');
      setCurrentView('shop');
    } else {
      if (view === 'shop') {
        setCategoryFilter('ALL');
        setSearchQuery('');
      }
      setCurrentView(view);
    }

    // Auto-scroll to top on every navigation
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* 1. Customer Quick Navigation Top Bar (Slim, Compact & Pinned at Top) */}
      {currentView !== 'become-seller' &&
        currentView !== 'seller-login' &&
        currentView !== 'seller-support' &&
        currentView !== 'seller' &&
        currentView !== 'admin' && (
          <CustomerBottomNav
            currentView={currentView}
            onNavigate={handleNavigate}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

      {/* 3. Top Main Navigation */}
      {currentView !== 'become-seller' &&
        currentView !== 'seller-login' &&
        currentView !== 'seller-support' &&
        currentView !== 'seller' &&
        currentView !== 'admin' && (
          <Navbar
            currentView={currentView}
            onNavigate={handleNavigate}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

      {/* 4. Main Dynamic Content View */}
      <main className={`flex-1 ${currentView === 'admin' || currentView === 'seller' ? 'flex flex-col w-full min-h-0' : ''}`}>
        <ErrorBoundary>
          {isSellerFrozen && currentView !== 'admin' ? (
            <SellerSupportChatPage onNavigate={handleNavigate} />
          ) : (
            <>
              {currentView === 'home' && (
                <HomePage
                  onNavigate={handleNavigate}
                  onSelectProduct={handleSelectProduct}
                />
              )}

              {currentView === 'shop' && (
                <ShopPage
                  initialCategory={categoryFilter}
                  initialQuery={searchQuery}
                  onSelectProduct={handleSelectProduct}
                />
              )}

              {currentView === 'product' && (
                selectedProduct ? (
                  <ProductDetailPage
                    product={selectedProduct}
                    onBack={() => setCurrentView('shop')}
                    onNavigate={handleNavigate}
                  />
                ) : (
                  <HomePage
                    onNavigate={handleNavigate}
                    onSelectProduct={handleSelectProduct}
                  />
                )
              )}

              {currentView === 'checkout' && (
                <CheckoutPage onNavigate={handleNavigate} />
              )}

              {currentView === 'become-seller' && (
                <BecomeSellerPage onNavigate={handleNavigate} initialMode="register" />
              )}

              {currentView === 'seller-login' && (
                <BecomeSellerPage onNavigate={handleNavigate} initialMode="login" />
              )}

              {currentView === 'seller-support' && (
                <SellerSupportChatPage onNavigate={handleNavigate} />
              )}

              {currentView === 'customer' && <CustomerPortal />}

              {currentView === 'seller' && <SellerDashboard onNavigate={handleNavigate} />}

              {currentView === 'admin' && <AdminDashboard onNavigate={handleNavigate} />}

              {![
                'home',
                'shop',
                'product',
                'checkout',
                'become-seller',
                'seller-login',
                'seller-support',
                'customer',
                'seller',
                'admin',
              ].includes(currentView) && (
                <HomePage
                  onNavigate={handleNavigate}
                  onSelectProduct={handleSelectProduct}
                />
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* 4. Slide-Over Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          setIsCartOpen(false);
          setCurrentView('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 5. Authentication & Registration Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* 6. Comprehensive Footer */}
      {currentView !== 'become-seller' &&
        currentView !== 'seller-login' &&
        currentView !== 'seller-support' &&
        currentView !== 'seller' &&
        currentView !== 'admin' && (
          <Footer onNavigate={handleNavigate} />
        )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ErrorBoundary>
        <MainAppContent />
      </ErrorBoundary>
    </StoreProvider>
  );
}
