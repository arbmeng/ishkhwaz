// Visual-editor engine: finds elements by a stable key, applies saved changes (text, style, hidden, image) to the live DOM,
// and can undo them. Nothing here touches React state, so the pages themselves stay ordinary components.

export const SITE_PAGES = {
  landing: { label: 'پەڕەی سەرەکی', path: '/' },
  about: { label: 'دەربارەی ئیش خواز', path: '/about' },
  contact: { label: 'پەیوەندی', path: '/contact' },
  how: { label: 'چۆنیەتی کارکردن', path: '/how-it-works' },
  install: { label: 'دابەزاندنی ئەپ', path: '/install' },
  login: { label: 'چوونەژوورەوە', path: '/login' },
  register: { label: 'تۆمارکردن', path: '/register' },
};

export const emptyContent = () => ({ v: 1, text: {}, style: {}, hidden: [], img: {}, dup: [] });
export const normalize = (c) => ({ ...emptyContent(), ...(c && typeof c === 'object' && !Array.isArray(c) ? c : {}), text: { ...(c?.text || {}) }, style: { ...(c?.style || {}) }, hidden: [...(c?.hidden || [])], img: { ...(c?.img || {}) }, dup: [...(c?.dup || [])] });

const kebab = (p) => p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const sig = (n) => n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/)[0].replace(/[^\w-]/g, '') : '');

// "section.ish-hero:0>div.ish-hero-in:0>h1:0" — the path of element types from the page root, counting same-looking siblings.
export const keyOf = (el, root) => {
  const parts = [];
  for (let n = el; n && n !== root; n = n.parentElement) {
    const parent = n.parentElement;
    if (!parent) return null;
    const s = sig(n);
    let idx = 0;
    for (const sib of parent.children) { if (sib === n) break; if (!sib.hasAttribute('data-sc-clone') && sig(sib) === s) idx++; }
    parts.unshift(`${s}:${idx}`);
  }
  return parts.length ? parts.join('>') : null;
};

export const resolveKey = (root, key) => {
  let cur = root;
  for (const part of String(key).split('>')) {
    const cut = part.lastIndexOf(':');
    const s = part.slice(0, cut), i = Number(part.slice(cut + 1));
    cur = [...cur.children].filter((c) => !c.hasAttribute('data-sc-clone') && sig(c) === s)[i];
    if (!cur) return null;
  }
  return cur;
};

// Direct text children that actually contain text (the editable strings of an element).
export const textNodesOf = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim() !== '');

const ORIG_TEXT = new WeakMap();   // Text node -> its original value
const ORIG_SRC = new WeakMap();    // <img> -> original src
const APPLIED = new WeakMap();     // root -> { texts:Set, els:Set, imgs:Set, clones:[] }

const styleTag = () => {
  let t = document.getElementById('site-content-css');
  if (!t) { t = document.createElement('style'); t.id = 'site-content-css'; document.head.appendChild(t); }
  return t;
};

export const clearApplied = (root) => {
  const a = APPLIED.get(root);
  if (!a) return;
  a.texts.forEach((n) => { if (ORIG_TEXT.has(n)) n.nodeValue = ORIG_TEXT.get(n); });
  a.imgs.forEach((im) => { if (ORIG_SRC.has(im)) im.setAttribute('src', ORIG_SRC.get(im)); });
  a.clones?.forEach((cl) => cl.remove());
  a.els.forEach((el) => el.removeAttribute('data-sc'));
  APPLIED.delete(root);
};

export const applyContent = (root, content) => {
  if (!root) return;
  clearApplied(root);
  const c = normalize(content);
  const a = { texts: new Set(), els: new Set(), imgs: new Set(), clones: [] };
  const rules = [];
  let n = 0;
  const tag = (el) => { let id = el.getAttribute('data-sc'); if (!id) { id = 'k' + (++n); el.setAttribute('data-sc', id); a.els.add(el); } return id; };

  for (const [key, props] of Object.entries(c.style)) {
    const el = resolveKey(root, key);
    if (!el) continue;
    const body = Object.entries(props).map(([p, v]) => `${kebab(p)}:${v} !important`).join(';');
    if (body) rules.push(`[data-sc="${tag(el)}"]{${body}}`);
  }
  for (const key of c.hidden) {
    const el = resolveKey(root, key);
    if (el) rules.push(`[data-sc="${tag(el)}"]{display:none !important}`);
  }
  for (const [tk, value] of Object.entries(c.text)) {
    const at = tk.lastIndexOf('#');
    const el = resolveKey(root, tk.slice(0, at));
    const node = el && textNodesOf(el)[Number(tk.slice(at + 1))];
    if (!node) continue;
    if (!ORIG_TEXT.has(node)) ORIG_TEXT.set(node, node.nodeValue);
    // keep the original leading/trailing spaces so words never glue to neighbouring elements
    const orig = ORIG_TEXT.get(node);
    node.nodeValue = (orig.match(/^\s*/)[0]) + value + (orig.match(/\s*$/)[0]);
    a.texts.add(node);
  }
  for (const [key, src] of Object.entries(c.img)) {
    const el = resolveKey(root, key);
    if (!el || el.tagName !== 'IMG') continue;
    if (!ORIG_SRC.has(el)) ORIG_SRC.set(el, el.getAttribute('src'));
    el.setAttribute('src', src);
    el.removeAttribute('srcset');
    a.imgs.add(el);
  }
  styleTag().textContent = rules.join('\n');
  // extra copies of an element ("add another card"): made last, from the already-edited original, and ignored by the key logic
  const lastAfter = new Map();
  for (const key of c.dup) {
    const el = resolveKey(root, key);
    if (!el || !el.parentNode) continue;
    const clone = el.cloneNode(true);
    clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    clone.setAttribute('data-sc-clone', '1');
    clone.__scSrc = el;
    (lastAfter.get(el) || el).after(clone);
    lastAfter.set(el, clone);
    a.clones.push(clone);
  }
  APPLIED.set(root, a);
};

export const originalText = (node) => (ORIG_TEXT.has(node) ? ORIG_TEXT.get(node) : node.nodeValue);

// Editor helpers that return a NEW content object (so undo/redo is just keeping old ones).
export const withStyle = (content, key, prop, value) => {
  const c = normalize(content);
  const cur = { ...(c.style[key] || {}) };
  if (value === '' || value == null) delete cur[prop]; else cur[prop] = String(value);
  if (Object.keys(cur).length) c.style[key] = cur; else delete c.style[key];
  return c;
};
export const withText = (content, key, index, value, original) => {
  const c = normalize(content);
  const k = `${key}#${index}`;
  if (value === original) delete c.text[k]; else c.text[k] = value;
  return c;
};
export const withHidden = (content, key, hidden) => {
  const c = normalize(content);
  c.hidden = c.hidden.filter((k) => k !== key);
  if (hidden) c.hidden.push(key);
  return c;
};
export const withImage = (content, key, src) => {
  const c = normalize(content);
  if (src) c.img[key] = src; else delete c.img[key];
  return c;
};
export const resetElement = (content, key) => {
  const c = normalize(content);
  delete c.style[key];
  c.hidden = c.hidden.filter((k) => k !== key);
  delete c.img[key];
  c.dup = c.dup.filter((k) => k !== key);
  for (const k of Object.keys(c.text)) if (k.startsWith(key + '#')) delete c.text[k];
  return c;
};
export const withDup = (content, key, add) => {
  const c = normalize(content);
  if (add) c.dup.push(key); else { const i = c.dup.lastIndexOf(key); if (i >= 0) c.dup.splice(i, 1); }
  return c;
};
export const hasChanges = (c) => { const n = normalize(c); return !!(Object.keys(n.text).length || Object.keys(n.style).length || n.hidden.length || Object.keys(n.img).length || n.dup.length); };
