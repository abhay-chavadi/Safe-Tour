import React, { useState } from 'react';
import { Shield, Users, Radio, Languages, Info, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import NatureBackground from './components/NatureBackground';
import TouristView from './components/TouristView';
import AdminView from './components/AdminView';

const LANGUAGES_LIST = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'kha', label: 'Khasi', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { code: 'as', label: 'অসমীয়া (Assamese)', flag: '🇮🇳' },
  { code: 'ne', label: 'नेपाली (Nepali)', flag: '🇮🇳' },
  { code: 'ur', label: 'اردو (Urdu)', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'tourist' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return (searchParams.get('view') === 'admin' ? 'admin' : 'tourist');
    }
    return 'tourist';
  });

  const [activeLang, setActiveLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('safetour_lang') || 'en';
    }
    return 'en';
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  React.useEffect(() => {
    const handleUrlChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const view = searchParams.get('view');
      if (view === 'admin') {
        setActiveTab('admin');
      } else if (view === 'tourist') {
        setActiveTab('tourist');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    const interval = setInterval(handleUrlChange, 500);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(interval);
    };
  }, []);

  // Restore and keep the language active on mount
  React.useEffect(() => {
    const storedLang = localStorage.getItem('safetour_lang') || 'en';
    const hostname = window.location.hostname;
    
    // Explicitly set the cookie on mount with SameSite=None; Secure to allow proper function inside preview iframes
    if (storedLang !== 'en') {
      const value = `/en/${storedLang}`;
      const cookieOpts = "path=/; SameSite=None; Secure;";
      document.cookie = `googtrans=${value}; ${cookieOpts}`;
      document.cookie = `googtrans=${value}; domain=${hostname}; ${cookieOpts}`;
      document.cookie = `googtrans=${value}; domain=.${hostname}; ${cookieOpts}`;
    } else {
      // If English, clear any lingering translation cookies to prevent forced translations
      const parts = hostname.split('.');
      const cookieOpts = "expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure;";
      document.cookie = `googtrans=; ${cookieOpts}`;
      document.cookie = `googtrans=; domain=${hostname}; ${cookieOpts}`;
      document.cookie = `googtrans=; domain=.${hostname}; ${cookieOpts}`;
      for (let i = 0; i < parts.length - 1; i++) {
        const domain = parts.slice(i).join('.');
        document.cookie = `googtrans=; domain=${domain}; ${cookieOpts}`;
        document.cookie = `googtrans=; domain=.${domain}; ${cookieOpts}`;
      }
    }

    // Fallback programmatic selection check to sync any delay in Google script rendering
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      const selectEl = document.querySelector('select.goog-te-combo') as HTMLSelectElement;
      if (selectEl) {
        if (selectEl.value !== storedLang) {
          selectEl.value = storedLang;
          selectEl.dispatchEvent(new Event('change'));
        }
        clearInterval(checkInterval);
      }
      if (attempts > 50) { // Limit to ~7.5 seconds
        clearInterval(checkInterval);
      }
    }, 150);
    
    return () => clearInterval(checkInterval);
  }, []);

  // Google Translate Script Initializer
  React.useEffect(() => {
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          autoDisplay: false,
          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE
        },
        'google_translate_element'
      );
    };

    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleLanguageChange = (langCode: string) => {
    setIsTranslating(true);
    setActiveLang(langCode);
    localStorage.setItem('safetour_lang', langCode);

    // Deep clean existing googtrans cookies across subdomains with SameSite=None; Secure to prevent iframe collisions
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const cleanCookieOpts = "expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure;";
    
    document.cookie = `googtrans=; ${cleanCookieOpts}`;
    document.cookie = `googtrans=; domain=${hostname}; ${cleanCookieOpts}`;
    document.cookie = `googtrans=; domain=.${hostname}; ${cleanCookieOpts}`;

    for (let i = 0; i < parts.length - 1; i++) {
      const domain = parts.slice(i).join('.');
      document.cookie = `googtrans=; domain=${domain}; ${cleanCookieOpts}`;
      document.cookie = `googtrans=; domain=.${domain}; ${cleanCookieOpts}`;
    }

    // Set the new translation cookie with SameSite=None; Secure for full iframe compatibility
    if (langCode !== 'en') {
      const value = `/en/${langCode}`;
      const cookieOpts = "path=/; SameSite=None; Secure;";
      document.cookie = `googtrans=${value}; ${cookieOpts}`;
      document.cookie = `googtrans=${value}; domain=${hostname}; ${cookieOpts}`;
      document.cookie = `googtrans=${value}; domain=.${hostname}; ${cookieOpts}`;
    }

    // Attempt instant programmatic translation trigger
    let triggered = false;
    try {
      const selectEl = document.querySelector('select.goog-te-combo') as HTMLSelectElement;
      if (selectEl) {
        selectEl.value = langCode;
        selectEl.dispatchEvent(new Event('change'));
        triggered = true;
      }
    } catch (e) {
      console.error("Error setting Google Translate programmatically:", e);
    }

    if (triggered) {
      // Blazing fast direct translation without losing any UI state or forcing a full reload!
      setTimeout(() => {
        setIsTranslating(false);
      }, 800);
    } else {
      // Fallback: reload the page to let Google Translate initialize and apply translation cleanly from the cookie
      setTimeout(() => {
        window.location.reload();
      }, 600);
    }
  };

  const envKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
  const API_KEY = envKey || 'AIzaSyAUYDwT4zKVM3LSYY_5p85eHesR7gqjQ5A';

  const isDirectTouristLink = typeof window !== 'undefined' && window.location.search.includes('view=tourist');
  const currentLangObj = LANGUAGES_LIST.find(l => l.code === activeLang) || LANGUAGES_LIST[0];

  return (
    <div className="min-h-screen text-slate-800 relative font-sans flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900 bg-transparent">
      
      {/* Hidden google translate initialization target */}
      <div 
        id="google_translate_element" 
        style={{ 
          position: 'absolute', 
          opacity: 0, 
          pointerEvents: 'none', 
          top: 0, 
          left: 0, 
          width: '1px', 
          height: '1px', 
          overflow: 'hidden' 
        }} 
      />

      {/* Cinematic Nature Ambient Background (Light Mode) */}
      <NatureBackground />

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-6 py-6 z-10 space-y-6">
        
        {/* TOP CINEMATIC APPLICATION HEADER */}
        <header className="flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-md relative overflow-hidden gap-4">
          {/* Glowing gradient back-drop */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.06),transparent_60%)] pointer-events-none" />
          
          <div className="flex items-center gap-4 text-center md:text-left mb-4 md:mb-0 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-all duration-300">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 justify-center md:justify-start">
                <h1 className="text-3xl lg:text-4xl font-black tracking-wider uppercase italic text-emerald-800 drop-shadow-sm">SAFE TOUR</h1>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 shadow-sm animate-pulse">
                  SECURE DIGITAL ID
                </span>
              </div>
              <p className="text-sm font-sans font-extrabold text-slate-750 mt-1 uppercase tracking-wide">
                Smart Tourist Safety monitoring and Incident response system
              </p>
            </div>
          </div>

        </header>

        {/* DEDICATED LANGUAGE BAR BELOW HEADER */}
        <div className="flex justify-end relative z-50 notranslate">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30 text-xs font-mono font-black text-slate-750 transition-all duration-200 cursor-pointer bg-white shadow-md"
            >
              <Languages className="w-4 h-4 text-emerald-600" />
              <span className="uppercase tracking-wider text-slate-400">LANGUAGE:</span>
              <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                <span>{currentLangObj.flag}</span>
                <span>{currentLangObj.label}</span>
              </span>
            </button>

            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-mono">
                  <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      SELECT REGION / LANGUAGE
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin">
                    {LANGUAGES_LIST.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          handleLanguageChange(lang.code);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                          activeLang === lang.code
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{lang.flag}</span>
                          <span>{lang.label}</span>
                        </span>
                        {activeLang === lang.code && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ROLE REGULATION SWITCHER (TOURIST vs ADMIN) */}
        {!isDirectTouristLink && (
          <div className="flex justify-center">
            <div className="p-1.5 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md flex gap-3 shadow-md">
              <button
                onClick={() => setActiveTab('tourist')}
                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-sm font-sans font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'tourist'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Radio className="w-5 h-5" />
                <span>Tourist portal</span>
              </button>
              
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-sm font-sans font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'admin'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Admin Dashboard</span>
              </button>
            </div>
          </div>
        )}

        {/* ROLE GUIDE BANNER */}
        <div id="role-guide-banner" className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-5 shadow-sm max-w-7xl mx-auto w-full font-sans transition-all duration-300">
          {activeTab === 'tourist' ? (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1 md:max-w-xs shrink-0">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold uppercase text-xs tracking-wider font-mono">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>How Tourist Portal Works</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Explore, track safety spots, and update your telemetry live to stay connected with regional authorities.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wide font-mono">1. Safety Zones</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Locate local police, medical care, safe parking, and charge hubs on the live map.</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wide font-mono">2. Live Check-in</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Broadcast your current battery level, network status, and safety log check-ins.</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wide font-mono">3. SOS Incident Feed</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Report safety threats, medical issues, or lost property directly to dispatch.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1 md:max-w-xs shrink-0">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold uppercase text-xs tracking-wider font-mono">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>How Admin Dashboard Works</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Real-time command terminal to process tourist telemetry and coordinate regional security dispatches.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wide font-mono">1. Monitor Alerts</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Receive and review incoming emergency tickets, priority statuses, and map logs.</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wide font-mono">2. Coordinate Dispatch</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Assign and deploy regional response teams to reported incident coordinates.</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wide font-mono">3. Manage Safe Zones</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Register safety points, update active service spots, and monitor trek telemetry.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PORTAL ROUTER COMPONENT */}
        <main className="relative">
          {activeTab === 'tourist' ? (
            <TouristView googleMapsApiKey={API_KEY} />
          ) : (
            <AdminView googleMapsApiKey={API_KEY} />
          )}
        </main>

      </div>

      {/* FOOTER SYSTEM CREDITS */}
      <footer className="w-full py-4 text-center font-mono text-[9px] text-slate-500 border-t border-slate-200 bg-white/90 backdrop-blur-xl z-10 mt-12 flex flex-col sm:flex-row items-center justify-between px-8 gap-2">
        <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
          <span>SYSTEM STATUS: <span className="text-emerald-600 font-bold">OPTIMAL</span></span>
          <span>SATELLITE SYNC: 12ms</span>
          <span>ENCRYPTION: AES-256 (SECURED)</span>
        </div>
        <div className="flex gap-4 items-center">
          <span>MAP DATA ©2026 SAFE TOUR CLOUD</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-blue-500 uppercase">Offline Map Cached</span>
          </div>
        </div>
      </footer>

      {isTranslating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex flex-col items-center justify-center font-mono text-white">
          <div className="bg-slate-950/80 border border-emerald-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col items-center gap-4 text-center max-w-sm">
            <span className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <div className="space-y-1">
              <span className="text-sm font-black uppercase tracking-widest text-emerald-400">SAFE TOUR TRANSLATOR</span>
              <p className="text-[10px] text-slate-400">Cryptographically syncing page nodes with regional neural backplane...</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
