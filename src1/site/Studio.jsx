import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../services/api';
import {
  SITE_PAGES, keyOf, textNodesOf, originalText, normalize, hasChanges,
  withStyle, withText, withHidden, withImage, withDup, resetElement,
} from './siteContent';
import { siteStore } from './siteStore';

// ───────────────────────── The visual website editor ─────────────────────────
// Opened by the Zera console (Ishkhwaz → Website editor) inside an iframe, or by an owner at /?studio=1.
// Click anything on the page → change its text, colours, size, spacing, border, shadow, image or hide it.
// Changes show live; "Save draft" keeps them private, "Publish" puts them on the real website.

const BRAND = '#641bd9';
const TOKEN_KEY = 'ishkhwaz_studio_token';
const PAGE_URLS = { landing: '/', about: '/app/about', contact: '/app/contact', how: '/app/how-it-works', install: '/app/install', login: '/app/login', register: '/app/register' };
const FONT = "'Vazirmatn','IBM Plex Sans Arabic',system-ui,sans-serif";

const SHADOWS = [['', 'بێ سێبەر'], ['0 4px 14px rgba(20,10,50,.10)', 'سووک'], ['0 12px 30px rgba(20,10,50,.18)', 'ناوەند'], ['0 24px 60px rgba(20,10,50,.30)', 'بەهێز'], ['0 0 40px rgba(114,41,232,.55)', 'درەوشاوەی مۆر']];
const GRADIENTS = [['linear-gradient(155deg,#7229e8,#5513bf 48%,#1d0740)', 'مۆر'], ['linear-gradient(135deg,#0f172a,#1e293b)', 'تاریک'], ['linear-gradient(135deg,#f6f3fb,#ece7f4)', 'مۆری سووک'], ['linear-gradient(135deg,#ffffff,#f4f2f8)', 'سپی']];

const toHex = (c) => {
  const m = String(c || '').match(/rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?/);
  if (!m) return '#ffffff';
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
};
const isTransparent = (c) => !c || /rgba\(.*,\s*0\)$/.test(c) || c === 'transparent';
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

const shrinkImage = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1400 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      let q = 0.86, out = cv.toDataURL('image/webp', q);
      while (out.length > 380000 && q > 0.35) { q -= 0.1; out = cv.toDataURL('image/webp', q); }
      out.length <= 400000 ? resolve(out) : reject(new Error('big'));
    };
    img.onerror = reject; img.src = r.result;
  };
  r.onerror = reject; r.readAsDataURL(file);
});

const Btn = ({ children, onClick, tone = 'ghost', disabled, title }) => (
  <button type="button" onClick={onClick} disabled={disabled} title={title}
    style={{ fontFamily: FONT, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 800, border: 0, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .45 : 1,
      color: '#fff', background: tone === 'primary' ? 'linear-gradient(135deg,#8b5cf6,#641bd9)' : tone === 'good' ? '#059669' : 'rgba(255,255,255,.12)' }}>{children}</button>
);

const Row = ({ label, children }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', marginBottom: 9 }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: '#a8a0c0', flexShrink: 0 }}>{label}</span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{children}</span>
  </label>
);
const inp = { fontFamily: FONT, background: '#1b1533', color: '#fff', border: '1px solid #3a2f63', borderRadius: 8, padding: '6px 8px', fontSize: 12, width: 84 };
const Sec = ({ title, children }) => (
  <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
    <div style={{ fontSize: 11, fontWeight: 900, color: '#c4b5fd', marginBottom: 10, letterSpacing: .3 }}>{title}</div>
    {children}
  </div>
);

export default function Studio() {
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } });
  const [page, setPage] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [content, setContentState] = useState(normalize({}));
  const [published, setPublished] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sel, setSel] = useState(null);           // { el, key }
  const [hoverRect, setHoverRect] = useState(null);
  const [selRect, setSelRect] = useState(null);
  const [versions, setVersions] = useState(null);
  const [tick, setTick] = useState(0);            // forces the panel to re-read the element after an edit
  const past = useRef([]), future = useRef([]), lastKey = useRef({ k: '', t: 0 });
  const contentRef = useRef(content);
  contentRef.current = content;

  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${API_BASE_URL}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.message || `Error ${res.status}`);
    return data;
  }, [token]);

  // ── token: from the Zera console (iframe) or the owner's own login
  useEffect(() => {
    const onMsg = (e) => {
      if (!/^https:\/\/([a-z0-9-]+\.)?zeraworld\.com$|^http:\/\/localhost(:\d+)?$/.test(e.origin)) return;
      if (e.data?.type === 'ishkhwaz-studio-token' && typeof e.data.token === 'string' && e.data.token) {
        try { sessionStorage.setItem(TOKEN_KEY, e.data.token); } catch { /* ignore */ }
        setToken(e.data.token);
      }
    };
    window.addEventListener('message', onMsg);
    let ping;
    if (window.parent !== window && !token) {
      const send = () => window.parent.postMessage({ type: 'ishkhwaz-studio-ready' }, '*');
      send(); ping = setInterval(send, 1000);
    } else if (!token) {
      try { const t = localStorage.getItem('ishkhwaz_token'); if (t) setToken(t); } catch { /* ignore */ }
    }
    return () => { window.removeEventListener('message', onMsg); clearInterval(ping); };
  }, [token]);

  // ── which public page is on screen (changes when the owner switches pages)
  useEffect(() => {
    const find = () => document.querySelector('[data-site-root]')?.getAttribute('data-site-root') || null;
    const id = setInterval(() => setPage((p) => { const n = find(); return n && n !== p ? n : p; }), 400);
    setPage(find());
    return () => clearInterval(id);
  }, []);

  const root = () => document.querySelector('[data-site-root]');

  const commit = useCallback((next, groupKey = '') => {
    const now = Date.now();
    if (!(groupKey && lastKey.current.k === groupKey && now - lastKey.current.t < 900)) { past.current.push(contentRef.current); if (past.current.length > 80) past.current.shift(); }
    lastKey.current = { k: groupKey, t: now };
    future.current = [];
    setContentState(next); siteStore.set(page, next); setDirty(true); setTick((t) => t + 1);
  }, [page]);

  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push(contentRef.current); setContentState(p); siteStore.set(page, p); setDirty(true); setTick((t) => t + 1); };
  const redo = () => { const f = future.current.pop(); if (!f) return; past.current.push(contentRef.current); setContentState(f); siteStore.set(page, f); setDirty(true); setTick((t) => t + 1); };

  // ── load the draft of the current page
  useEffect(() => {
    if (!token || !page) return;
    let live = true;
    setSel(null); past.current = []; future.current = []; setError(''); setStatus('باردەکرێت...');
    api(`/admin/site-content?page=${page}`).then((d) => {
      if (!live) return;
      const draft = normalize(d.draft);
      setContentState(draft); setPublished(normalize(d.published)); siteStore.set(page, draft); setDirty(false); setStatus(d.has_draft ? 'ڕەشنووسێکی هەڵگیراو کرایەوە' : '');
    }).catch((e) => { if (live) { setError(/Forbidden|403/.test(e.message) ? 'ئەم ئەکاونتە ڕێگەی دەستکاریکردنی نییە. دەبێت خاوەن یان ئەدمین بیت.' : e.message); setStatus(''); } });
    return () => { live = false; };
  }, [token, page, api]);

  // ── pick elements on the page
  const inStudio = (t) => !!t?.closest?.('[data-studio-ui]');
  const pickAt = (target) => {
    const r = root();
    if (!r || !target || inStudio(target) || !r.contains(target) || target === r) return null;
    const clone = target.closest?.('[data-sc-clone]');
    if (clone?.__scSrc?.isConnected) return clone.__scSrc;
    return target;
  };
  useEffect(() => {
    if (!token || preview || error) return undefined;
    const onClick = (e) => {
      if (inStudio(e.target)) return;
      const el = pickAt(e.target);
      if (!el) return;
      e.preventDefault(); e.stopPropagation();
      setSel({ el, key: keyOf(el, root()) });
    };
    const onMove = (e) => { const el = pickAt(e.target); setHoverRect(el && el !== sel?.el ? el.getBoundingClientRect() : null); };
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); save(); }
      else if (e.key === 'Escape') setSel(null);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('click', onClick, true); document.removeEventListener('mousemove', onMove, true); document.removeEventListener('keydown', onKey, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, preview, error, sel, page, content]);

  // keep the selection outline glued to the element (scroll, resize, layout changes)
  useEffect(() => {
    let raf; let last = '';
    const loop = () => {
      if (sel?.el?.isConnected) {
        const r = sel.el.getBoundingClientRect();
        const s = [r.top, r.left, r.width, r.height].map(Math.round).join(',');
        if (s !== last) { last = s; setSelRect({ top: r.top, left: r.left, width: r.width, height: r.height }); }
      } else if (sel) setSel(null); else setSelRect(null);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sel]);

  // ── save / publish
  const save = async () => {
    setBusy(true); setStatus('هەڵدەگیرێت...');
    try { await api('/admin/site-content/save', { method: 'POST', body: JSON.stringify({ page, content: contentRef.current }) }); setDirty(false); setStatus('ڕەشنووس هەڵگیرا ✓'); }
    catch (e) { setStatus(''); setError(e.message); }
    setBusy(false);
  };
  const publish = async () => {
    if (!window.confirm('گۆڕانکارییەکان لەسەر ماڵپەڕی ڕاستەقینە بڵاو بکرێنەوە؟')) return;
    setBusy(true); setStatus('بڵاودەکرێتەوە...');
    try {
      await api('/admin/site-content/save', { method: 'POST', body: JSON.stringify({ page, content: contentRef.current }) });
      await api('/admin/site-content/publish', { method: 'POST', body: JSON.stringify({ page }) });
      setPublished(contentRef.current); setDirty(false); setStatus('بڵاوکرایەوە ✓ — ئێستا لەسەر ماڵپەڕە');
      try { localStorage.removeItem(`ishkhwaz_site_${page}`); } catch { /* ignore */ }
    } catch (e) { setStatus(''); setError(e.message); }
    setBusy(false);
  };
  const discard = async () => {
    if (!window.confirm('هەموو گۆڕانکارییە هەڵنەگیراوەکان و ڕەشنووسەکە بسڕدرێنەوە و بگەڕێیتەوە بۆ ئەوەی بڵاوکراوەتەوە؟')) return;
    try { await api('/admin/site-content/discard', { method: 'POST', body: JSON.stringify({ page }) }); commit(normalize(published)); setDirty(false); setStatus('گەڕایەوە بۆ وەشانی بڵاوکراو'); } catch (e) { setError(e.message); }
  };
  const openHistory = async () => { try { setVersions((await api(`/admin/site-content/history?page=${page}`)).versions || []); } catch (e) { setError(e.message); } };
  const restore = async (id) => { try { await api('/admin/site-content/restore', { method: 'POST', body: JSON.stringify({ id }) }); const d = await api(`/admin/site-content?page=${page}`); commit(normalize(d.draft)); setVersions(null); setStatus('وەشانی کۆن گەڕێنرایەوە (ڕەشنووس)'); } catch (e) { setError(e.message); } };

  const goPage = (p) => {
    if (dirty && !window.confirm('گۆڕانکارییە هەڵنەگیراوەکانت هەیە. بڕۆیت؟')) return;
    window.location.assign(PAGE_URLS[p] + '?studio=1');
  };
  const exit = () => { try { sessionStorage.removeItem('ishkhwaz_studio'); } catch { /* ignore */ } window.name = ''; window.location.assign(window.location.pathname); };

  // ── the selected element
  const el = sel?.el, key = sel?.key;
  const cs = useMemo(() => (el?.isConnected ? getComputedStyle(el) : null), [el, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const texts = useMemo(() => (el?.isConnected ? textNodesOf(el) : []), [el, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = (p) => content.style[key]?.[p] ?? '';
  const setP = (p, v, grouped = true) => commit(withStyle(content, key, p, v), grouped ? `s:${key}:${p}` : '');
  const isHidden = content.hidden.includes(key);
  const changed = key && (content.style[key] || isHidden || content.dup.includes(key) || content.img[key] || Object.keys(content.text).some((k) => k.startsWith(key + '#')));

  const uploadImage = async (file) => {
    try { commit(withImage(content, key, await shrinkImage(file))); } catch { setStatus('وێنەکە زۆر گەورەیە یان نەخوێندرایەوە'); }
  };

  const panelW = 340;
  const hex = (p, fallback) => cur(p) && cur(p).startsWith('#') ? cur(p) : toHex(cs?.[fallback]);

  if (!token) return (
    <div data-studio-ui style={{ position: 'fixed', inset: 'auto 0 0 0', zIndex: 99999, padding: 14, background: '#1d0740', color: '#fff', fontFamily: FONT, textAlign: 'center', fontSize: 13 }} dir="rtl">
      دەبێت لە ڕێگەی کۆنسۆڵی Zera ئەم دەستکاریکەرە بکەیتەوە، یان وەک خاوەن بچیتە ژوورەوە و ئەم لینکە دووبارە بکەرەوە.
    </div>
  );

  return (
    <div data-studio-ui dir="rtl" style={{ fontFamily: FONT }}>
      {/* outlines */}
      {!preview && hoverRect && <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 99990, top: hoverRect.top, left: hoverRect.left, width: hoverRect.width, height: hoverRect.height, outline: '2px dashed rgba(139,92,246,.9)', outlineOffset: -1, background: 'rgba(139,92,246,.06)' }} />}
      {!preview && selRect && <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 99991, top: selRect.top, left: selRect.left, width: selRect.width, height: selRect.height, outline: `3px solid ${BRAND}`, outlineOffset: -1, boxShadow: '0 0 0 9999px rgba(20,8,50,.10)' }} />}

      {/* top bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 52, zIndex: 99995, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'linear-gradient(90deg,#1d0740,#2a0d66)', color: '#fff', boxShadow: '0 -6px 24px rgba(0,0,0,.35)' }}>
        <strong style={{ fontSize: 13, marginLeft: 6 }}>دەستکاریکەری ماڵپەڕ</strong>
        <select value={page || ''} onChange={(e) => goPage(e.target.value)} style={{ ...inp, width: 150 }}>
          {Object.entries(SITE_PAGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Btn onClick={undo} disabled={!past.current.length} title="Ctrl+Z">↶ گەڕانەوە</Btn>
        <Btn onClick={redo} disabled={!future.current.length} title="Ctrl+Shift+Z">↷ دووبارە</Btn>
        <Btn onClick={() => { setPreview((v) => !v); setSel(null); }}>{preview ? '✎ دەستکاری' : '👁 پێشبینین'}</Btn>
        <span style={{ flex: 1, fontSize: 12, color: '#c4b5fd', textAlign: 'center' }}>{error ? <span style={{ color: '#fca5a5' }}>{error}</span> : status || (dirty ? 'گۆڕانکاری هەڵنەگیراو هەیە' : '')}</span>
        <Btn onClick={openHistory}>مێژوو</Btn>
        <Btn onClick={discard} disabled={busy}>سڕینەوەی ڕەشنووس</Btn>
        <Btn onClick={save} disabled={busy || !dirty} title="Ctrl+S">هەڵگرتنی ڕەشنووس</Btn>
        <Btn tone="good" onClick={publish} disabled={busy || (!dirty && !hasChanges(content) && !status)}>بڵاوکردنەوە</Btn>
        <Btn onClick={exit}>✕</Btn>
      </div>

      {/* side panel */}
      {!preview && (
        <div style={{ position: 'fixed', top: 0, bottom: 52, left: collapsed ? -panelW + 26 : 0, width: panelW, zIndex: 99994, background: '#130c2b', color: '#fff', overflowY: 'auto', transition: 'left .2s', boxShadow: '6px 0 28px rgba(0,0,0,.4)' }}>
          <button onClick={() => setCollapsed((v) => !v)} style={{ position: 'absolute', top: 8, right: 4, width: 22, height: 22, borderRadius: 6, border: 0, background: 'rgba(255,255,255,.12)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>{collapsed ? '›' : '‹'}</button>
          {!collapsed && (!el ? (
            <div style={{ padding: 20, fontSize: 13, lineHeight: 2, color: '#c9c2e6' }}>
              <div style={{ fontWeight: 900, color: '#fff', fontSize: 14, marginBottom: 6 }}>چۆن بەکاری دەهێنیت؟</div>
              کرتە لە هەر شتێکی پەڕەکە بکە — دەق، کارت، دوگمە، وێنە یان بەش — تا دەستکاری بکەیت.<br />
              بۆ هەڵبژاردنی کارتی گەورەتر، دوای هەڵبژاردن دوگمەی «↑ باوک» بەکاربهێنە.<br />
              گۆڕانکارییەکان ڕاستەوخۆ دەبینرێن. دوای تەواوبوون «بڵاوکردنەوە» بکە.
            </div>
          ) : (
            <>
              <div style={{ padding: '14px 44px 10px 14px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ fontSize: 12, fontWeight: 900 }}>&lt;{el.tagName.toLowerCase()}&gt; <span style={{ color: '#a8a0c0', fontWeight: 600 }}>{(typeof el.className === 'string' ? el.className.split(' ')[0] : '') || ''}</span></div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <Btn onClick={() => { const p = el.parentElement; if (p && p !== root() && root().contains(p)) setSel({ el: p, key: keyOf(p, root()) }); }}>↑ باوک</Btn>
                  <Btn onClick={() => commit(withHidden(content, key, !isHidden))}>{isHidden ? 'پیشاندان' : 'شاردنەوە'}</Btn>
                  <Btn onClick={() => commit(withDup(content, key, true))} title="کۆپیکردنی ئەم توخمە (بۆ زیادکردنی کارتی نوێ)">＋ کۆپی</Btn>
                  {content.dup.includes(key) && <Btn onClick={() => commit(withDup(content, key, false))}>− لابردنی کۆپی ({content.dup.filter((k) => k === key).length})</Btn>}
                  <Btn onClick={() => commit(resetElement(content, key))} disabled={!changed}>ڕێکخستنەوە</Btn>
                </div>
              </div>

              {texts.length > 0 && (
                <Sec title="دەق">
                  {texts.map((n, i) => (
                    <textarea key={i} value={n.nodeValue.trim()} rows={Math.min(6, Math.max(2, Math.ceil(n.nodeValue.length / 34)))}
                      onChange={(e) => commit(withText(content, key, i, e.target.value, originalText(n).trim()), `t:${key}:${i}`)}
                      style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 8, lineHeight: 1.8, resize: 'vertical' }} />
                  ))}
                </Sec>
              )}

              {el.tagName === 'IMG' && (
                <Sec title="وێنە">
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} style={{ fontSize: 11, color: '#c9c2e6', marginBottom: 8 }} />
                  <input placeholder="یان لینکی https://..." defaultValue="" onKeyDown={(e) => { if (e.key === 'Enter' && /^https:\/\//.test(e.target.value)) commit(withImage(content, key, e.target.value.trim())); }} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
                  {content.img[key] && <div style={{ marginTop: 8 }}><Btn onClick={() => commit(withImage(content, key, ''))}>گەڕانەوە بۆ وێنەی ئەسڵی</Btn></div>}
                </Sec>
              )}

              <Sec title="ڕەنگ">
                <Row label="باکگراوند">
                  <input type="color" value={hex('backgroundColor', 'backgroundColor')} onChange={(e) => setP('backgroundColor', e.target.value)} style={{ width: 34, height: 28, border: 0, background: 'none' }} />
                  <Btn onClick={() => { setP('backgroundColor', '', false); setP('backgroundImage', '', false); }}>×</Btn>
                </Row>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 }}>
                  {GRADIENTS.map(([g, l]) => <button key={l} title={l} onClick={() => setP('backgroundImage', g, false)} style={{ width: 44, height: 26, borderRadius: 7, border: cur('backgroundImage') === g ? '2px solid #fff' : '1px solid #3a2f63', background: g, cursor: 'pointer' }} />)}
                </div>
                <Row label="ڕەنگی دەق"><input type="color" value={hex('color', 'color')} onChange={(e) => setP('color', e.target.value)} style={{ width: 34, height: 28, border: 0, background: 'none' }} /><Btn onClick={() => setP('color', '', false)}>×</Btn></Row>
                <Row label="ڕوونی (opacity)"><input type="range" min="0" max="1" step="0.05" value={cur('opacity') || cs?.opacity || 1} onChange={(e) => setP('opacity', e.target.value)} /></Row>
              </Sec>

              <Sec title="نووسین">
                <Row label="قەبارە (px)"><input type="number" min="8" max="120" value={cur('fontSize') ? num(cur('fontSize')) : Math.round(num(cs?.fontSize))} onChange={(e) => setP('fontSize', e.target.value ? `${e.target.value}px` : '')} style={inp} /></Row>
                <Row label="ئەستووری"><select value={cur('fontWeight') || ''} onChange={(e) => setP('fontWeight', e.target.value, false)} style={inp}><option value="">ئەسڵی</option>{[400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}</select></Row>
                <Row label="بەرزی هێڵ"><input type="number" step="0.1" min="0.8" max="3" value={cur('lineHeight') || ''} placeholder={String(Math.round(num(cs?.lineHeight) / (num(cs?.fontSize) || 16) * 10) / 10 || '')} onChange={(e) => setP('lineHeight', e.target.value)} style={inp} /></Row>
                <Row label="ڕێکخستن">{[['right', 'ڕاست'], ['center', 'ناوەڕاست'], ['left', 'چەپ']].map(([v, l]) => <Btn key={v} onClick={() => setP('textAlign', cur('textAlign') === v ? '' : v, false)} tone={cur('textAlign') === v ? 'primary' : 'ghost'}>{l}</Btn>)}</Row>
              </Sec>

              <Sec title="بۆکس و دەور">
                <Row label="خڕی گۆشە (px)"><input type="number" min="0" max="120" value={cur('borderRadius') ? num(cur('borderRadius')) : Math.round(num(cs?.borderTopLeftRadius))} onChange={(e) => setP('borderRadius', e.target.value !== '' ? `${e.target.value}px` : '')} style={inp} /></Row>
                <Row label="بۆشایی ناوەوە"><input type="number" min="0" max="160" value={cur('padding') ? num(cur('padding')) : Math.round(num(cs?.paddingTop))} onChange={(e) => setP('padding', e.target.value !== '' ? `${e.target.value}px` : '')} style={inp} /></Row>
                <Row label="بۆشایی دەرەوە"><input type="number" min="0" max="160" value={cur('margin') ? num(cur('margin')) : Math.round(num(cs?.marginTop))} onChange={(e) => setP('margin', e.target.value !== '' ? `${e.target.value}px` : '')} style={inp} /></Row>
                <Row label="ئەستووری هێڵ"><input type="number" min="0" max="12" value={cur('borderWidth') ? num(cur('borderWidth')) : Math.round(num(cs?.borderTopWidth))} onChange={(e) => { setP('borderWidth', e.target.value !== '' ? `${e.target.value}px` : ''); if (!cur('borderStyle')) setP('borderStyle', 'solid', false); }} style={inp} /></Row>
                <Row label="جۆری هێڵ"><select value={cur('borderStyle') || ''} onChange={(e) => setP('borderStyle', e.target.value, false)} style={inp}><option value="">ئەسڵی</option><option value="solid">تەواو</option><option value="dashed">پچڕپچڕ</option><option value="dotted">خاڵخاڵ</option></select></Row>
                <Row label="ڕەنگی هێڵ"><input type="color" value={hex('borderColor', 'borderTopColor')} onChange={(e) => setP('borderColor', e.target.value)} style={{ width: 34, height: 28, border: 0, background: 'none' }} /></Row>
                <Row label="سێبەر"><select value={cur('boxShadow') || ''} onChange={(e) => setP('boxShadow', e.target.value, false)} style={{ ...inp, width: 120 }}>{SHADOWS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}</select></Row>
              </Sec>
            </>
          ))}
        </div>
      )}

      {/* history */}
      {versions && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(8,3,24,.7)', display: 'grid', placeItems: 'center' }} onClick={() => setVersions(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 380, maxHeight: '70vh', overflowY: 'auto', background: '#130c2b', color: '#fff', borderRadius: 16, padding: 18 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>وەشانە بڵاوکراوەکانی پێشوو</div>
            {versions.length === 0 && <div style={{ color: '#a8a0c0', fontSize: 13 }}>هێشتا هیچ وەشانێکی پێشوو نییە.</div>}
            {versions.map((v) => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: 12 }}>
                <span dir="ltr">{v.created_at}</span><Btn onClick={() => restore(v.id)}>گەڕاندنەوە</Btn>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
