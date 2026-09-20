import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Ban,
  PhoneCall,
  UserPlus,
  ShieldAlert,
  AlertCircle,
  LogOut,
  Trash2,
  X,
  MessageCircle,
  ArrowLeft,
  LockKeyhole,
} from 'lucide-react';
import { socketService } from '../../services/socketService';

export const AccountBlockedModal = () => {
  const { user, logout, openAuthModal, blockReason, clearBlockReason } = useAuth();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const handleUserBlocked = (data) => {
      if (
        String(data?.id) === String(user.id) ||
        String(data?.phone) === String(user.phone)
      ) {
        if (data.status === 'blocked' || data.status === 'frozen' || data.status === 'suspended') {
          localStorage.setItem('ishkhwaz_block_reason', 'blocked');
          logout();
        } else if (data.status === 'deleted' || data.status === 'deactivated') {
          localStorage.setItem('ishkhwaz_block_reason', 'deleted');
          logout();
        }
      }
    };

    const handleUserDeleted = (data) => {
      if (String(data?.id) === String(user?.id)) {
        localStorage.setItem('ishkhwaz_block_reason', 'deleted');
        logout();
      }
    };

    socketService.on('user_blocked', handleUserBlocked);
    socketService.on('user_status_changed', handleUserBlocked);
    socketService.on('user_deleted', handleUserDeleted);

    return () => {
      socketService.off('user_blocked');
      socketService.off('user_status_changed');
      socketService.off('user_deleted');
    };
  }, [user, logout]);

  if (!blockReason) return null;

  const isDeleted = blockReason === 'deleted';

  const handleCreateNewAccount = () => {
    setClosing(true);
    clearBlockReason();
    logout();
    setTimeout(() => openAuthModal('freelancer', 'register'), 120);
  };

  const handleDismiss = () => {
    setClosing(true);
    setTimeout(() => clearBlockReason(), 160);
  };

  const accent = isDeleted ? '#f97316' : '#e11d48';
  const accentSoft = isDeleted ? 'rgba(249,115,22,.12)' : 'rgba(225,29,72,.12)';
  const panelBg = isDeleted ? '#120d08' : '#10070a';

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-blocked-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 font-vazirmatn"
      style={{
        opacity: closing ? 0 : 1,
        transition: 'opacity 160ms ease',
        background: 'rgba(3,7,6,.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="absolute inset-0"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-[470px] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-48px)] overflow-y-auto rounded-[30px] sm:rounded-[34px] p-5 sm:p-7 text-center"
        style={{
          background: `linear-gradient(180deg,${panelBg} 0%,#090b0b 100%)`,
          border: `1px solid ${isDeleted ? 'rgba(249,115,22,.28)' : 'rgba(225,29,72,.28)'}`,
          boxShadow: `0 30px 100px ${isDeleted ? 'rgba(249,115,22,.16)' : 'rgba(225,29,72,.16)'}, 0 10px 40px rgba(0,0,0,.45)`,
        }}
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="داخستن"
          className="absolute top-4 left-4 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
          style={{ color: 'rgba(255,255,255,.42)' }}
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[90px] pointer-events-none"
          style={{ background: accentSoft }}
        />

        <div className="relative">
          <div className="relative mx-auto w-[92px] h-[92px] flex items-center justify-center mb-5">
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{ background: accentSoft }}
            />
            <div
              className="absolute inset-2 rounded-[28px] opacity-40"
              style={{ border: `1px solid ${accent}` }}
            />
            <div
              className="relative w-[68px] h-[68px] rounded-[24px] flex items-center justify-center"
              style={{
                background: isDeleted
                  ? 'linear-gradient(145deg,#fb923c,#c2410c)'
                  : 'linear-gradient(145deg,#fb7185,#9f1239)',
                boxShadow: `0 14px 35px ${isDeleted ? 'rgba(249,115,22,.22)' : 'rgba(225,29,72,.22)'}`,
              }}
            >
              {isDeleted
                ? <Trash2 className="w-8 h-8 text-white" strokeWidth={2.2} />
                : <Ban className="w-8 h-8 text-white" strokeWidth={2.2} />
              }
            </div>
          </div>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wide mb-4"
            style={{
              background: accentSoft,
              border: `1px solid ${isDeleted ? 'rgba(249,115,22,.24)' : 'rgba(225,29,72,.24)'}`,
              color: isDeleted ? '#fb923c' : '#fb7185',
            }}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {isDeleted ? 'ACCOUNT DELETED' : 'ACCOUNT SUSPENDED'}
          </div>

          <h2
            id="account-blocked-title"
            className="text-[23px] sm:text-[27px] font-black tracking-tight text-white"
          >
            {isDeleted ? 'هەژمارەکەت سڕایەوە' : 'هەژمارەکەت ڕاگیراوە'}
          </h2>

          <p className="mt-3 mx-auto max-w-[390px] text-xs sm:text-[13px] leading-6 font-bold text-white/45">
            {isDeleted
              ? 'هەژمارەکەت لەلایەن سەرپەرشتیارەکانی ئیشخوازەوە سڕاوەتەوە و داتاکانت چیتر بەردەست نین.'
              : 'هەژمارەکەت بەهۆی سەرپێچیکردنی مەرجەکانی سیستەم بە کاتی یان بە هەمیشەیی ڕاگیراوە.'}
          </p>

          <div
            className="mt-6 rounded-2xl p-4 text-right"
            style={{
              background: 'rgba(255,255,255,.035)',
              border: `1px solid ${isDeleted ? 'rgba(249,115,22,.16)' : 'rgba(225,29,72,.16)'}`,
            }}
          >
            <div
              className="flex items-center gap-2 text-[11px] font-black mb-2"
              style={{ color: isDeleted ? '#fb923c' : '#fb7185' }}
            >
              <AlertCircle className="w-4 h-4" />
              تێبینی گرنگ
            </div>
            <p className="text-[11px] leading-6 font-bold text-white/38">
              {isDeleted
                ? 'ئەم هەژمارە چی مۆڵەتی نییە دووبارە چوونەژوورەوەی بکات.'
                : 'دەسەڵاتی گەیشتن بە کارەکان و ناردنی سیڤی بۆ ئەم هەژمارەیە لە سیستەمدا بەربەستکراوە.'}
            </p>
          </div>

          <div className="mt-5 space-y-2.5">
            {!isDeleted && (
              <button
                type="button"
                onClick={handleCreateNewAccount}
                className="w-full min-h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[.98]"
                style={{
                  background: 'linear-gradient(135deg,#34d399,#16a34a)',
                  color: '#06120d',
                  boxShadow: '0 12px 30px rgba(34,197,94,.18)',
                }}
              >
                <UserPlus className="w-5 h-5" />
                دروستکردنی هەژمارێکی نوێ
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <a
                href="tel:+9647500000000"
                className="min-h-12 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 transition-all hover:bg-white/[.07] active:scale-[.98]"
                style={{
                  background: 'rgba(255,255,255,.035)',
                  border: '1px solid rgba(255,255,255,.08)',
                  color: 'rgba(255,255,255,.58)',
                }}
              >
                <PhoneCall className="w-4 h-4" />
                کال سەنتەر
              </a>

              <a
                href="https://wa.me/9647500000000"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-12 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 transition-all hover:bg-emerald-500/10 active:scale-[.98]"
                style={{
                  background: 'rgba(34,197,94,.06)',
                  border: '1px solid rgba(34,197,94,.16)',
                  color: '#4ade80',
                }}
              >
                <MessageCircle className="w-4 h-4" />
                واتسئاپ
              </a>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full min-h-11 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all hover:bg-white/[.04] active:scale-[.98]"
              style={{ color: 'rgba(255,255,255,.32)' }}
            >
              <LogOut className="w-3.5 h-3.5" />
              داخستن
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] font-bold text-white/20">
            <LockKeyhole className="w-3 h-3" />
            زانیاری هەژمارەکەت بە شێوەی پارێزراو مامەڵەی لەگەڵ دەکرێت
          </div>
        </div>
      </div>
    </div>
  );
};
