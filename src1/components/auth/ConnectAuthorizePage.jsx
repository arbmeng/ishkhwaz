import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';
import { LoginPage } from './LoginPage';
import { ShieldCheck, Loader2 } from 'lucide-react';

const CLIENT_NAMES = { karnama: 'کارنامە (Karnama)' };

export const ConnectAuthorizePage = ({ onBack }) => {
  const { user, token } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  let pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem('ishkhwaz_pending_oauth') || 'null');
  } catch { /* ignore */ }

  if (!pending?.client_id || !pending?.redirect_uri) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center" dir="rtl">
        <div>
          <p className="text-sm text-slate-600 mb-4">داواکارییەکی پەیوەستکردن نەدۆزرایەوە.</p>
          <button onClick={onBack} className="text-lime-600 font-bold text-sm">گەڕانەوە</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onBack={onBack}
        onNavigateRegister={onBack}
        onLoginSuccess={() => { /* user becomes truthy — this component re-renders itself */ }}
      />
    );
  }

  const clientLabel = CLIENT_NAMES[pending.client_id] || pending.client_id;

  const handleAllow = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/oauth/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ client_id: pending.client_id, redirect_uri: pending.redirect_uri }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) {
        setError(data.message || 'شتێک هەڵەیبوو.');
        setSubmitting(false);
        return;
      }
      sessionStorage.removeItem('ishkhwaz_pending_oauth');
      const url = new URL(pending.redirect_uri);
      url.searchParams.set('code', data.code);
      if (pending.state) url.searchParams.set('state', pending.state);
      window.location.href = url.toString();
    } catch {
      setError('نەتوانرا پەیوەندی بکرێت. تکایە دووبارە هەوڵبدەوە.');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem('ishkhwaz_pending_oauth');
    onBack();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-slate-50" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-lime-100 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-lime-600" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900">{clientLabel} داوای پەیوەستبوون دەکات</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            بە پەسندکردن، {clientLabel} تەنها ناو و ژمارە مۆبایل و ئاستی پلانی ئەژمێرەکەت (بنەڕەت/پرۆ/VIP) دەبینێت —
            وشەی نهێنیت هەرگیز بۆ {clientLabel} نانێردرێت.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 font-mono text-left" dir="ltr">
          {user.name} · {user.phone}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600"
          >
            پاشگەزبوونەوە
          </button>
          <button
            onClick={handleAllow}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-lime-500 text-black flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            پەسندکردن
          </button>
        </div>
      </div>
    </div>
  );
};
