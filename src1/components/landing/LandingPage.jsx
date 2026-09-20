import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  Download,
  FileText,
  MapPin,
  Menu,
  MessageCircle,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';

const TEAL = '#12796b';

const NAV_ITEMS = [
  { id: 'home', label: 'سەرەتا' },
  { id: 'how', label: 'چۆن کار دەکات؟' },
  { id: 'features', label: 'تایبەتمەندییەکان' },
  { id: 'tutorial', label: 'ڕێبەر' },
];

const STEPS = [
  {
    number: '01',
    icon: UserRound,
    title: 'هەژمارەکەت دروست بکە',
    text: 'وەک بەکارهێنەری کار یان کۆمپانیا خۆت تۆمار بکە و پڕۆفایلێکی پیشەیی دروست بکە.',
  },
  {
    number: '02',
    icon: Search,
    title: 'ئەوەی دەتەوێت بدۆزەرەوە',
    text: 'بەپێی جۆری کار، شار، قەزا و ناوچە بگەڕێ و هەلی گونجاو بدۆزەرەوە.',
  },
  {
    number: '03',
    icon: FileText,
    title: 'سیڤی و داواکاری بنێرە',
    text: 'سیڤی خۆت ئامادە بکە، پۆزیشنی گونجاو هەڵبژێرە و بە چەند هەنگاوێک داواکاری بنێرە.',
  },
  {
    number: '04',
    icon: MessageCircle,
    title: 'پەیوەندی و دەستپێکردن',
    text: 'لەگەڵ کۆمپانیاکان پەیوەندی بکە، وەڵامەکان ببینە و هەلی کار بە ئاسانترین شێوە بەدوادا بچۆ.',
  },
];

const FEATURES = [
  { icon: MapPin, title: 'گەڕانی ناوچەیی', text: 'کارەکان بەپێی شار، قەزا و ناوچە بە وردی بدۆزەرەوە.' },
  { icon: FileText, title: 'CV ـی پیشەیی', text: 'سیڤی خۆت بە شێوەیەکی پاک و پیشەیی دروست و بەڕێوەببە.' },
  { icon: Building2, title: 'پڕۆفایلی کۆمپانیا', text: 'کۆمپانیاکان دەتوانن براند و هەلی کارەکانیان پیشان بدەن.' },
  { icon: MessageCircle, title: 'پەیام و پەیوەندی', text: 'پەیوەندی لەگەڵ کارخواز و کۆمپانیاکان بە شێوەیەکی ڕێکخراو.' },
  { icon: ShieldCheck, title: 'ئەمنی و متمانە', text: 'هەنگاوەکانی تۆمارکردن و بەڕێوەبردنی هەژمار بە گرنگییەوە دانراون.' },
  { icon: Sparkles, title: 'ئەزموونی نوێ', text: 'ڕووکاری خێرا، سادە و responsive بۆ مۆبایل، تابلێت و کۆمپیوتەر.' },
];

const FAQ = [
  ['ئیش خواز چییە؟', 'ئیش خواز پلاتفۆرمێکی کارە کە کارخوازان و کۆمپانیاکان لە یەک شوێن کۆدەکاتەوە بۆ دۆزینەوە و پێشکەشکردنی هەلی کار.'],
  ['چۆن کارێک بدۆزمەوە؟', 'هەژمار دروست بکە، پڕۆفایلەکەت تەواو بکە، دواتر لە گەڕان و فلتەرەکان بۆ دۆزینەوەی کارێکی گونجاو بەکاربهێنە.'],
  ['کۆمپانیاکان چۆن کار دادەنێن؟', 'کۆمپانیا دەتوانێت پڕۆفایلی خۆی دروست بکات، هەلی کار دابنێت و داواکارییەکان و کاندیدەکان بەڕێوەببات.'],
  ['ئایا دەتوانم لە مۆبایل بەکاریبهێنم؟', 'بەڵێ. وێبسایت بۆ شاشەی بچووک و گەورە دیزاین کراوە و دەتوانیت وەک PWA لەسەر ئامێرەکەت دایبمەزرێنیت.'],
];

function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return true;
  };

  return { canInstall: !!deferredPrompt, installed, install };
}

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function ScrollButton({ target, children, className = '' }) {
  return <button onClick={() => scrollToId(target)} className={className}>{children}</button>;
}

// The site's front door (/ for signed-out visitors). `onNavigate('/login')` and
// `onNavigate('/register')` are mapped to the app's own tabs by App.jsx.
export default function LandingPage({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const { canInstall, installed, install } = useInstallPrompt();

  const stats = useMemo(() => [
    { value: '24/7', label: 'گەڕانی بەردەوام' },
    { value: '100%', label: 'بۆ مۆبایل و وێب' },
    { value: '1', label: 'شوێن بۆ هەموو هەنگاوەکان' },
  ], []);

  const navigate = (path) => {
    if (typeof onNavigate === 'function') onNavigate(path);
    else window.location.href = path;
  };

  const handleInstall = async () => {
    const worked = await install();
    if (!worked) setShowInstallHelp(true);
  };

  return (
    <div dir="rtl" className="ish-home">
      <style>{`
        :root{--ish-teal:${TEAL};--ish-deep:#073f38;--ish-ink:#0b1715;--ish-muted:#60706c;--ish-bg:#f7faf9;--ish-line:#dfe9e6}
        .ish-home{min-height:100vh;background:var(--ish-bg);color:var(--ish-ink);font-family:'IBM Plex Sans Arabic','Vazirmatn',system-ui,sans-serif;overflow-x:hidden;scroll-behavior:smooth;line-height:1.7;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
        .ish-home h1,.ish-home h2,.ish-home h3,.ish-home h4{font-weight:700}
        .ish-home *,.ish-home *:before,.ish-home *:after{box-sizing:border-box}
        .ish-home button{font:inherit}.ish-container{width:min(1180px,calc(100% - 40px));margin:auto}
        .ish-nav{position:fixed;inset:0 0 auto;z-index:50;background:rgba(247,250,249,.78);backdrop-filter:blur(22px);border-bottom:1px solid rgba(210,225,221,.7);padding-top:env(safe-area-inset-top)}
        .ish-nav-inner{height:76px;display:flex;align-items:center;justify-content:space-between;gap:20px;position:relative}.ish-brand{display:flex;align-items:center;gap:11px;color:inherit;text-decoration:none;font-weight:950;background:none;border:0;padding:0;cursor:pointer;text-align:right}.ish-brand img{width:43px;height:43px;object-fit:contain;border-radius:13px}.ish-brand strong{font-size:19px}.ish-brand span{display:block;color:#72827e;font-size:10px;font-weight:700;margin-top:-3px}
        .ish-links{display:flex;align-items:center;gap:4px}.ish-links button{border:0;background:transparent;padding:10px 14px;border-radius:12px;color:#4f625d;cursor:pointer;font-weight:750}.ish-links button:hover{background:#e9f3f0;color:var(--ish-deep)}
        .ish-nav-actions{display:flex;align-items:center;gap:9px}.ish-btn{border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:9px;border-radius:14px;padding:12px 17px;font-weight:850;transition:.22s ease}.ish-btn:hover{transform:translateY(-2px)}.ish-primary{background:var(--ish-teal);color:white;box-shadow:0 12px 28px rgba(18,121,107,.2)}.ish-soft{background:#e7f2ef;color:var(--ish-deep)}.ish-menu{display:none;border:1px solid var(--ish-line);background:white;border-radius:12px;padding:9px;cursor:pointer}
        .ish-hero{position:relative;padding:145px 0 80px;overflow:hidden;background:radial-gradient(circle at 82% 24%,rgba(34,166,145,.14),transparent 30%),linear-gradient(180deg,#fafffe 0%,#f7faf9 100%)}.ish-glow{position:absolute;border-radius:999px;filter:blur(2px);pointer-events:none}.ish-glow.a{width:420px;height:420px;background:rgba(20,153,134,.09);top:-170px;right:-130px}.ish-glow.b{width:300px;height:300px;background:rgba(35,190,165,.07);bottom:-150px;left:-100px}
        .ish-hero-grid{display:grid;grid-template-columns:1.06fr .94fr;gap:70px;align-items:center}.ish-kicker{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid #cfe3de;background:#eff8f6;color:#176b60;border-radius:999px;font-size:12px;font-weight:850}.ish-hero h1{font-size:clamp(36px,5.2vw,64px);line-height:1.35;margin:18px 0 20px;max-width:760px}.ish-hero h1 span{color:var(--ish-teal)}.ish-hero p{font-size:17px;line-height:2.1;color:#60706c;max-width:650px;margin:0}.ish-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}.ish-trust{display:flex;align-items:center;gap:18px;margin-top:25px;color:#71817d;font-size:12px;font-weight:750}.ish-trust-item{display:flex;align-items:center;gap:7px}.ish-trust svg{color:var(--ish-teal)}
        .ish-hero-card{position:relative}.ish-window{background:rgba(255,255,255,.88);border:1px solid #dce9e5;border-radius:30px;padding:16px;box-shadow:0 35px 90px rgba(16,67,60,.15);transform:rotate(1deg)}.ish-window-top{height:36px;display:flex;align-items:center;gap:6px;padding:0 5px}.ish-dot{width:8px;height:8px;border-radius:50%;background:#d7e3df}.ish-preview{border-radius:22px;background:linear-gradient(145deg,#eaf7f4,#f9fcfb);padding:20px;min-height:390px;display:flex;flex-direction:column;gap:14px}.ish-searchbox{height:54px;background:white;border:1px solid #dce8e5;border-radius:15px;display:flex;align-items:center;gap:10px;padding:0 15px;color:#8a9995;font-size:12px}.ish-job-card{background:white;border:1px solid #e1ebe8;border-radius:19px;padding:17px;box-shadow:0 10px 30px rgba(24,67,60,.06)}.ish-job-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.ish-company{display:flex;align-items:center;gap:10px}.ish-company-logo{width:38px;height:38px;border-radius:12px;background:#dff1ed;display:grid;place-items:center;color:var(--ish-teal)}.ish-job-title{font-weight:900;font-size:14px}.ish-job-meta{color:#81908c;font-size:10px;margin-top:3px}.ish-pill{font-size:9px;font-weight:850;color:#176b60;background:#e8f5f2;padding:6px 8px;border-radius:999px}.ish-job-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:13px}
        .ish-stats{margin-top:-25px;position:relative;z-index:2}.ish-stats-card{background:white;border:1px solid #e0e9e6;border-radius:23px;padding:19px;display:grid;grid-template-columns:repeat(3,1fr);box-shadow:0 18px 50px rgba(14,54,48,.08)}.ish-stat{text-align:center;padding:7px;border-left:1px solid #e6eeec}.ish-stat:last-child{border-left:0}.ish-stat strong{display:block;font-size:25px;color:var(--ish-deep)}.ish-stat span{font-size:11px;color:#788984;font-weight:750}
        .ish-section{padding:100px 0}.ish-section.alt{background:white}.ish-center{text-align:center}.ish-eyebrow{color:var(--ish-teal);font-weight:900;font-size:12px}.ish-title{font-size:clamp(26px,3.6vw,40px);line-height:1.5;margin:10px 0 14px}.ish-subtitle{color:#6a7a76;line-height:1.95;max-width:650px;margin:0 auto}
        .ish-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-top:48px}.ish-step{position:relative;padding:25px;border:1px solid var(--ish-line);background:#fbfdfc;border-radius:23px;min-height:245px;transition:.25s}.ish-step:hover{transform:translateY(-6px);border-color:#bcdcd5;box-shadow:0 20px 50px rgba(18,121,107,.09)}.ish-step-num{font-size:11px;color:#a0afab;font-weight:900}.ish-step-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:#e6f3f0;color:var(--ish-teal);margin:25px 0 17px}.ish-step h3{margin:0 0 8px;font-size:17px}.ish-step p{margin:0;color:#71807c;line-height:1.9;font-size:12px}
        .ish-features{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:45px}.ish-feature{padding:24px;border-radius:22px;background:#f8fbfa;border:1px solid #e3ece9}.ish-feature-icon{width:44px;height:44px;border-radius:14px;background:#e5f3ef;color:var(--ish-teal);display:grid;place-items:center;margin-bottom:16px}.ish-feature h3{margin:0 0 7px;font-size:16px}.ish-feature p{margin:0;color:#71807c;line-height:1.8;font-size:12px}
        .ish-tutorial{display:grid;grid-template-columns:.9fr 1.1fr;gap:60px;align-items:center}.ish-tutorial-card{background:linear-gradient(150deg,#0b5e53,#073e38);border-radius:30px;padding:28px;color:white;min-height:430px;position:relative;overflow:hidden;box-shadow:0 30px 70px rgba(7,63,56,.22)}.ish-tutorial-card:before{content:"";position:absolute;width:260px;height:260px;border-radius:50%;background:rgba(57,199,177,.12);right:-80px;top:-90px}.ish-phone{width:230px;margin:20px auto 0;background:#f7fffd;border:7px solid #0b4d45;border-radius:28px;padding:10px;color:#143a35;box-shadow:0 30px 60px rgba(0,0,0,.25)}.ish-phone-screen{height:300px;border-radius:19px;background:#eaf6f3;padding:13px}.ish-phone-logo{width:42px;height:42px;border-radius:13px;background:white;margin:0 auto 18px;display:grid;place-items:center}.ish-phone-line{height:10px;background:white;border-radius:99px;margin:9px 0}.ish-phone-line.short{width:62%}.ish-phone-btn{height:38px;background:var(--ish-teal);border-radius:12px;margin-top:20px}.ish-tutorial-list{display:grid;gap:12px;margin-top:28px}.ish-tutorial-row{display:flex;gap:14px;align-items:flex-start;padding:17px;border:1px solid var(--ish-line);border-radius:17px;background:white}.ish-check{flex:0 0 auto;width:29px;height:29px;border-radius:10px;background:#e4f2ef;color:var(--ish-teal);display:grid;place-items:center}.ish-tutorial-row strong{display:block;font-size:14px;margin-bottom:3px}.ish-tutorial-row span{font-size:11px;line-height:1.8;color:#788782}
        .ish-roles{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:45px}.ish-role{border-radius:27px;padding:30px;background:white;border:1px solid var(--ish-line);display:flex;gap:20px;align-items:flex-start;box-shadow:0 12px 35px rgba(15,50,45,.04)}.ish-role.job{background:linear-gradient(135deg,#f0faf8,#fff)}.ish-role.company{background:linear-gradient(135deg,#f5f7ff,#fff)}.ish-role-icon{width:55px;height:55px;flex:0 0 auto;border-radius:17px;display:grid;place-items:center;background:#e3f2ee;color:var(--ish-teal)}.ish-role h3{margin:0 0 7px}.ish-role p{margin:0;color:#74827f;font-size:12px;line-height:1.9}.ish-role ul{padding:0;margin:15px 0 0;list-style:none;display:grid;gap:7px}.ish-role li{display:flex;align-items:center;gap:7px;color:#53645f;font-size:11px}.ish-role li svg{color:var(--ish-teal)}
        .ish-faq{max-width:800px;margin:45px auto 0}.ish-faq-item{border-bottom:1px solid var(--ish-line)}.ish-faq-q{width:100%;background:transparent;border:0;cursor:pointer;padding:21px 4px;display:flex;align-items:center;justify-content:space-between;gap:15px;text-align:right;font-weight:850;color:#20312d}.ish-faq-a{color:#72817d;font-size:12px;line-height:2;padding:0 4px 20px;max-width:720px}.ish-rotate{transform:rotate(180deg)}
        .ish-cta{padding:70px 0}.ish-cta-box{position:relative;overflow:hidden;border-radius:32px;padding:55px 50px;background:linear-gradient(130deg,#0b5f54,#073e38);color:white;display:flex;align-items:center;justify-content:space-between;gap:30px}.ish-cta-box:after{content:"";position:absolute;width:340px;height:340px;border:1px solid rgba(255,255,255,.1);border-radius:50%;left:-120px;bottom:-190px}.ish-cta h2{font-size:clamp(24px,3.4vw,36px);line-height:1.5;margin:0 0 10px}.ish-cta p{color:#c5ded9;margin:0;line-height:1.9}.ish-cta .ish-soft{background:white;color:#0b5a50}
        .ish-footer{background:#061d1a;color:#bfd0cc;padding:48px 0 25px}.ish-footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:50px}.ish-footer p{font-size:12px;line-height:1.9;color:#819b95;max-width:420px}.ish-footer h4{color:white;margin:0 0 13px}.ish-footer-links{display:grid;gap:8px}.ish-footer button{background:none;border:0;color:#8ea6a1;text-align:right;cursor:pointer;font-size:11px}.ish-footer .ish-brand{cursor:default}.ish-footer-bottom{border-top:1px solid rgba(255,255,255,.08);margin-top:35px;padding-top:18px;font-size:10px;color:#6e8983;display:flex;justify-content:space-between;gap:10px}
        .ish-install{position:fixed;left:18px;bottom:18px;z-index:45;display:flex;align-items:center;gap:9px;padding:12px 14px;background:#fff;border:1px solid #d9e8e4;border-radius:15px;box-shadow:0 15px 40px rgba(7,48,43,.13);font-size:11px;font-weight:850;color:#173b35}.ish-install button{border:0;background:var(--ish-teal);color:white;border-radius:10px;padding:8px 11px;font-weight:850;cursor:pointer}.ish-modal-backdrop{position:fixed;inset:0;background:rgba(4,25,22,.55);backdrop-filter:blur(8px);z-index:80;display:grid;place-items:center;padding:20px}.ish-modal{width:min(460px,100%);background:white;border-radius:25px;padding:25px;box-shadow:0 30px 90px rgba(0,0,0,.25)}.ish-modal-head{display:flex;align-items:center;justify-content:space-between}.ish-close{border:0;background:#edf3f1;border-radius:10px;padding:8px;cursor:pointer}.ish-modal ol{padding-right:20px;color:#60706c;line-height:2;font-size:13px}.ish-modal p{color:#73817e;font-size:12px;line-height:1.9}
        @media(max-width:980px){.ish-links{display:none}.ish-menu{display:block}.ish-nav-actions .ish-soft{display:none}.ish-hero-grid,.ish-tutorial{grid-template-columns:1fr;gap:45px}.ish-hero-copy{max-width:760px}.ish-hero-card{max-width:620px;width:100%;margin:auto}.ish-steps{grid-template-columns:repeat(2,1fr)}.ish-features{grid-template-columns:repeat(2,1fr)}.ish-roles{grid-template-columns:1fr}.ish-footer-grid{grid-template-columns:1fr 1fr}.ish-mobile-nav{display:grid!important}}
        .ish-mobile-nav{display:none;position:absolute;top:68px;right:0;left:0;background:rgba(255,255,255,.97);border:1px solid #dfe9e6;border-radius:18px;padding:9px;box-shadow:0 25px 60px rgba(8,45,40,.14)}.ish-mobile-nav button{border:0;background:transparent;text-align:right;padding:12px;width:100%;border-radius:11px;font-weight:750;color:#51625e}.ish-mobile-nav button:hover{background:#eef6f4}.ish-mobile-nav .ish-mobile-cta{background:var(--ish-teal);color:white;text-align:center;margin-top:5px}
        @media(max-width:640px){.ish-container{width:min(100% - 28px,1180px)}.ish-nav-inner{height:66px}.ish-brand strong{font-size:17px}.ish-brand img{width:38px;height:38px}.ish-hero{padding:112px 0 55px}.ish-hero h1{font-size:31px}.ish-hero p{font-size:14px;line-height:2}.ish-actions{display:grid;grid-template-columns:1fr}.ish-actions .ish-btn{width:100%}.ish-trust{flex-wrap:wrap;gap:9px 14px}.ish-window{padding:10px;border-radius:22px}.ish-preview{padding:12px;min-height:340px}.ish-stats{margin-top:-5px}.ish-stats-card{grid-template-columns:1fr;padding:8px}.ish-stat{border-left:0;border-bottom:1px solid #e6eeec;padding:11px}.ish-stat:last-child{border-bottom:0}.ish-section{padding:70px 0}.ish-title{font-size:25px}.ish-steps,.ish-features{grid-template-columns:1fr}.ish-step{min-height:auto}.ish-role{padding:22px}.ish-cta{padding:50px 0}.ish-cta-box{padding:34px 24px;display:block}.ish-cta-box .ish-actions{margin-top:22px}.ish-footer-grid{grid-template-columns:1fr}.ish-footer-bottom{display:block;line-height:1.8}.ish-install{left:10px;right:10px;bottom:10px;justify-content:space-between}.ish-tutorial-card{min-height:390px}.ish-phone{width:200px}.ish-phone-screen{height:275px}}
        @media(prefers-reduced-motion:reduce){.ish-home,.ish-home *{scroll-behavior:auto!important;transition:none!important}}
      `}</style>

      <header className="ish-nav">
        <div className="ish-container ish-nav-inner">
          <button className="ish-brand" onClick={() => scrollToId('home')}>
            <img src="/logo-flat.png" alt="ئیش خواز" />
            <div><strong>ئیش خواز</strong><span>کار لە کوردستان</span></div>
          </button>

          <nav className="ish-links" aria-label="ناڤیگەیشن">
            {NAV_ITEMS.map((item) => <button key={item.id} onClick={() => scrollToId(item.id)}>{item.label}</button>)}
          </nav>

          <div className="ish-nav-actions">
            <button className="ish-btn ish-soft" onClick={handleInstall}><Download size={16} /> دابەزاندن</button>
            <button className="ish-btn ish-primary" onClick={() => navigate('/login')}>چوونەژوورەوە <ArrowLeft size={16} /></button>
            <button className="ish-menu" onClick={() => setMenuOpen(v => !v)} aria-label="مێنیو">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>

          {menuOpen && <div className="ish-mobile-nav">
            {NAV_ITEMS.map((item) => <button key={item.id} onClick={() => { setMenuOpen(false); scrollToId(item.id); }}>{item.label}</button>)}
            <button className="ish-mobile-cta" onClick={() => navigate('/login')}>چوونەژوورەوە</button>
          </div>}
        </div>
      </header>

      <main id="home">
        <section className="ish-hero">
          <div className="ish-glow a" /><div className="ish-glow b" />
          <div className="ish-container ish-hero-grid">
            <div className="ish-hero-copy">
              <div className="ish-kicker"><Sparkles size={14} /> پلاتفۆرمی کار بۆ کوردستان</div>
              <h1>هەلی کارەکەت <span>لە نزیکترین شوێن</span> بدۆزەرەوە.</h1>
              <p>ئیش خواز شوێنێکە بۆ دۆزینەوەی کار، پێشکەشکردنی هەلی کار، دروستکردنی سیڤی و پەیوەندیکردنی کارخواز و کۆمپانیا بە شێوەیەکی سادە و نوێ.</p>
              <div className="ish-actions">
                <button className="ish-btn ish-primary" onClick={() => navigate('/register')}><BriefcaseBusiness size={18} /> دەستپێبکە</button>
                <ScrollButton target="how" className="ish-btn ish-soft"><Play size={16} /> چۆنیەتی کارکردن</ScrollButton>
              </div>
              <div className="ish-trust"><div className="ish-trust-item"><ShieldCheck size={15} /> بە شێوەی پارێزراو</div><div className="ish-trust-item"><Zap size={15} /> خێرا و سادە</div><div className="ish-trust-item"><MapPin size={15} /> ناوچەیی</div></div>
            </div>

            <div className="ish-hero-card">
              <div className="ish-window">
                <div className="ish-window-top"><i className="ish-dot" /><i className="ish-dot" /><i className="ish-dot" /></div>
                <div className="ish-preview">
                  <div className="ish-searchbox"><Search size={16} /> بگەڕێ بۆ ناوی کار، کۆمپانیا یان شار...</div>
                  {[['پەرەپێدەری وێب', 'سلێمانی', 'Full-time'], ['حسابدار', 'هەولێر', 'On-site'], ['گرافیک دیزاینەر', 'دهۆک', 'Remote']].map(([title, city, type]) => <div className="ish-job-card" key={title}>
                    <div className="ish-job-row"><div className="ish-company"><div className="ish-company-logo"><Building2 size={18} /></div><div><div className="ish-job-title">{title}</div><div className="ish-job-meta"><MapPin size={10} style={{ verticalAlign: '-2px' }} /> {city}</div></div></div><span className="ish-pill">{type}</span></div>
                    <div className="ish-job-tags"><span className="ish-pill">ئیش خواز</span><span className="ish-pill">پیشەیی</span></div>
                  </div>)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="ish-stats"><div className="ish-container"><div className="ish-stats-card">{stats.map(s => <div className="ish-stat" key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>)}</div></div></div>

        <section id="how" className="ish-section">
          <div className="ish-container">
            <div className="ish-center"><div className="ish-eyebrow">چۆن کار دەکات؟</div><h2 className="ish-title">لە گەڕانەوە تا دەستپێکردنی کار</h2><p className="ish-subtitle">هەموو پرۆسەکە لە چەند هەنگاوێکی ڕوون و ئاسان پێکدێت.</p></div>
            <div className="ish-steps">{STEPS.map(step => { const Icon = step.icon; return <article className="ish-step" key={step.number}><div className="ish-step-num">{step.number}</div><div className="ish-step-icon"><Icon size={22} /></div><h3>{step.title}</h3><p>{step.text}</p></article>; })}</div>
          </div>
        </section>

        <section id="features" className="ish-section alt">
          <div className="ish-container">
            <div className="ish-center"><div className="ish-eyebrow">هەموو شتێک لە یەک شوێن</div><h2 className="ish-title">ئیش خواز بۆ هەردوو لایەن دروست کراوە</h2><p className="ish-subtitle">ئامرازەکان بۆ ئەوە دانراون کە کارخواز و دامەزرێنەر بە کەمترین هەنگاو بگەن بە ئەنجامی خۆیان.</p></div>
            <div className="ish-features">{FEATURES.map(feature => { const Icon = feature.icon; return <article className="ish-feature" key={feature.title}><div className="ish-feature-icon"><Icon size={21} /></div><h3>{feature.title}</h3><p>{feature.text}</p></article>; })}</div>
          </div>
        </section>

        <section id="tutorial" className="ish-section">
          <div className="ish-container ish-tutorial">
            <div className="ish-tutorial-card">
              <div className="ish-eyebrow" style={{ color: '#7de0cf' }}>ڕێبەری خێرا</div>
              <h2 style={{ fontSize: 28, lineHeight: 1.5, margin: '9px 0 0' }}>لە مۆبایلەکەتەوە<br />هەموو شتێک بەدەستەوە.</h2>
              <div className="ish-phone"><div className="ish-phone-screen"><div className="ish-phone-logo"><img src="/logo-flat.png" alt="" style={{ width: 30, height: 30 }} /></div><div className="ish-phone-line" /><div className="ish-phone-line short" /><div className="ish-phone-line" /><div className="ish-phone-line short" /><div className="ish-phone-btn" /></div></div>
            </div>
            <div>
              <div className="ish-eyebrow">Tutorial</div><h2 className="ish-title">چۆن لە ئیش خواز بەکاربهێنیت؟</h2><p className="ish-subtitle" style={{ margin: 0 }}>ئەم ڕێبەرە هەموو ئەو هەنگاوانە پیشان دەدات کە بۆ دەستپێکردن پێویستن.</p>
              <div className="ish-tutorial-list">
                {[['هەژمار دروست بکە', 'ڕۆڵی خۆت هەڵبژێرە و زانیارییە سەرەتاییەکان پڕبکەرەوە.'], ['پڕۆفایلەکەت تەواو بکە', 'تواناکان، ئەزموون و زانیاری پیشەییەکانت زیاد بکە.'], ['گەڕان و فلتەر بەکاربهێنە', 'شوێن، جۆری کار و پۆزیشن بە وردی دیاری بکە.'], ['داواکاری بنێرە یان کار دابنێ', 'ئەگەر کارخوازیت داواکاری بنێرە؛ ئەگەر کۆمپانیایت هەلی کار دابنێ.']].map(([t, d], i) => <div className="ish-tutorial-row" key={t}><div className="ish-check"><Check size={15} /></div><div><strong>{i + 1}. {t}</strong><span>{d}</span></div></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="ish-section alt">
          <div className="ish-container">
            <div className="ish-center"><div className="ish-eyebrow">بۆ تۆ کامە؟</div><h2 className="ish-title">ڕێگای خۆت هەڵبژێرە</h2></div>
            <div className="ish-roles">
              <article className="ish-role job"><div className="ish-role-icon"><UserRound /></div><div><h3>من بەدوای کاردا دەگەڕێم</h3><p>پڕۆفایلێکی پیشەیی دروست بکە و هەلی کارە گونجاوەکان بدۆزەرەوە.</p><ul><li><Check size={14} /> گەڕانی ورد بەپێی ناوچە</li><li><Check size={14} /> بەڕێوەبردنی CV</li><li><Check size={14} /> داواکاری و پەیوەندی</li></ul></div></article>
              <article className="ish-role company"><div className="ish-role-icon"><Building2 /></div><div><h3>من کۆمپانیام و کارم هەیە</h3><p>براندی کۆمپانیاکەت پیشان بدە و کاندیدی گونجاو بۆ پۆزیشنەکانت بدۆزەرەوە.</p><ul><li><Check size={14} /> دروستکردنی Job</li><li><Check size={14} /> پڕۆفایلی کۆمپانیا</li><li><Check size={14} /> بەڕێوەبردنی کاندیدەکان</li></ul></div></article>
            </div>
          </div>
        </section>

        <section className="ish-section">
          <div className="ish-container">
            <div className="ish-center"><div className="ish-eyebrow">پرسیارە باوەکان</div><h2 className="ish-title">هەر پرسیارێکت هەیە؟</h2></div>
            <div className="ish-faq">{FAQ.map(([q, a], i) => <div className="ish-faq-item" key={q}><button className="ish-faq-q" onClick={() => setActiveFaq(activeFaq === i ? -1 : i)} aria-expanded={activeFaq === i}><span>{q}</span><ChevronDown size={18} className={activeFaq === i ? 'ish-rotate' : ''} /></button>{activeFaq === i && <div className="ish-faq-a">{a}</div>}</div>)}</div>
          </div>
        </section>

        <section className="ish-cta"><div className="ish-container"><div className="ish-cta-box"><div><h2>ئامادەیت دەستپێبکەیت؟</h2><p>ئێستا هەژمارەکەت دروست بکە و دنیای هەلی کار لە ئیش خواز ببینە.</p></div><div className="ish-actions" style={{ margin: 0 }}><button className="ish-btn ish-soft" onClick={() => navigate('/register')}><UsersRound size={18} /> دروستکردنی هەژمار</button><button className="ish-btn" style={{ background: 'rgba(255,255,255,.1)', color: 'white', border: '1px solid rgba(255,255,255,.15)' }} onClick={handleInstall}><Download size={17} /> دابەزاندنی ئەپ</button></div></div></div></section>
      </main>

      <footer className="ish-footer"><div className="ish-container"><div className="ish-footer-grid"><div><div className="ish-brand"><img src="/logo-flat.png" alt="ئیش خواز" /><div><strong style={{ color: 'white' }}>ئیش خواز</strong><span style={{ color: '#78918b' }}>کار لە کوردستان</span></div></div><p>پلاتفۆرمێکی نوێ بۆ پەیوەندیکردنی کارخوازان و کۆمپانیاکان، بە ئەزموونێکی سادە و مۆدێرن بۆ کوردستان.</p></div><div><h4>بەستەرەکان</h4><div className="ish-footer-links">{NAV_ITEMS.map(x => <button key={x.id} onClick={() => scrollToId(x.id)}>{x.label}</button>)}</div></div><div><h4>دەستپێکردن</h4><div className="ish-footer-links"><button onClick={() => navigate('/register')}>تۆمارکردن</button><button onClick={() => navigate('/login')}>چوونەژوورەوە</button><button onClick={handleInstall}>دابەزاندنی PWA</button></div></div></div><div className="ish-footer-bottom"><span>© {new Date().getFullYear()} ئیش خواز. هەموو مافەکان پارێزراون.</span><span>دروستکراوە بۆ کار لە کوردستان</span></div></div></footer>

      {!installed && <div className="ish-install"><span>{canInstall ? 'ئیش خواز وەک ئەپ دابەزێنە' : 'ئیش خواز لە مۆبایل بەکاربهێنە'}</span><button onClick={handleInstall}>{canInstall ? 'دابەزاندن' : 'ڕێنمایی'}</button></div>}

      {showInstallHelp && <div className="ish-modal-backdrop" onClick={() => setShowInstallHelp(false)}><div className="ish-modal" onClick={e => e.stopPropagation()}><div className="ish-modal-head"><h3 style={{ margin: 0 }}>دابەزاندنی ئیش خواز</h3><button className="ish-close" onClick={() => setShowInstallHelp(false)} aria-label="داخستن"><X size={17} /></button></div><p>ئەگەر دوگمەی دابەزاندن لە وێبگەڕەکەتدا نیشان نەدرا، دەتوانیت لە مێنیوی وێبگەڕەکە هەڵبژێریت:</p><ol><li>لە Chrome یان Edge مێنیوی سێ خاڵ بکەرەوە.</li><li>هەڵبژاردەی <b>Install app</b> یان <b>Add to Home screen</b> بدۆزەرەوە.</li><li>دڵنیابە و ئیش خواز وەک ئەپ زیاد بکە.</li></ol><button className="ish-btn ish-primary" style={{ width: '100%' }} onClick={() => setShowInstallHelp(false)}>باشە</button></div></div>}
    </div>
  );
}
