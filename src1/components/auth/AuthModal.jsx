import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from './LoginPage';
import { RegisterProfileChoicePage } from './RegisterProfileChoicePage';

// Thin overlay used when a guest action needs a signed-in user (e.g. posting
// a job, sending an offer). There's no separate "choose account type" step —
// just the real login page and the real sign-up wizard, same as the routed
// /login and /register pages.
export const AuthModal = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, authMode, setAuthMode } = useAuth();

  if (!isAuthModalOpen) return null;

  const close = () => setIsAuthModalOpen(false);

  if (authMode === 'login') {
    return (
      <LoginPage
        onBack={close}
        onNavigateRegister={() => setAuthMode('register')}
        onLoginSuccess={close}
      />
    );
  }

  return (
    <RegisterProfileChoicePage
      onBack={close}
      onRegistrationComplete={close}
    />
  );
};
