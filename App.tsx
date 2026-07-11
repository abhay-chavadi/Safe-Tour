import React, { useState } from 'react';
import { Shield, Users, Radio, Navigation, Anchor, Globe } from 'lucide-react';
import NatureBackground from './components/NatureBackground';
import TouristView from './components/TouristView';
import AdminView from './components/AdminView';

import { APIProvider } from '@vis.gl/react-google-maps';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tourist' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return (searchParams.get('view') === 'admin' ? 'admin' : 'tourist');
    }
    return 'tourist';
  });

  const [language, setLanguage] = useState('en');

  React.useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);

      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false },
          'google_translate_element'
        );
      };
    }
  }, []);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setLanguage(lang);
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event('change'));
    }
  };


  // Load the Google Maps API key provided directly by the user:
  // Fallback to the user's key if not overridden by process.env environment variable.
  const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || 'AIzaSyAUYDwT4zKVM3LSYY_5p85eHesR7gqjQ5A';

  const isDirectTouristLink = typeof window !== 'undefined' && window.location.search.includes('view=tourist');

  return (
    <div className="min-h-screen text-slate-100 relative font-sans flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Cinematic Nature Ambient Background */}
      <div id="google_translate_element" className="hidden"></div>
      <NatureBackground />

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-6 py-6 z-10 space-y-6">
        
        {/* TOP CINEMATIC APPLICATION HEADER */}
        <header className="flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
          {/* Glowing gradient back-drop */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.05),transparent_60%)] pointer-events-none" />
          
          <div className="flex items-center gap-4 text-center md:text-left mb-4 md:mb-0 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-300">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <h1 className="text-xl font-bold tracking-tight uppercase italic text-white">SAFE TOUR</h1>
                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  SECURE DIGITAL ID
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5 uppercase tracking-wide">
                Smart Tourist Safety monitoring and Incident response system
              </p>
            </div>
          </div>

          {/* TELEMETRY SPECS & LANGUAGE */}
          <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] text-slate-400 relative z-10">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-black/40 notranslate">
              <Globe className="w-3.5 h-3.5 text-slate-300" />
              <select 
                value={language} 
                onChange={handleLanguageChange}
                className="bg-transparent text-slate-300 outline-none cursor-pointer uppercase hover:text-white transition-colors"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
              >
                <option value="en" className="bg-slate-900">English</option>
                <option value="hi" className="bg-slate-900">हिन्दी (Hindi)</option>
                <option value="bn" className="bg-slate-900">বাংলা (Bengali)</option>
                <option value="te" className="bg-slate-900">తెలుగు (Telugu)</option>
                <option value="mr" className="bg-slate-900">मराठी (Marathi)</option>
                <option value="ta" className="bg-slate-900">தமிழ் (Tamil)</option>
                <option value="ur" className="bg-slate-900">اردو (Urdu)</option>
                <option value="gu" className="bg-slate-900">ગુજરાતી (Gujarati)</option>
                <option value="kn" className="bg-slate-900">ಕನ್ನಡ (Kannada)</option>
                <option value="ml" className="bg-slate-900">മലയാളം (Malayalam)</option>
                <option value="or" className="bg-slate-900">ଓଡ଼ିଆ (Odia)</option>
                <option value="pa" className="bg-slate-900">ਪੰਜਾਬੀ (Punjabi)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/10 bg-emerald-500/5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400">SECURE SYNC</span>
            </div>
          </div>
        </header>

        {/* ROLE REGULATION SWITCHER (TOURIST vs ADMIN) */}
        {!isDirectTouristLink && (
          <div className="flex justify-center">
            <div className="p-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md flex gap-2">
              <button
                onClick={() => setActiveTab('tourist')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  activeTab === 'tourist'
                  ? 'bg-emerald-500 text-stone-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold'
                  : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Tourist portal</span>
              </button>
              
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  activeTab === 'admin'
                  ? 'bg-emerald-500 text-stone-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold'
                  : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            </div>
          </div>
        )}

        {/* PORTAL ROUTER COMPONENT */}
        <main className="relative">
          <APIProvider apiKey={API_KEY} version="weekly">
            {activeTab === 'tourist' ? (
              <TouristView googleMapsApiKey={API_KEY} />
            ) : (
              <AdminView googleMapsApiKey={API_KEY} />
            )}
          </APIProvider>
        </main>

      </div>

      {/* FOOTER SYSTEM CREDITS */}
      <footer className="w-full py-4 text-center font-mono text-[9px] text-slate-500 border-t border-white/5 bg-black/60 backdrop-blur-xl z-10 mt-12 flex flex-col sm:flex-row items-center justify-between px-8 gap-2">
        <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
          <span>SYSTEM STATUS: <span className="text-emerald-400 font-bold">OPTIMAL</span></span>
          <span>SATELLITE SYNC: 12ms</span>
          <span>ENCRYPTION: AES-256 (SECURED)</span>
        </div>
        <div className="flex gap-4 items-center">
          <span>MAP DATA ©2026 SAFE TOUR CLOUD</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-blue-400 uppercase">Offline Map Cached</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
