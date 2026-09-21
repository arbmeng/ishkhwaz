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
        .snap-settings-overlay{position:fixed;inset:0;z-index:70;background:rgba(10,5,18,.58);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:12px;font-family:'Noto Kufi Arabic','Vazirmatn',system-ui,sans-serif;color:#161020}
        .snap-settings-shell{width:100%;height:min(94vh,820px);max-width:760px;background:#f6f4f8;border:1px solid rgba(255,255,255,.75);overflow:hidden;border-radius:30px;box-shadow:0 35px 120px rgba(0,0,0,.34);animation:settingsIn .28s cubic-bezier(.22,1,.36,1)}
        .snap-settings-inner{width:100%;height:100%;display:flex;flex-direction:column}
        .snap-settings-head{height:76px;flex:0 0 auto;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);border-bottom:1px solid #e6e3ec;display:flex;align-items:center;justify-content:space-between;padding:0 22px}
        .snap-settings-close{width:42px;height:42px;border:1px solid #e4e1ea;border-radius:14px;background:#f6f4f8;color:#211632;display:flex;align-items:center;justify-content:center;transition:.18s}.snap-settings-close:hover{background:#641bd9;color:#fff;border-color:#641bd9;transform:translateY(-1px)}
        .snap-settings-title{font-size:18px;font-weight:950;letter-spacing:-.04em}.snap-settings-head-spacer{width:42px}
        .snap-settings-body{padding:22px;overflow:auto;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px;align-content:start}
        .snap-settings-profile{grid-column:1/-1;background:linear-gradient(135deg,#fff,#f3faf7);border:1px solid #e3dfea;border-radius:22px;padding:17px;display:flex;align-items:center;gap:13px;box-shadow:0 8px 25px rgba(75,19,165,.05)}
        .snap-settings-avatar{width:58px;height:58px;border-radius:18px;background:linear-gradient(135deg,#641bd9,#4b13a5);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:950;overflow:hidden;flex:0 0 auto;box-shadow:0 8px 20px rgba(75,19,165,.16)}.snap-settings-avatar img{width:100%;height:100%;object-fit:cover}.snap-settings-profile strong{display:block;font-size:13px;font-weight:950}.snap-settings-profile span{display:block;color:#7b8c87;font-size:9px;font-weight:700;margin-top:4px;direction:ltr;text-align:right}
        .snap-settings-section{margin:2px 3px 7px;color:#73837e;font-size:9px;font-weight:950}.snap-settings-card,.snap-form{background:#fff;border:1px solid #e5e1eb;border-radius:20px;overflow:hidden;box-shadow:0 7px 24px rgba(75,19,165,.04)}.snap-form{padding:17px}.snap-field{margin-bottom:14px}.snap-field:last-child{margin-bottom:0}.snap-field label{display:flex;align-items:center;gap:6px;font-size:9px;font-weight:950;margin-bottom:7px;color:#4e3d69}.snap-field input{width:100%;height:46px;border:1px solid #e2dfe8;background:#f8f7fa;border-radius:13px;padding:0 13px;outline:none;font-size:11px;font-weight:700;color:#161020;box-sizing:border-box;transition:.16s}.snap-field input:focus{background:#fff;border-color:#641bd9;box-shadow:0 0 0 4px rgba(100,27,217,.09)}
        .snap-save{width:100%;height:47px;border:0;border-radius:14px;background:linear-gradient(135deg,#641bd9,#4b13a5);color:#fff;font-size:10px;font-weight:950;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:15px;box-shadow:0 9px 22px rgba(75,19,165,.18);transition:.18s}.snap-save:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(75,19,165,.23)}.snap-save:disabled{opacity:.55}.snap-cancel{width:100%;height:42px;border:1px solid #e2dfe8;border-radius:13px;background:#fff;color:#52645e;font-size:10px;font-weight:900;margin-top:8px}
        .snap-error{background:#fff2f2;border:1px solid #ffd8d8;color:#c22;border-radius:13px;padding:10px;font-size:9px;font-weight:800;margin-top:12px}.snap-success{min-height:100%;display:flex;align-items:center;justify-content:center;padding:30px;text-align:center;background:#f9f7fb}.snap-success-icon{width:78px;height:78px;border-radius:25px;background:#ece7f4;margin:0 auto 17px;display:flex;align-items:center;justify-content:center;color:#641bd9}.snap-success h3{font-size:20px;font-weight:950;margin:0}.snap-success p{font-size:10px;color:#777;font-weight:700;line-height:1.8;margin:7px 0}.snap-security{display:flex;gap:10px;align-items:flex-start;background:linear-gradient(135deg,#161020,#42276d);color:#fff;border-radius:20px;padding:15px;box-shadow:0 10px 26px rgba(22,16,32,.12)}.snap-security-icon{width:36px;height:36px;border-radius:12px;background:#ece7f4;color:#641bd9;display:flex;align-items:center;justify-content:center;flex:0 0 auto}.snap-security strong{font-size:10px;display:block}.snap-security span{font-size:8px;line-height:1.8;color:#beb8c9;display:block;margin-top:3px}
        .snap-setting-row{width:100%;min-height:64px;background:#fff;border:0;border-bottom:1px solid #efedf2;display:flex;align-items:center;gap:11px;padding:11px 14px;text-align:right;color:#161020;transition:.16s}.snap-setting-row:last-child{border-bottom:0}.snap-setting-row:hover{background:#f8f6fa}.snap-setting-icon{width:37px;height:37px;border-radius:12px;background:#eee9f5;color:#641bd9;display:flex;align-items:center;justify-content:center;flex:0 0 auto}.snap-setting-copy{flex:1;min-width:0}.snap-setting-copy strong{display:block;font-size:10px;font-weight:950}.snap-setting-copy span{display:block;font-size:8px;color:#87958f;font-weight:700;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.snap-setting-row>svg{color:#a6b5b0}
        @keyframes settingsIn{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
        @media(max-width:680px){.snap-settings-overlay{padding:0;align-items:stretch}.snap-settings-shell{height:100%;max-height:none;border-radius:0;border:0}.snap-settings-head{height:68px;padding:0 15px}.snap-settings-body{display:flex;flex-direction:column;padding:16px 13px calc(28px + env(safe-area-inset-bottom));gap:0}.snap-settings-profile{padding:15px;border-radius:19px}.snap-settings-section{margin-top:15px}.snap-settings-card,.snap-form{border-radius:18px}.snap-settings-title{font-size:16px}}
        @media(prefers-reduced-motion:reduce){.snap-settings-overlay *{animation:none!important;transition:none!important}}
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
