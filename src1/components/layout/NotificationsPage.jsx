import React from 'react';
import { PageHeader } from './PageHeader';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';

// Shared light theme — matches DesktopHeaderNav, UserProfilePage, Dashboard.
const NK = "'Noto Kufi Arabic', 'Vazirmatn', system-ui, sans-serif";
const TEAL = '#641bd9';
const TEAL_SOFT = '#ece7f4';

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'ئێستا';
  if (min < 60) return `${min} خولەک لەمەوپێش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} کاژێر لەمەوپێش`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ڕۆژ لەمەوپێش`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export const NotificationsPage = ({ onBack }) => {
  const { notifications = [], lastSeenNotifAt, markAllRead } = useStore();

  const openNotification = (n) => {
    soundService.playTick?.();
    if (n.target_url) window.location.href = n.target_url;
  };

  return (
    <div dir="rtl" className="min-h-screen pb-16" style={{ background: '#f5f4f7', fontFamily: NK }}>
      <PageHeader
        title="ئاگادارکردنەوەکان"
        onBack={onBack}
        actions={notifications.length > 0 ? [{ icon: CheckCheck, label: 'هەمووی وەک خوێندراوە نیشانبکە', onClick: () => { soundService.playTick?.(); markAllRead?.(); } }] : []}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-8 pt-6 space-y-2.5">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-3 py-24">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: TEAL_SOFT }}>
              <Bell className="w-7 h-7" style={{ color: TEAL }} />
            </div>
            <p className="text-sm font-black text-[#16111d]">هیچ ئاگادارکردنەوەیەک نییە</p>
            <p className="text-xs text-[#7b8e88] max-w-xs">کاتێک شتێکی نوێ ڕووبدات — داواکارییەک، پەیامێک یان گۆڕانکارییەک — لێرەدا دەردەکەوێت.</p>
          </div>
        ) : (
          notifications.map((n, i) => {
            const isUnread = lastSeenNotifAt ? (n?.created_at && n.created_at > lastSeenNotifAt) : true;
            return (
              <button
                key={n.id || i}
                onClick={() => openNotification(n)}
                disabled={!n.target_url}
                className={`w-full text-right p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                  n.target_url ? 'cursor-pointer hover:shadow-sm active:scale-[0.99]' : 'cursor-default'
                } ${isUnread ? 'bg-white border-[#641bd9]/25 shadow-2xs' : 'bg-[#fcfbfd] border-[#eae8ee]'}`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: isUnread ? TEAL_SOFT : '#f2f0f4', color: isUnread ? TEAL : '#a0afa9' }}>
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-black text-[#16111d]">{n.title}</h3>
                    {isUnread && <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: TEAL }} />}
                  </div>
                  {n.body && <p className="text-xs text-[#7b8e88] mt-1 leading-relaxed">{n.body}</p>}
                  <span className="text-[10px] text-[#a0afa9] font-mono mt-1.5 block">{formatWhen(n.created_at)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
