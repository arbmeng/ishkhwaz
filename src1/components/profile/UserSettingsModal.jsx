import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X, User, Phone, Mail, CheckCircle2, ShieldCheck, Sparkles, Loader2,
  LockKeyhole, AtSign, ChevronLeft, Bell, Eye, LogOut, Info
} from 'lucide-react';

export const UserSettingsModal = ({ onClose }) => {
  const { user, updateUserProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setError('');
    setIsSaving(true);
    try {
      const res = await updateUserProfile({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      if (res?.success === false) {
        setError(res.message || 'نوێکردنەوەی زانیاری سەرکەوتوو نەبوو.');
        setIsSaving(false);
        return;
      }
      setIsSaved(true);
      setTimeout(() => onClose(), 1100);
    } catch {
      setError('هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەرەوە.');
      setIsSaving(false);
    }
  };

  return (
    <div className="snap-settings-overlay" dir="rtl">
      <style>{`
        .snap-settings-overlay{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.52);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:0;font-family:'Noto Kufi Arabic','Vazirmatn',system-ui,sans-serif}
        .snap-settings-shell{width:100%;height:100%;background:#f5f5f5;overflow:auto}
        .snap-settings-inner{width:100%;max-width:620px;margin:0 auto;min-height:100%}
        .snap-settings-head{position:sticky;top:0;z-index:4;height:64px;background:rgba(255,255,255,.94);backdrop-filter:blur(16px);border-bottom:1px solid #e9e9e9;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
        .snap-settings-close{width:38px;height:38px;border:0;border-radius:13px;background:#f0f0f0;color:#111;display:flex;align-items:center;justify-content:center}
        .snap-settings-title{font-size:16px;font-weight:950;letter-spacing:-.03em}
        .snap-settings-head-spacer{width:38px}
        .snap-settings-body{padding:18px 14px 32px}
        .snap-settings-profile{background:#fff;border:1px solid #e9e9e9;border-radius:22px;padding:18px;display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .snap-settings-avatar{width:52px;height:52px;border-radius:18px;background:#111;color:#ffdf00;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:950;overflow:hidden}
        .snap-settings-avatar img{width:100%;height:100%;object-fit:cover}
        .snap-settings-profile strong{display:block;font-size:13px;font-weight:950}
        .snap-settings-profile span{display:block;color:#999;font-size:9px;font-weight:700;margin-top:3px;direction:ltr;text-align:right}
        .snap-settings-section{margin:16px 2px 7px;color:#777;font-size:9px;font-weight:950}
        .snap-settings-card{background:#fff;border:1px solid #e9e9e9;border-radius:20px;overflow:hidden}
        .snap-setting-row{width:100%;min-height:58px;background:#fff;border:0;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:11px;padding:10px 13px;text-align:right;color:#111}
        .snap-setting-row:last-child{border-bottom:0}
        .snap-setting-icon{width:34px;height:34px;border-radius:11px;background:#f3f3f3;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
        .snap-setting-copy{flex:1;min-width:0}
        .snap-setting-copy strong{display:block;font-size:10px;font-weight:900}
        .snap-setting-copy span{display:block;font-size:8px;color:#999;font-weight:700;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .snap-setting-row>svg{color:#aaa}
        .snap-form{background:#fff;border:1px solid #e9e9e9;border-radius:20px;padding:15px}
        .snap-field{margin-bottom:13px}
        .snap-field:last-child{margin-bottom:0}
        .snap-field label{display:flex;align-items:center;gap:6px;font-size:9px;font-weight:900;margin-bottom:7px;color:#333}
        .snap-field input{width:100%;height:44px;border:1px solid #e2e2e2;background:#f8f8f8;border-radius:13px;padding:0 12px;outline:none;font-size:11px;font-weight:700;color:#111;box-sizing:border-box}
        .snap-field input:focus{background:#fff;border-color:#111;box-shadow:0 0 0 3px rgba(0,0,0,.06)}
        .snap-save{width:100%;height:46px;border:0;border-radius:14px;background:#111;color:#fff;font-size:10px;font-weight:950;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px}
        .snap-save:hover{background:#242424}
        .snap-save:disabled{opacity:.55}
        .snap-cancel{width:100%;height:42px;border:1px solid #e3e3e3;border-radius:14px;background:#fff;color:#555;font-size:10px;font-weight:900;margin-top:8px}
        .snap-error{background:#fff0f0;border:1px solid #ffd5d5;color:#c22;border-radius:13px;padding:10px;font-size:9px;font-weight:800;margin-top:12px}
        .snap-success{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:30px;text-align:center;background:#fff}
        .snap-success-icon{width:72px;height:72px;border-radius:24px;background:#ffdf00;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:#111}
        .snap-success h3{font-size:19px;font-weight:950;margin:0}
        .snap-success p{font-size:10px;color:#777;font-weight:700;line-height:1.8;margin:7px 0}
        .snap-security{display:flex;gap:10px;align-items:flex-start;background:#111;color:#fff;border-radius:20px;padding:15px;margin-top:12px}
        .snap-security-icon{width:34px;height:34px;border-radius:11px;background:#ffdf00;color:#111;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
        .snap-security strong{font-size:10px;display:block}.snap-security span{font-size:8px;line-height:1.8;color:#aaa;display:block;margin-top:3px}
        @media(min-width:640px){
          .snap-settings-overlay{padding:20px}
          .snap-settings-shell{height:auto;max-height:92vh;max-width:620px;border-radius:28px;box-shadow:0 30px 100px rgba(0,0,0,.35)}
          .snap-settings-inner{min-height:0}
          .snap-settings-head{border-radius:28px 28px 0 0}
          .snap-success{min-height:420px}
        }
      `}</style>

      <div className="snap-settings-shell">
        <div className="snap-settings-inner">
          <header className="snap-settings-head">
            <button className="snap-settings-close" onClick={onClose} aria-label="داخستن"><X className="w-5 h-5" /></button>
            <h2 className="snap-settings-title">ڕێکخستنەکان</h2>
            <span className="snap-settings-head-spacer" />
          </header>

          {isSaved ? (
            <div className="snap-success">
              <div>
                <div className="snap-success-icon"><CheckCircle2 className="w-9 h-9" /></div>
                <h3>پاشەکەوت کرا ✓</h3>
                <p>زانیارییەکانی هەژمارەکەت نوێ کرانەوە.</p>
              </div>
            </div>
          ) : (
            <main className="snap-settings-body">
              <section className="snap-settings-profile">
                <div className="snap-settings-avatar">
                  {user?.avatar ? <img src={user.avatar} alt="" /> : (user?.name || 'ئ').charAt(0)}
                </div>
                <div>
                  <strong>{user?.name || 'بەکارهێنەر'}</strong>
                  <span>{user?.email || '—'}</span>
                </div>
              </section>

              <div className="snap-settings-section">هەژمار</div>
              <form onSubmit={handleSubmit} className="snap-form">
                <div className="snap-field">
                  <label><User className="w-3 h-3" /> ناوی تەواو</label>
                  <input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="snap-field">
                  <label><Phone className="w-3 h-3" /> ژمارەی مۆبایل</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" placeholder="+964 770 000 0000" />
                </div>
                <div className="snap-field">
                  <label><AtSign className="w-3 h-3" /> ئیمەیڵ</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} dir="ltr" type="email" required />
                </div>
                {error && <div className="snap-error">{error}</div>}
                <button className="snap-save" type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isSaving ? 'پاشەکەوتکردن...' : 'پاشەکەوتکردن'}
                </button>
                <button type="button" className="snap-cancel" onClick={onClose} disabled={isSaving}>پاشگەزبوونەوە</button>
              </form>

              <div className="snap-settings-section">خێرا</div>
              <div className="snap-settings-card">
                <div className="snap-setting-row">
                  <span className="snap-setting-icon"><Bell className="w-4 h-4" /></span>
                  <span className="snap-setting-copy"><strong>ئاگادارکردنەوەکان</strong><span>ڕێکخستن و چاودێریکردنی ئاگادارکردنەوەکان لە پڕۆفایل</span></span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
                <div className="snap-setting-row">
                  <span className="snap-setting-icon"><Eye className="w-4 h-4" /></span>
                  <span className="snap-setting-copy"><strong>پڕۆفایل</strong><span>بینینی پڕۆفایل و زانیارییە پیشەییەکانت</span></span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
                <div className="snap-setting-row">
                  <span className="snap-setting-icon"><ShieldCheck className="w-4 h-4" /></span>
                  <span className="snap-setting-copy"><strong>پاراستن</strong><span>زانیارییە سەرەکییەکانت بە شێوەی پارێزراو هەڵدەگیرێن</span></span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              <div className="snap-security">
                <div className="snap-security-icon"><LockKeyhole className="w-4 h-4" /></div>
                <div><strong>هەژمارەکەت پارێزراوە</strong><span>زانیارییەکانت بۆ بەڕێوەبردنی هەژمار و پەیوەندیی پیشەیی بەکاردێن.</span></div>
              </div>

              <div className="snap-settings-section">کارنامە</div>
              <div className="snap-settings-card">
                <div className="snap-setting-row">
                  <span className="snap-setting-icon"><Sparkles className="w-4 h-4" /></span>
                  <span className="snap-setting-copy"><strong>KARNAMA</strong><span>پلاتفۆرمی کار و پڕۆفایلی پیشەیی</span></span>
                  <Info className="w-4 h-4" />
                </div>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
};
