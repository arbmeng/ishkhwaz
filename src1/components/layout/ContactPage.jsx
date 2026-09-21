import React, { useState } from 'react';
import { Mail, Globe, Send, CheckCircle2, MessageSquareText, Phone, User } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { apiService } from '../../services/api';
import { soundService } from '../../services/soundService';

const NK = "'IBM Plex Sans Arabic','Noto Kufi Arabic','Vazirmatn',system-ui,sans-serif";
const TEAL = '#12796b';
const MAX = 2000;

// Real contact details only (the same address the About page and forms already use).
const INFO = [
  { icon: Mail, label: 'ئیمەیڵ', value: 'info@ishkhwaz.iq', href: 'mailto:info@ishkhwaz.iq', ltr: true },
  { icon: Globe, label: 'ماڵپەڕ', value: 'ishkhwaz.zeraworld.com', href: 'https://ishkhwaz.zeraworld.com', ltr: true },
  { icon: Phone, label: 'ژمارەی مۆبایل', value: '+964 772 306 0909', href: 'tel:+9647723060909', ltr: true },
];

const inputCls = 'w-full rounded-2xl bg-[#f6f9f8] border border-transparent px-4 py-3.5 text-[13px] font-medium text-[#111d1a] outline-none transition placeholder:text-[#9aaaa4] focus:bg-white focus:border-[#12796b]/40 focus:shadow-[0_0_0_4px_rgba(18,121,107,.08)]';

export const ContactPage = ({ onBack }) => {
  const { user, token } = useAuth();
  const { addToast } = useStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    const res = await apiService.sendContactMessage({ name: name.trim(), email: email.trim(), phone: phone.replace(/\s/g, ''), message: message.trim() }, token);
    setBusy(false);
    if (res?.success) {
      soundService.playSuccess?.();
      setSent(true);
      setMessage('');
      addToast?.({ title: 'نێردرا ✓', message: 'نامەکەت گەیشت. بە زوویی وەڵامت دەدەینەوە.', type: 'success' });
    } else {
      setError(res?.message || 'ناردن سەرکەوتوو نەبوو. دووبارە هەوڵبدەرەوە.');
    }
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-clip bg-[#f4f7f6] text-right text-[#111d1a]" style={{ fontFamily: NK }}>
      <PageHeader title="پەیوەندیمان پێوە بکە" subtitle="نامەیەکمان بۆ بنێرە و بە زوویی وەڵامت دەدەینەوە" onBack={onBack} />

      <main className="relative mx-auto grid max-w-6xl items-start gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-16">
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-[#12796b]/8 blur-3xl" />

        {/* left: copy + details */}
        <section className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e1eae7] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#0d5c50] shadow-sm">
            <MessageSquareText className="h-3.5 w-3.5" /> پەیوەندی
          </span>
          <h1 className="mt-4 text-[32px] font-bold leading-[1.45] sm:text-[42px] lg:text-[46px]">چۆن یارمەتیت بدەین؟</h1>
          <p className="mt-3 max-w-md text-[14px] leading-8 text-[#60706c]">
            پرسیار، پێشنیار یان کێشەیەکت هەیە؟ نامەیەکمان بۆ بنێرە و تیمی پشتگیری ئیش خواز وەڵامت دەداتەوە.
          </p>

          <ul className="mt-8 space-y-3">
            {INFO.map(({ icon: Icon, label, value, href, ltr }) => (
              <li key={label} className="flex items-center gap-4 rounded-2xl border border-[#e5ece9] bg-white p-3.5 shadow-[0_4px_18px_rgba(13,60,52,.04)]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e7f4f1] text-[#12796b]"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium text-[#7b8e88]">{label}</span>
                  {href
                    ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" dir={ltr ? 'ltr' : undefined} className="block truncate text-[15px] font-bold text-[#111d1a] hover:text-[#12796b]">{value}</a>
                    : <span className="block text-[14px] font-bold leading-7">{value}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* right: form */}
        <section className="relative rounded-[28px] border border-[#e5ece9] bg-white p-5 shadow-[0_24px_60px_rgba(13,60,52,.08)] sm:p-7">
          {sent ? (
            <div className="grid place-items-center gap-4 px-2 py-14 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#e7f4f1] text-[#12796b]"><CheckCircle2 className="h-8 w-8" /></span>
              <h2 className="text-xl font-bold">نامەکەت نێردرا</h2>
              <p className="max-w-xs text-[13px] leading-7 text-[#60706c]">سوپاس! تیمەکەمان نامەکەت دەخوێنێتەوە و لە ڕێگەی ئیمەیڵەکەتەوە وەڵامت دەداتەوە.</p>
              <button type="button" onClick={() => setSent(false)} className="rounded-full bg-[#f4f7f6] px-6 py-3 text-xs font-bold text-[#0d5c50] active:scale-95">نامەیەکی تر بنێرە</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold">ناو<span className="text-rose-500">*</span></span>
                <div className="relative"><User className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aaaa4]" />
                  <input value={name} onChange={e => setName(e.target.value)} required minLength={2} placeholder="ناوی تەواوت" className={`${inputCls} pr-11`} /></div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold">ئیمەیڵ<span className="text-rose-500">*</span></span>
                <div className="relative"><Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aaaa4]" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required dir="ltr" placeholder="name@email.com" className={`${inputCls} pr-11 text-right`} /></div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold">ژمارەی مۆبایل <span className="font-medium text-[#9aaaa4]">(ئارەزوومەندانە)</span></span>
                <div className="relative"><Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aaaa4]" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/^0+/, ''))} dir="ltr" placeholder="750 123 4567" className={`${inputCls} pr-11 text-right font-mono`} /></div>
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-[12px] font-bold">
                  <span>نامە<span className="text-rose-500">*</span></span>
                  <span className="font-mono text-[10px] font-medium text-[#9aaaa4]">{message.length}/{MAX}</span>
                </span>
                <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, MAX))} required minLength={10} rows={6}
                  placeholder="پرسیار، پێشنیار یان کێشەکەت بنووسە..." className={`${inputCls} resize-none leading-7`} />
              </label>

              {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600">{error}</p>}

              <button type="submit" disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(18,121,107,.25)] transition active:scale-[.98] disabled:opacity-70"
                style={{ background: `linear-gradient(135deg, ${TEAL}, #0d5c50)` }}>
                <Send className="h-4 w-4" />{busy ? 'دەنێردرێت...' : 'ناردنی نامە'}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};
