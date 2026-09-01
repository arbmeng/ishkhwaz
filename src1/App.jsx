import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { BottomNavbar } from './components/navigation/BottomNavbar';
import { DesktopHeaderNav } from './components/navigation/DesktopHeaderNav';
import { JobFeed } from './components/freelancer/JobFeed';
import { Dashboard } from './components/dashboard/Dashboard';
import { DirectoryPage } from './components/company/DirectoryPage';
import { UserProfilePage } from './components/profile/UserProfilePage';
import { PlansPage } from './components/plans/PlansPage';
import { JobMapPage } from './components/map/JobMapPage';
import { SplashOnboarding } from './components/onboarding/SplashOnboarding';
import { RegisterProfileChoicePage } from './components/auth/RegisterProfileChoicePage';
import { LoginPage } from './components/auth/LoginPage';
import { ConnectAuthorizePage } from './components/auth/ConnectAuthorizePage';
import { AuthModal } from './components/auth/AuthModal';
import { AccountBlockedModal } from './components/auth/AccountBlockedModal';
import { PostJobPage } from './components/employer/PostJobPage';
import { KarnamaCVPage } from './components/freelancer/KarnamaCVPage';
import { KarnamaTemplatePicker } from './components/freelancer/KarnamaTemplatePicker';
import { InstallPage } from './components/pwa/InstallPage';
import { ToastSystem } from './components/ui/ToastSystem';
import { pushService } from './services/pushService';

import { SearchPage } from './components/search/SearchPage';
import { MessagesInboxPage } from './components/messages/MessagesInboxPage';
import { AdminPage } from './components/admin/AdminPage';
import { HowItWorksPage } from './components/layout/HowItWorksPage';
import { NotificationsPage } from './components/layout/NotificationsPage';

function MainAppContent() {
  const { user, token, openAuthModal, needsProfileCompletion, clearNeedsProfileCompletion } = useAuth();
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  // Draft CV data collected in KarnamaCVPage's wizard, handed off to the
  // in-app template picker — nothing leaves Ish-khwaz until the user saves.
  const [pendingKarnamaResume, setPendingKarnamaResume] = useState(null);
  const [showSidebarDrawer, setShowSidebarDrawer] = useState(false);
  // The brief branded splash plays on every cold open (like a native app) —
  // only the 3-step onboarding carousel inside it is gated to first-time-ever,
  // via the same 'ishkhwaz_splash_seen' flag, checked inside SplashOnboarding.
  const [showSplash, setShowSplash] = useState(true);

  // Force Clean Pristine Green & White Theme
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('ishkhwaz_theme');
    localStorage.removeItem('theme');
  }, []);

  // URL Path & LocalStorage Sync for Clean Subdomain URLs (e.g. /login, /register, /map, /search, /companies, /cvs, /dashboard, /profile)
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/^\/ishkhwaz|\/$/g, '').replace(/^\/|\/$/g, '').toLowerCase();
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      const target = hash || path;

      if (target === 'register' || target === 'signup' || target === 'choose-profile') return 'register';
      if (target === 'login' || target === 'signin' || target === 'auth') return 'login';
      if (target === 'connect') {
        // Capture the OAuth request params into sessionStorage right now — the
        // very next thing that can happen (auth guard redirect, tab switch)
        // rewrites window.location and drops the query string entirely.
        try {
          const params = new URLSearchParams(window.location.search);
          if (params.get('client_id') && params.get('redirect_uri')) {
            sessionStorage.setItem('ishkhwaz_pending_oauth', JSON.stringify({
              client_id: params.get('client_id'),
              redirect_uri: params.get('redirect_uri'),
              state: params.get('state') || '',
            }));
          }
        } catch { /* ignore */ }
        return 'connect';
      }
      if (target === 'authlogin') return 'login';
      if (target === 'map' || target === 'location') return 'map';
      if (target === 'search' || target === 'find' || target.startsWith('search/') || target.startsWith('find/')) return 'search';
      if (target === 'companies' || target === 'employers') return 'companies';
      if (target === 'cvs' || target === 'my_applications' || target === 'applications' || target === 'requests') return 'my_applications';
      if (target === 'messages' || target === 'inbox') return 'messages';
      if (target === 'freelancers' || target === 'candidates') return 'freelancers';
      if (target === 'profile' || target === 'user') return 'profile';
      if (target === 'dashboard' || target === 'my-company-dashboard' || target === 'company-dashboard' || target === 'my_company_dashboard') return 'my_company_dashboard';
      if (target === 'wallet' || target === 'plans' || target === 'upgrade') return 'plans';
      if (target === 'cv' || target === 'build-cv' || target === 'cv_builder' || target === 'karnama_cv') return 'karnama_cv';
      if (target === 'install') return 'install_app';
      if (target === 'admin') return 'admin';
      if (target === 'how-it-works' || target === 'how_it_works' || target === 'guide') return 'how_it_works';
      if (target === 'notifications' || target === 'alerts') return 'notifications';

      // A fresh app open with no specific path/hash — exactly what the
      // installed PWA's start_url always hits — always lands on Home (or,
      // if not signed in, sign-up on a genuine first-ever visit — same flag
      // SplashOnboarding uses for its one-time carousel — and login on every
      // visit after that), never wherever the user happened to be when they
      // last closed it.
      if (!target) {
        if (user) return 'home';
        const isFirstEverVisit = localStorage.getItem('ishkhwaz_splash_seen') !== 'true';
        return isFirstEverVisit ? 'register' : 'login';
      }
    }
    return 'login';
  };

  // Which SearchPage tab a /search/{sub} deep link should open on — SearchPage
  // itself keeps the URL in sync as the user switches tabs from then on.
  // Default is 'companies': every plain nav button that opens Search (bottom
  // nav, header nav) just flips activeTab to 'search' without pushing a
  // /search/{sub} URL, so this default is what most people actually land on.
  const getInitialSearchTab = () => {
    if (typeof window === 'undefined') return 'companies';
    const path = window.location.pathname.replace(/^\/ishkhwaz|\/$/g, '').replace(/^\/|\/$/g, '').toLowerCase();
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    const sub = (hash || path).split('/')[1] || '';
    if (sub === 'jobs' || sub === 'job') return 'jobs';
    if (sub === 'freelancers' || sub === 'freelancer' || sub === 'candidates') return 'freelancers';
    if (sub === 'company' || sub === 'companies') return 'companies';
    return 'companies';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = (tabId) => {
    setActiveTabState(tabId);
    if (typeof window !== 'undefined') {
      let path = '/login';
      if (tabId === 'register') path = '/register';
      else if (tabId === 'login') path = '/login';
      else if (tabId === 'connect') path = '/connect';
      else if (tabId === 'map') path = '/map';
      else if (tabId === 'search') path = '/search';
      else if (tabId === 'companies') path = '/companies';
      else if (tabId === 'my_applications') path = '/cvs';
      else if (tabId === 'messages') path = '/messages';
      else if (tabId === 'freelancers') path = '/freelancers';
      else if (tabId === 'profile') path = '/profile';
      else if (tabId === 'my_company_dashboard') path = '/dashboard';
      else if (tabId === 'plans') path = '/plans';
      else if (tabId === 'home') path = '/';
      else if (tabId === 'post_job') path = '/post-job';
      else if (tabId === 'karnama_cv') path = '/cv';
      else if (tabId === 'install_app') path = '/install';
      else if (tabId === 'admin') path = '/admin';
      else if (tabId === 'how_it_works') path = '/how-it-works';
      else if (tabId === 'notifications') path = '/notifications';

      try {
        window.history.pushState({ tabId }, '', path);
      } catch (e) { }
    }
  };

  // AUTH GUARD: If user is not logged in, force navigation to /login or /register
  // for anything account-specific. Jobs, companies, and a shared job/company
  // link (home, search — which also handles /search?company=X&job=Y deep
  // links — and the companies directory) stay open to guests so a shared
  // link never bounces someone straight to a login wall; actually applying,
  // messaging, or saving still prompts login at the point of that action
  // (see JobDetailModal's handleStartApply for the existing pattern).
  // /install is public too — a link people share before they even have an account.
  const PUBLIC_TABS = ['register', 'login', 'install_app', 'connect', 'home', 'search', 'companies'];
  useEffect(() => {
    if (!user) {
      if (!PUBLIC_TABS.includes(activeTab)) {
        setActiveTab('login');
      }
    }
  }, [user, activeTab]);

  // Subscribe this device for real push notifications (lock screen, app closed) —
  // safe to call every load: no-op if already granted/subscribed, silent if the
  // user denies or the browser lacks support.
  useEffect(() => {
    if (user) {
      pushService.subscribeUserToPush(token).catch(() => { });
    }
  }, [user?.id]);

  // POST-LOGIN NAVIGATION: normal phone login already navigates itself via
  // LoginPage's onLoginSuccess callback, called synchronously right after
  // login() resolves — but a social sign-in completes asynchronously inside
  // AuthContext's onAuthStateChange listener, with no page around to call
  // that callback. Without this, `user` gets set but activeTab just stays on
  // whatever it already was ('login'), so the screen never moves anywhere.
  // A brand-new social account goes to finish its profile; a returning one
  // goes straight home, same as a returning phone login would.
  useEffect(() => {
    if (user && activeTab === 'login') {
      setActiveTab(needsProfileCompletion ? 'register' : 'home');
    }
  }, [user, needsProfileCompletion, activeTab]);

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const initial = getInitialTab();
      const allowedLoggedOut = ['register', 'login', 'install_app', 'connect', 'home', 'search', 'companies'];
      if (!user && !allowedLoggedOut.includes(initial)) {
        setActiveTabState('login');
      } else {
        setActiveTabState(initial);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  const handleCompleteSplash = () => {
    localStorage.setItem('ishkhwaz_splash_seen', 'true');
    setShowSplash(false);
  };

  // Guests browsing a public tab (home/search/companies) still get the
  // normal header/bottom-nav chrome — only the auth pages themselves, and a
  // logged-out user on anything else (which the guard above already redirects
  // to /login before this even renders), hide it.
  const isAuthOrRegisterPage = activeTab === 'register' || activeTab === 'login' || activeTab === 'install_app' || activeTab === 'connect' || (!user && !PUBLIC_TABS.includes(activeTab));

  // Determine active view by selected tab (Register, Login, Home, Search, Requests, Map, Profile)
  const renderTabContent = () => {
    if (activeTab === 'register') {
      const isCompletingSocialProfile = !!user && needsProfileCompletion;
      return (
        <RegisterProfileChoicePage
          isCompletingProfile={isCompletingSocialProfile}
          onBack={() => setActiveTab(isCompletingSocialProfile ? 'home' : 'login')}
          onRegistrationComplete={() => {
            clearNeedsProfileCompletion();
            setActiveTab('home');
          }}
        />
      );
    }

    if (activeTab === 'login') {
      return (
        <LoginPage
          onBack={() => setActiveTab('login')}
          onNavigateRegister={() => setActiveTab('register')}
          onLoginSuccess={() => setActiveTab('home')}
        />
      );
    }

    if (activeTab === 'install_app') {
      return <InstallPage />;
    }

    if (activeTab === 'connect') {
      return <ConnectAuthorizePage onBack={() => setActiveTab(user ? 'home' : 'login')} />;
    }

    if (activeTab === 'post_job') {
      return (
        <PostJobPage
          onBack={() => setActiveTab('home')}
          onSuccess={() => setActiveTab('home')}
        />
      );
    }

    if (activeTab === 'karnama_cv') {
      return (
        <KarnamaCVPage
          onBack={() => setActiveTab('profile')}
          onProceed={(resume) => { setPendingKarnamaResume(resume); setActiveTab('karnama_templates'); }}
        />
      );
    }

    if (activeTab === 'karnama_templates' && pendingKarnamaResume) {
      return (
        <KarnamaTemplatePicker
          baseResume={pendingKarnamaResume}
          onBack={() => setActiveTab('karnama_cv')}
          onDone={() => { setPendingKarnamaResume(null); setActiveTab('profile'); }}
        />
      );
    }

    if (activeTab === 'map') {
      return <JobMapPage />;
    }

    if (activeTab === 'search') {
      return <SearchPage initialTab={getInitialSearchTab()} />;
    }

    if (activeTab === 'plans') {
      return <PlansPage onBack={() => setActiveTab('profile')} />;
    }

    if (activeTab === 'freelancers' || activeTab === 'companies') {
      return <DirectoryPage initialMode={activeTab} onSelectJob={() => setActiveTab('home')} onNavigate={setActiveTab} />;
    }

    if (activeTab === 'my_applications' || activeTab === 'my_company_dashboard') {
      return <Dashboard onNavigate={setActiveTab} />;
    }

    if (activeTab === 'messages') {
      return <MessagesInboxPage />;
    }

    if (activeTab === 'profile') {
      return <UserProfilePage onNavigate={setActiveTab} />;
    }

    if (activeTab === 'admin') {
      return <AdminPage onBack={() => setActiveTab('home')} />;
    }

    if (activeTab === 'how_it_works') {
      return <HowItWorksPage onBack={() => setActiveTab('profile')} />;
    }

    if (activeTab === 'notifications') {
      return <NotificationsPage onBack={() => setActiveTab('home')} />;
    }

    // Default: Home. JobFeed is itself role-branched now — an employer's
    // own home shows freelancers as the primary feed instead of jobs.
    return <JobFeed onNavigate={setActiveTab} />;
  };

  const isMapTab = activeTab === 'map';

  return (
    <div className={`bg-slate-50 text-slate-900 font-vazirmatn antialiased selection:bg-lime-400 selection:text-black flex flex-col justify-between ${isMapTab ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {/* Splash Intro Modal */}
      {showSplash && (
        <SplashOnboarding onComplete={handleCompleteSplash} />
      )}

      {/* Main Layout — inert while the splash is up so a covered login form
          (still mounted underneath, just visually hidden) can't trigger the
          browser's native "Sign In" autofill sheet over the splash. */}
      <div className={isMapTab ? 'flex flex-col flex-1 min-h-0' : ''} {...(showSplash ? { inert: '' } : {})}>
        {isAuthOrRegisterPage ? (
          <main>{renderTabContent()}</main>
        ) : (
          <>
            <DesktopHeaderNav activeTab={activeTab} setActiveTab={setActiveTab} />
            <main
              className={isMapTab ? 'flex-1 min-h-0 overflow-hidden' : 'pb-24 lg:pb-12'}
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
              {renderTabContent()}
            </main>
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop / Windows PCs) */}
      {!isAuthOrRegisterPage && (
        <BottomNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMenu={() => setShowSidebarDrawer(true)}
        />
      )}

      {/* Post Job page is a full route — no modal needed */}

      {/* Footer — only on Home/Dashboard */}
      {!isAuthOrRegisterPage && activeTab === 'home' && (
        <footer className="border-t border-slate-200 py-6 mb-16 md:mb-0 text-center text-xs text-slate-500 bg-white shadow-sm">
          <p className="font-bold text-slate-900">ئیش خواز | Ishkhwaz Job Seeker Marketplace © 2026</p>
          <p className="text-[10px] text-slate-500 mt-1">
            سەکۆی ژمارە یەکی کارکردن و گواستنەوەی سیڤی لە سەرانسەری پارێزگاکانی سلێمانی، هەولێر، دهۆک، هەڵەبجە و کەرکووک.
          </p>
          {user && (user.role === 'owner' || user.role === 'admin') && (
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('admin')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 text-lime-400 text-[10px] font-black hover:bg-slate-800 transition"
              >
                🛡️ پانێلی ئەدمین
              </button>
              <a
                href="https://zeraworld.com/console/ishkhwaz/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black hover:bg-slate-200 transition"
              >
                Zera Console
              </a>
            </div>
          )}
        </footer>
      )}

      {/* Auth Modal, Account Blocked Modal & Toast System */}
      <AuthModal />
      <AccountBlockedModal />
      <ToastSystem />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <MainAppContent />
      </StoreProvider>
    </AuthProvider>
  );
}
