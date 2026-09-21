// "Share" = copy the link. Works even when the async clipboard API is blocked (older iOS, non-secure context).
export const copyLink = async (url) => {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); return true; }
  } catch { /* fall through to the textarea trick */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
    document.body.appendChild(ta);
    ta.focus();
    ta.setSelectionRange(0, url.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
};

export const shareLink = async (url, addToast, message = 'لینکەکە کۆپیکرا.') => {
  const ok = await copyLink(url);
  addToast?.(ok
    ? { title: 'لینک کۆپیکرا ✓', message, type: 'success' }
    : { title: 'کۆپیکردن سەرنەکەوت', message: url, type: 'warning', duration: 12000 });
  return ok;
};
