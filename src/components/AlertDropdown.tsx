import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, Radio, AlertTriangle, ShieldAlert, CheckCircle2, CloudLightning, Newspaper, Clock, MapPin } from 'lucide-react';
import { IncidentReport, DisasterNews } from '../types';

interface AlertDropdownProps {
  onSelectCoordinates?: (lat: number, lng: number) => void;
}

export const AlertDropdown: React.FC<AlertDropdownProps> = ({ onSelectCoordinates }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [news, setNews] = useState<DisasterNews[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [activeTab, setActiveTab] = useState<'news' | 'feed'>('news');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Real-time notifications state
  const [newAlertTriggered, setNewAlertTriggered] = useState(false);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial News & Incidents
  const fetchData = async () => {
    try {
      const [newsRes, reportsRes] = await Promise.all([
        fetch('/api/disaster-news'),
        fetch('/api/reports')
      ]);
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        setNews(newsData);
      }
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setIncidents(reportsData);
      }
    } catch (err) {
      console.error('Error fetching dropdown feeds', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup Server-Sent Events listener for live-updating alerts
    const eventSource = new EventSource('/api/sse');
    
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'REPORT_SUBMITTED') {
          setIncidents(prev => [payload.data, ...prev]);
          setNewAlertTriggered(true);
          // Play a gentle alert ping sound
          try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, context.currentTime); // high ping
            gain.gain.setValueAtTime(0.02, context.currentTime);
            osc.connect(gain);
            gain.connect(context.destination);
            osc.start();
            osc.stop(context.currentTime + 0.15);
          } catch (_) {}
        } else if (payload.type === 'ALERT_BROADCAST') {
          // Add custom disaster warning dynamically from system broadcast
          const customNews: DisasterNews = {
            id: `news-${Date.now()}`,
            title: `📡 CENTRAL BROADCAST: ${payload.data.severity.toUpperCase()}`,
            category: 'Safety Alert',
            message: payload.data.message,
            timestamp: payload.data.timestamp || Date.now(),
            severity: payload.data.severity === 'critical' ? 'critical' : 'warning'
          };
          setNews(prev => [customNews, ...prev]);
          setNewAlertTriggered(true);
        } else if (payload.type === 'NEWS_UPDATED') {
          setNews(payload.data);
          setNewAlertTriggered(true);
        }
      } catch (err) {
        console.error('Error handling SSE message in dropdown', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Clear pulse trigger after opening dropdown
  useEffect(() => {
    if (isOpen) {
      setNewAlertTriggered(false);
    }
  }, [isOpen]);

  const activeAlertsCount = news.length + incidents.filter(i => i.status === 'pending').length;

  return (
    <div className="relative font-mono" ref={dropdownRef} id="alert-news-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 cursor-pointer ${
          newAlertTriggered 
          ? 'bg-amber-500 text-stone-950 border-amber-500 animate-bounce' 
          : 'bg-white/90 border-slate-200/80 hover:border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
        }`}
      >
        <span className="relative flex h-2 w-2 mr-0.5">
          {activeAlertsCount > 0 && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${activeAlertsCount > 0 ? 'bg-red-500' : 'bg-slate-300'}`}></span>
        </span>
        
        <Radio className="w-3.5 h-3.5 text-slate-500" />
        <span className="hidden sm:inline">SAFETY HUB:</span>
        <span className="font-extrabold">{activeAlertsCount} ALERTS / NEWS</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden text-slate-800 transition-all duration-300">
          {/* Header */}
          <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
              EMERGENCY BROADCAST FEED
            </span>
            <button 
              onClick={fetchData} 
              className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded cursor-pointer transition-colors"
            >
              SYNC FEED
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 border-b border-slate-100 text-center font-bold text-[11px]">
            <button
              onClick={() => setActiveTab('news')}
              className={`py-2.5 transition-colors flex items-center justify-center gap-1.5 border-r border-slate-100 cursor-pointer ${
                activeTab === 'news'
                  ? 'bg-slate-50 text-emerald-600 border-b-2 border-b-emerald-500'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              DISASTER NEWS ({news.length})
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`py-2.5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-slate-50 text-emerald-600 border-b-2 border-b-emerald-500'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              LIVE TELEMETRY ({incidents.length})
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
            {activeTab === 'news' ? (
              news.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-sans">
                  No active disaster advisories on file.
                </div>
              ) : (
                news.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        item.severity === 'critical' 
                        ? 'bg-red-50 text-red-600 border border-red-100' 
                        : item.severity === 'warning'
                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {item.category}
                      </span>
                      <span className="text-[9px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mb-1 leading-tight">{item.title}</h4>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-sans">{item.message}</p>
                  </div>
                ))
              )
            ) : (
              incidents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-sans">
                  No registered active safety events on grid.
                </div>
              ) : (
                incidents.map((incident) => (
                  <div key={incident.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        incident.status === 'pending'
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {incident.status === 'pending' ? '🚨 SOS ACTIVE' : '✅ SECURE'}
                      </span>
                      <span className="text-[9px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 mb-1">
                      Reporter: <span className="text-emerald-600">{incident.touristName}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-sans mb-2">"{incident.message}"</p>
                    {incident.lat && incident.lng && onSelectCoordinates && (
                      <button
                        onClick={() => {
                          onSelectCoordinates(incident.lat, incident.lng);
                          setIsOpen(false);
                        }}
                        className="text-[9px] text-emerald-600 font-bold bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded flex items-center gap-1 border border-emerald-100 cursor-pointer transition-colors"
                      >
                        <MapPin className="w-3 h-3" />
                        LOCATE ON SAT MAP
                      </button>
                    )}
                  </div>
                ))
              )
            )}
          </div>

          {/* Footer banner */}
          <div className="bg-slate-50 px-4 py-2 text-[9px] text-slate-400 text-center font-sans border-t border-slate-100">
            Real-time feed encrypted and synchronized with Meghalaya Police Command.
          </div>
        </div>
      )}
    </div>
  );
};
