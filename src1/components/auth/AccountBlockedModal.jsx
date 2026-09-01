import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Ban, PhoneCall, UserPlus, ShieldAlert, AlertCircle, LogOut, Trash2 } from 'lucide-react';
import { socketService } from '../../services/socketService';

export const AccountBlockedModal = () => {
  const { user, logout, openAuthModal, blockReason, clearBlockReason } = useAuth();

  // Also listen for real-time block/delete events via WebSocket
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

    socketService.on('user_blocked', handleUserBlocked);
    socketService.on('user_status_changed', handleUserBlocked);
    socketService.on('user_deleted', (data) => {
      if (String(data?.id) === String(user?.id)) {
        localStorage.setItem('ishkhwaz_block_reason', 'deleted');
        logout();
      }
    });

    return () => {
      socketService.off('user_blocked');
      socketService.off('user_status_changed');
      socketService.off('user_deleted');
    };
  }, [user]);

  // Show if we have a blockReason (even after user is null / logged out)
  if (!blockReason) return null;

  const isDeleted = blockReason === 'deleted';

  const handleCreateNewAccount = () => {
    clearBlockReason();
    logout();
    setTimeout(() => openAuthModal('freelancer', 'register'), 100);
  };

  const handleDismiss = () => {
    clearBlockReason();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 select-none font-vazirmatn animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(18px)' }}
    >
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
        style={{ background: isDeleted ? 'rgba(251,146,60,0.15)' : 'rgba(225,29,72,0.15)' }} />

      <div
        className="relative w-full max-w-md rounded-3xl p-7 text-center space-y-5 overflow-hidden"
        style={{
          background: isDeleted ? '#110e06' : '#110608',
          border: `2px solid ${isDeleted ? 'rgba(251,146,60,0.4)' : 'rgba(225,29,72,0.4)'}`,
          boxShadow: isDeleted
            ? '0 0 60px rgba(251,146,60,0.25)'
            : '0 0 60px rgba(225,29,72,0.25)',
        }}
      >

        {/* Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ background: isDeleted ? '#fb923c' : '#e11d48' }} />
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: isDeleted
                ? 'linear-gradient(135deg,#f97316,#dc2626)'
                : 'linear-gradient(135deg,#e11d48,#9f1239)',
            }}
          >
            {isDeleted
              ? <Trash2 className="w-8 h-8 text-white" />
              : <Ban className="w-8 h-8 text-white" />
            }
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-mono"
          style={{
            background: isDeleted ? 'rgba(251,146,60,0.12)' : 'rgba(225,29,72,0.12)',
            border: `1px solid ${isDeleted ? 'rgba(251,146,60,0.3)' : 'rgba(225,29,72,0.3)'}`,
            color: isDeleted ? '#fb923c' : '#fb7185',
          }}>
          <ShieldAlert className="w-3.5 h-3.5" />
          {isDeleted ? 'ACCOUNT DELETED' : 'ACCOUNT SUSPENDED'}
        </div>

        {/* Title & description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">
            {isDeleted ? 'هەژمارەکەت سڕایەوە!' : 'هەژمارەکەت ڕاگیراوە!'}
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {isDeleted
              ? 'هەژمارەکەت لەلایەن سەرپەرشتیارەکانی ئیش خوازەوە بە تەواوی سڕایەوە. داتاکانت لە سیستەمدا نەماون.'
              : 'هەژمارەکەت لەلایەن سەرپەرشتیارەکانی ئیش خوازەوە بە مووچی یان بە هەمیشەیی ڕاگیراوە بەهۆی سەرپێچیکردنی مەرجەکان.'}
          </p>
        </div>

        {/* Reason box */}
        <div
          className="rounded-2xl p-3.5 text-right text-xs space-y-1.5"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${isDeleted ? 'rgba(251,146,60,0.2)' : 'rgba(225,29,72,0.2)'}`,
          }}
        >
          <span className="font-bold flex items-center gap-1.5"
            style={{ color: isDeleted ? '#fb923c' : '#fb7185' }}>
            <AlertCircle className="w-3.5 h-3.5" />
            تێبینی:
          </span>
          <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {isDeleted
              ? '« ئەم ژمارە تەلەفۆنە چی مۆڵەتی نییە دووبارە چوونەژوورەوەی بکات. »'
              : '« دەسەڵاتی گەیشتن بە کارەکان و ناردنی سیڤی بۆ ئەم ژمارە تەلەفۆنە لە سیستەمدا بەربەستکراوە. »'}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          {/* New account — only sensible if blocked, not deleted */}
          <button
            onClick={handleCreateNewAccount}
            className="w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#0d1117', boxShadow: '0 4px 20px rgba(34,197,94,0.2)' }}
          >
            <UserPlus className="w-4 h-4" />
            دروستکردنی هەژمارێکی نوێ
          </button>

          <div className="grid grid-cols-2 gap-2">
            <a href="tel:+9647500000000"
              className="py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              <PhoneCall className="w-3.5 h-3.5" />
              کال سەنتەر
            </a>
            <a href="https://wa.me/9647500000000" target="_blank" rel="noopener noreferrer"
              className="py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
              💬 واتسئاپ
            </a>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full py-2 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
          >
            <LogOut className="w-3.5 h-3.5" />
            داخستن
          </button>
        </div>

      </div>
    </div>
  );
};
