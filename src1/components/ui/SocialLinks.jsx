import React from 'react';
import { Globe, Instagram, Facebook, Linkedin, Twitter, Youtube, Github, MessageCircle, Send, Music2, Palette } from 'lucide-react';

// One list drives the edit form, the profile page and the public profile pages.
export const SOCIAL_FIELDS = [
  { key: 'website', label: 'ماڵپەڕ', placeholder: 'example.com', icon: Globe, color: '#12796b' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+964 750 123 4567', icon: MessageCircle, color: '#25d366' },
  { key: 'instagram', label: 'Instagram', placeholder: '@username', icon: Instagram, color: '#e1306c' },
  { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/yourpage', icon: Facebook, color: '#1877f2' },
  { key: 'telegram', label: 'Telegram', placeholder: '@username', icon: Send, color: '#229ed9' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@username', icon: Music2, color: '#111111' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/name', icon: Linkedin, color: '#0a66c2' },
  { key: 'twitter', label: 'X (Twitter)', placeholder: '@username', icon: Twitter, color: '#111111' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@channel', icon: Youtube, color: '#ff0000' },
  { key: 'github', label: 'GitHub', placeholder: 'github.com/username', icon: Github, color: '#24292f' },
  { key: 'behance', label: 'Behance', placeholder: 'behance.net/username', icon: Palette, color: '#1769ff' },
];

export const parseSocial = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { const p = JSON.parse(raw); return p && typeof p === 'object' && !Array.isArray(p) ? p : {}; } catch { return {}; }
};

const handle = (v) => String(v).trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\//i, '').replace(/\/+$/, '');
const isUrl = (v) => /^https?:\/\//i.test(String(v).trim());

// Turns whatever was typed (handle, @handle, or a full link) into a real link.
export const socialUrl = (key, value) => {
  const v = String(value || '').trim();
  if (!v) return '';
  if (isUrl(v)) return v;
  switch (key) {
    case 'whatsapp': return `https://wa.me/${v.replace(/\D/g, '')}`;
    case 'instagram': return `https://instagram.com/${handle(v)}`;
    case 'telegram': return `https://t.me/${handle(v)}`;
    case 'tiktok': return `https://tiktok.com/@${handle(v)}`;
    case 'twitter': return `https://x.com/${handle(v)}`;
    default: return `https://${v.replace(/^\/+/, '')}`;
  }
};

// Round icon buttons for every link that is filled in.
export const SocialLinks = ({ links, className = '', size = 'md', onDark = false }) => {
  const data = parseSocial(links);
  const items = SOCIAL_FIELDS.filter(f => data[f.key]);
  if (!items.length) return null;
  const box = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map(({ key, label, icon: Icon, color }) => (
        <a key={key} href={socialUrl(key, data[key])} target="_blank" rel="noopener noreferrer nofollow" aria-label={label} title={label}
          onClick={(e) => e.stopPropagation()}
          className={`${box} grid place-items-center rounded-full border transition active:scale-95 hover:-translate-y-0.5 ${onDark ? 'border-white/20 bg-white/10 text-white hover:bg-white/20' : 'border-[#e5ece9] bg-white hover:shadow-md'}`}
          style={onDark ? undefined : { color }}>
          <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
        </a>
      ))}
    </div>
  );
};
