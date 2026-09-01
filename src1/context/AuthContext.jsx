import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService, API_BASE_URL } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { realtimeService } from '../services/realtimeService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Synchronous session initialization from localStorage
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem('ishkhwaz_user');
        return savedUser ? JSON.parse(savedUser) : null;
      } catch (e) {
        console.error('Failed to restore user session', e);
      }
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('ishkhwaz_token') || null;
      } catch (e) {
        console.error('Failed to restore token', e);
      }
    }
    return null;
  });

  const [registeredUsers, setRegisteredUsers] = useState([]);

  // Auth modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState('freelancer');
  const [authMode, setAuthMode] = useState('register');
  const [pendingAction, setPendingAction] = useState(null);

  // Block/delete reason — persisted so the warning shows even after logout clears user
  const [blockReason, setBlockReason] = useState(() => {
    try { return localStorage.getItem('ishkhwaz_block_reason') || null; } catch { return null; }
  });

  // Set for exactly one render after a brand-new Google/Facebook/Apple
  // account is created, so the app can route them to finish their profile
  // (role, governorate, etc.) instead of dropping them straight on the home
  // feed the way a returning user would land. App.jsx watches this and
  // clears it once it's acted on.
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  const logout = () => {
    setUser(null);
    setToken(null);
    setPendingAction(null);
    localStorage.removeItem('ishkhwaz_user');
    localStorage.removeItem('ishkhwaz_token');
    // Note: intentionally do NOT clear ishkhwaz_block_reason here —
    // the block warning modal needs to read it after logout.
  };

  // Live session verification — poll every 30 s to detect blocks/deletions server-side
  useEffect(() => {
    const refreshProfile = async () => {
      if (!token) return;
      if (token.startsWith('eyJhbGci')) return; // skip hardcoded owner token
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // 401 = token expired / deleted account, 403 = blocked / suspended
        if (res.status === 401 || res.status === 403) {
          const reason = res.status === 403 ? 'blocked' : 'deleted';
          localStorage.setItem('ishkhwaz_block_reason', reason);
          setBlockReason(reason);
          logout();
          return;
        }

        const data = await res.json().catch(() => null);
        if (data && data.user) {
          const u = data.user;
          // Check status field returned by backend
          if (u.status === 'blocked' || u.status === 'frozen' || u.status === 'suspended') {
            localStorage.setItem('ishkhwaz_block_reason', 'blocked');
            setBlockReason('blocked');
            logout();
            return;
          }
          if (u.status === 'deleted' || u.status === 'deactivated') {
            localStorage.setItem('ishkhwaz_block_reason', 'deleted');
            setBlockReason('deleted');
            logout();
            return;
          }
          setUser(prev => ({ ...prev, ...u,
            walletBalance: u.wallet_balance ?? prev?.walletBalance,
            governorate:   u.governorate   ?? prev?.governorate,
            subDistrict:   u.sub_district  ?? prev?.subDistrict,
          }));
        }
      } catch (e) { /* network error — stay logged in */ }
    };

    refreshProfile(); // run immediately on mount / token change
    const interval = setInterval(refreshProfile, 30_000); // poll every 30 s
    return () => clearInterval(interval);
  }, [token]);

  // Real-time connection follows the session — connects the moment a user/
  // token exist (fresh login or restored from storage) and tears down on logout.
  useEffect(() => {
    if (user?.id && token) {
      realtimeService.connect(user.id, token, user.role);
    } else {
      realtimeService.disconnect();
    }
  }, [user?.id, token, user?.role]);

  // Sync active user to storage
  useEffect(() => {
    if (user) {
      localStorage.setItem('ishkhwaz_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ishkhwaz_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('ishkhwaz_token', token);
    } else {
      localStorage.removeItem('ishkhwaz_token');
    }
  }, [token]);

  // Picks up the Supabase session after a Google/Facebook/Apple sign-in
  // redirect returns here, hands its token to our own backend for
  // verification, and — same as login()/register() — sets our own session
  // from the result. Supabase's session itself is only ever a middleman for
  // the OAuth handshake, so we sign out of it immediately after; our own
  // token is what the rest of the app runs on from here.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session?.access_token) return;

      try {
        const apiRes = await apiService.socialLogin(session.access_token);
        if (apiRes && apiRes.success && apiRes.user) {
          setToken(apiRes.token);
          setUser({
            ...apiRes.user,
            walletBalance: apiRes.user.wallet_balance ?? 0,
            subDistrict:   apiRes.user.sub_district ?? '',
          });
          setIsAuthModalOpen(false);
          setNeedsProfileCompletion(!!apiRes.isNewUser);
        }
      } finally {
        supabase.auth.signOut();
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAuthModal = (role = 'freelancer', mode = 'register') => {
    setAuthRole(role);
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const login = async (phoneOrEmail, password) => {
    const cleanInput = String(phoneOrEmail).trim();
    const cleanPass  = String(password).trim();

    // ── Real DB auth ──
    const apiRes = await apiService.login(cleanInput, cleanPass);
    if (apiRes && apiRes.success && apiRes.user) {
      setToken(apiRes.token);
      setUser({
        ...apiRes.user,
        walletBalance: apiRes.user.wallet_balance ?? 0,
        subDistrict:   apiRes.user.sub_district ?? '',
      });
      setIsAuthModalOpen(false);
      return apiRes.user;
    }

    logout();
    throw new Error(apiRes?.message || 'ژمارەی تەلەفۆن یان وشەی نهێنی هەڵەیە.');
  };

  // Real Database Registration
  const register = async (registerData) => {
    const apiRes = await apiService.register(registerData);

    if (apiRes && apiRes.success && apiRes.user) {
      const userData = apiRes.user;
      setToken(apiRes.token || apiRes.access_token || 'token_' + Date.now());
      setUser(userData);
      setIsAuthModalOpen(false);
      return userData;
    }

    throw new Error(apiRes?.message || 'تۆمارکردن سەرکەوتوو نەبوو. تکایە دووبارە هەوڵبدەرەوە.');
  };

  const updateUserProfile = async (updatedFields) => {
    if (!user) return { success: false, message: 'Not logged in.' };

    const previousUser = user;
    const optimistic = { ...user, ...updatedFields };
    setUser(optimistic);

    // Only the fields actually being changed go over the wire — api.js
    // forwards just these, and the backend falls back to each field's
    // existing DB value for anything omitted. `optimistic` above is for
    // local UI state only; sending it as the request body would silently
    // drag along every other stored field (including any large images the
    // account already has) on every single save.
    const res = await apiService.updateProfile(updatedFields, token);
    if (!res || res.success === false) {
      setUser(previousUser); // revert — the save didn't actually persist
      return { success: false, message: res?.message || 'پاشەکەوتکردن سەرکەوتوو نەبوو.' };
    }

    if (res.user) setUser(prev => ({ ...prev, ...res.user }));
    return { success: true, user: res.user };
  };

  const requireAuth = (callback, description = '', requiredRole = null) => {
    if (user) {
      callback(user);
      return true;
    } else {
      setPendingAction({ callback, description, requiredRole });
      setIsAuthModalOpen(true);
      return false;
    }
  };

  const updateWalletBalance = (newBalance) => {
    if (user) {
      const updated = { ...user, walletBalance: newBalance };
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      registeredUsers,
      setRegisteredUsers,
      login,
      register,
      logout,
      requireAuth,
      isAuthModalOpen,
      setIsAuthModalOpen,
      authRole,
      setAuthRole,
      authMode,
      setAuthMode,
      openAuthModal,
      pendingAction,
      setPendingAction,
      updateUserProfile,
      updateWalletBalance,
      blockReason,
      clearBlockReason: () => { setBlockReason(null); localStorage.removeItem('ishkhwaz_block_reason'); },
      needsProfileCompletion,
      clearNeedsProfileCompletion: () => setNeedsProfileCompletion(false),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
