import MapplsMap from "./MapplsMap";
import { motion } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, AlertOctagon, Phone, RefreshCw, MapPin, Camera,
  Trash2, Plus, Database, Link, Lock, Search, HeartPulse, Volume2, VolumeX,
  ShieldAlert, Radio, CheckCircle2, Cloud, Thermometer, Wind, Newspaper
} from 'lucide-react';
import { Tourist, GeoFence, BlockchainBlock, DisasterNews } from '../types';
import { IncidentTimeline } from "./IncidentTimeline";

// MapCircle helper for Admin Map circles



export default function AdminView({ googleMapsApiKey }: { googleMapsApiKey: string }) {
  const [tourists, setTourists] = useState<Tourist[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [trackedTouristId, setTrackedTouristId] = useState<string | null>(null);
  const trackedTouristIdRef = useRef<string | null>(null);

  useEffect(() => {
    trackedTouristIdRef.current = trackedTouristId;
  }, [trackedTouristId]);

  const [geoFences, setGeoFences] = useState<GeoFence[]>([]);
  const [blockchain, setBlockchain] = useState<BlockchainBlock[]>([]);
  const [weatherAlert, setWeatherAlert] = useState<{ status: string; code: number; color: string; temperature: number; windspeed: number; containerClass: string; dotClass: string; iconClass: string; placeName: string; forecast: { time: string, temp: number, code: number }[] } | null>(null);
  const [weatherSearchQuery, setWeatherSearchQuery] = useState("");
  const [weatherCoords, setWeatherCoords] = useState({lat: 25.5788, lng: 91.8933, name: "Shillong"});
  
  // New fence form state
  const [newFenceName, setNewFenceName] = useState('');
  const [newFenceType, setNewFenceType] = useState<'safe' | 'danger'>('danger');
  const [newFenceLat, setNewFenceLat] = useState('25.5788');
  const [newFenceLng, setNewFenceLng] = useState('91.8933');
  const [newFenceRadius, setNewFenceRadius] = useState('1000');
  const [fenceFormError, setFenceFormError] = useState('');
  const [isDeployingFence, setIsDeployingFence] = useState(false);

  // Sound control for SOS alarm
  const [isSirenMuted, setIsSirenMuted] = useState(true);
  const [activeSOSCount, setActiveSOSCount] = useState(0);
  const [lastSosId, setLastSosId] = useState<string | null>(null);

  // Phone Tracking states
  const [isCellLocked, setIsCellLocked] = useState(false);
  const [trackedPhoneNumber, setTrackedPhoneNumber] = useState('');
  
  // QR Checkpoint Scanner states
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [selectedScannerId, setSelectedScannerId] = useState('');
  const [scannedTourist, setScannedTourist] = useState<Tourist | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [incidentReports, setIncidentReports] = useState<any[]>([]);

  // Global Emergency Broadcast system states
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [newBroadcastMessage, setNewBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'warning' | 'info' | 'critical'>('warning');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Safety Hub News and Advisories states
  const [safetyNews, setSafetyNews] = useState<DisasterNews[]>([]);
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsMessage, setNewNewsMessage] = useState('');
  const [newNewsCategory, setNewNewsCategory] = useState('Weather Warning');
  const [newNewsSeverity, setNewNewsSeverity] = useState<'info' | 'warning' | 'critical'>('warning');
  const [isPublishingNews, setIsPublishingNews] = useState(false);
  const [newsError, setNewsError] = useState('');

  // QR Code automatic rotation states
  const [qrNonce, setQrNonce] = useState(Date.now().toString());
  const [qrCountdown, setQrCountdown] = useState(15);

  // Map center (Defaults to Shillong)
  const [mapCenter, setMapCenter] = useState({ lat: 25.5788, lng: 91.8933 });
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${weatherCoords.lat}&longitude=${weatherCoords.lng}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=1`);
        if (res.ok) {
          const data = await res.json();
          const code = data.current_weather.weathercode;
          let status = 'Clear / Safe';
          let color = 'emerald';
          let containerClass = 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-sm';
          let dotClass = 'bg-emerald-600';
          let iconClass = 'text-emerald-700';

          if (code >= 1 && code <= 3) {
            status = 'Cloudy / Fair';
            color = 'blue';
            containerClass = 'bg-blue-50/95 border-blue-200 text-blue-950 shadow-sm';
            dotClass = 'bg-blue-600';
            iconClass = 'text-blue-700';
          } else if (code >= 51 && code <= 67) {
            status = 'Rain Alert: Wet Trails';
            color = 'amber';
            containerClass = 'bg-amber-50/95 border-amber-200 text-amber-950 shadow-sm';
            dotClass = 'bg-amber-600';
            iconClass = 'text-amber-700';
          } else if (code >= 71 && code <= 86) {
            status = 'Snow / Hail Alert';
            color = 'red';
            containerClass = 'bg-red-50/95 border-red-200 text-red-950 shadow-sm';
            dotClass = 'bg-red-600';
            iconClass = 'text-red-700';
          } else if (code >= 95) {
            status = 'Thunderstorm Warning';
            color = 'red';
            containerClass = 'bg-red-100/95 border-red-300 text-red-950 shadow-sm';
            dotClass = 'bg-red-600';
            iconClass = 'text-red-800';
          }

          // Parse hourly forecast
          const forecastList: { time: string; temp: number; code: number }[] = [];
          if (data.hourly && data.hourly.time && data.hourly.temperature_2m) {
            for (let i = 0; i < data.hourly.time.length; i++) {
              const date = new Date(data.hourly.time[i]);
              const hour = date.getHours();
              // Extract a few standard intervals
              if (hour === 9 || hour === 13 || hour === 17 || hour === 21) {
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                forecastList.push({
                  time: timeStr,
                  temp: Math.round(data.hourly.temperature_2m[i]),
                  code: data.hourly.weathercode ? data.hourly.weathercode[i] : 0
                });
              }
            }
          }

          setWeatherAlert({ 
            status, 
            code, 
            color,
            temperature: data.current_weather.temperature,
            windspeed: data.current_weather.windspeed,
            containerClass,
            dotClass,
            iconClass,
            placeName: weatherCoords.name,
            forecast: forecastList
          });
        }
      } catch (e) {
        console.warn('Weather fetch failed', e);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [weatherCoords]);


  const searchWeatherLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weatherSearchQuery.trim()) return;
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherSearchQuery)}&count=1&language=en&format=json`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          setWeatherCoords({ lat: result.latitude, lng: result.longitude, name: result.name });
        } else {
          alert("Location not found");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Set up real-time SSE updates
  useEffect(() => {
    const eventSource = new EventSource('/api/sse');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'TOURIST_REGISTERED') {
          setTourists(prev => {
            if (prev.some(t => t.id === payload.data.id)) return prev;
            return [payload.data, ...prev];
          });
          fetchBlockchain();
        } else if (payload.type === 'LOCATION_UPDATED') {
          setTourists(prev => prev.map(t => t.id === payload.data.touristId ? { ...t, ...payload.data } : t));
          // Auto-track the tourist on the map in real-time if selected
          if (trackedTouristIdRef.current === payload.data.touristId) {
            setMapCenter({ lat: payload.data.lat, lng: payload.data.lng });
          }
        } else if (payload.type === 'SOS_UPDATED') {
          setTourists(prev => {
            const updated = prev.map(t => t.id === payload.data.touristId ? { ...t, sosActive: payload.data.sosActive, sosTime: payload.data.sosTime } : t);
            const activeSosTourists = updated.filter(t => t.sosActive);
            setActiveSOSCount(activeSosTourists.length);
            return updated;
          });
          fetchBlockchain();
        } else if (payload.type === 'REPORT_SUBMITTED') {
          setIncidentReports(prev => {
            if (prev.some(r => r.id === payload.data.id)) return prev;
            return [payload.data, ...prev];
          });
          fetchBlockchain();
        } else if (payload.type === 'REPORT_RESOLVED') {
          setIncidentReports(prev => prev.map(r => r.id === payload.data.id ? { ...r, status: 'resolved' } : r));
          fetchBlockchain();
        } else if (payload.type === 'ALERT_BROADCAST') {
          setActiveAlerts(prev => {
            if (prev.some(a => a.id === payload.data.id)) return prev;
            return [payload.data, ...prev];
          });
          fetchBlockchain();
        } else if (payload.type === 'ALERT_CLEARED') {
          if (payload.data.alertId) {
            setActiveAlerts(prev => prev.filter(a => a.id !== payload.data.alertId));
          } else {
            setActiveAlerts([]);
          }
          fetchBlockchain();
        } else if (payload.type === 'TOURIST_REMOVED') {
          setTourists(prev => {
            const updated = prev.filter(t => t.id !== payload.data.id);
            const activeSosTourists = updated.filter(t => t.sosActive);
            setActiveSOSCount(activeSosTourists.length);
            return updated;
          });
          fetchBlockchain();
        } else if (payload.type === 'NEWS_UPDATED') {
          setSafetyNews(payload.data);
          fetchBlockchain();
        }
      } catch (err) {
        console.error('Failed to parse SSE event', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE stream disconnected, retrying...', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Handle automatic QR code rotation countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setQrCountdown(prev => {
        if (prev <= 1) {
          setQrNonce(Math.random().toString(36).substring(2, 10).toUpperCase());
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchBlockchain = async () => {
    try {
      const bRes = await fetch('/api/blockchain');
      if (bRes.ok) {
        const bData = await bRes.json();
        setBlockchain(bData);
      }
    } catch (e) {}
  };

  // Load state on mount and poll
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 3000);
    return () => clearInterval(interval);
  }, [isCellLocked, trackedPhoneNumber, lastSosId]);

  // SOS Audio Alarm Synthesizer Effect (beeps repeatedly if any SOS is active and not muted)
  useEffect(() => {
    let alarmTimer: any = null;
    let audioCtx: AudioContext | null = null;

    if (activeSOSCount > 0 && !isSirenMuted) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();

        const playBeep = () => {
          if (!audioCtx || audioCtx.state === 'closed') return;
          const now = audioCtx.currentTime;
          
          // Two-tone emergency siren
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(880, now); // A5 tone
          osc1.frequency.linearRampToValueAtTime(1100, now + 0.3);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(440, now); // A4 tone
          osc2.frequency.linearRampToValueAtTime(550, now + 0.3);

          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtx.destination);

          osc1.start(now);
          osc1.stop(now + 0.4);
          osc2.start(now);
          osc2.stop(now + 0.4);
        };

        alarmTimer = setInterval(playBeep, 1000);
      } catch (e) {
        console.warn('Fails to initialize alert synthesizer');
      }
    }

    return () => {
      if (alarmTimer) clearInterval(alarmTimer);
      if (audioCtx) audioCtx.close();
    };
  }, [activeSOSCount, isSirenMuted]);

  const fetchAllData = async () => {
    try {
      // 1. Fetch Tourists
      const tRes = await fetch('/api/tourists');
      if (tRes.ok) {
        const tData: Tourist[] = await tRes.json();
        setTourists(tData);
        
        // Count active SOS alerts
        const activeSosTourists = tData.filter(t => t.sosActive);
        setActiveSOSCount(activeSosTourists.length);

        // Auto-center map on new SOS activations
        if (activeSosTourists.length > 0) {
          const firstSos = activeSosTourists[0];
          if (firstSos.id !== lastSosId) {
            setMapCenter({ lat: firstSos.lat, lng: firstSos.lng });
            setMapZoom(15);
            setLastSosId(firstSos.id);
          }
        } else {
          setLastSosId(null);
        }

        // Live Cellular Phone Tracking: auto-panning map center in real-time
        if (isCellLocked && trackedPhoneNumber) {
          const matchedTourist = tData.find(t => t.phone.replace(/\s+/g, '') === trackedPhoneNumber.replace(/\s+/g, ''));
          if (matchedTourist) {
            setMapCenter({ lat: matchedTourist.lat, lng: matchedTourist.lng });
          }
        }
      }

      // 2. Fetch Geo-fences
      const fRes = await fetch('/api/geofences');
      if (fRes.ok) {
        const fData = await fRes.json();
        setGeoFences(fData);
      }

      // 3. Fetch Blockchain
      const bRes = await fetch('/api/blockchain');
      if (bRes.ok) {
        const bData = await bRes.json();
        setBlockchain(bData);
      }

      // 4. Fetch Broadcast Alerts
      const aRes = await fetch('/api/alerts');
      if (aRes.ok) {
        const aData = await aRes.json();
        setActiveAlerts(aData);
      }

      // 5. Fetch Incident Reports
      const rRes = await fetch('/api/reports');
      if (rRes.ok) {
        const rData = await rRes.json();
        setIncidentReports(rData);
      }

      // 6. Fetch Safety News
      const newsRes = await fetch('/api/disaster-news');
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        setSafetyNews(newsData);
      }
    } catch (e) {
      console.log('Failed to fetch data from Express server');
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      const res = await fetch('/api/reports/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId })
      });
      if (res.ok) {
        setIncidentReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      }
    } catch (e) {
      console.error('Failed to resolve report', e);
    }
  };

  const handleCreateFence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFenceName.trim() || !newFenceRadius || !newFenceLat || !newFenceLng) {
      setFenceFormError('All fields are required to deploy a fence.');
      return;
    }

    setFenceFormError('');
    setIsDeployingFence(true);

    try {
      const res = await fetch('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFenceName,
          type: newFenceType,
          lat: parseFloat(newFenceLat),
          lng: parseFloat(newFenceLng),
          radius: parseFloat(newFenceRadius),
        })
      });

      if (res.ok) {
        setNewFenceName('');
        setMapCenter({ lat: parseFloat(newFenceLat), lng: parseFloat(newFenceLng) });
        fetchAllData();
      } else {
        setFenceFormError('Failed to create geo-fence.');
      }
    } catch (err) {
      setFenceFormError('Network communication error.');
    } finally {
      setIsDeployingFence(false);
    }
  };

  const handleDeleteFence = async (id: string) => {
    try {
      const res = await fetch(`/api/geofences/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error('Failed to remove geo-fence', e);
    }
  };

  const handleResolveSos = async (tId: string) => {
    try {
      const res = await fetch('/api/tourists/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId: tId,
          active: false
        })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error('Failed to resolve SOS', e);
    }
  };

  const handleRemoveTourist = (tId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Checkout & De-register Hiker',
      message: 'Are you sure you want to remove this tourist from the Shillong operations center? This action checks out/de-registers their digital passport and is stored securely.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tourists/${tId}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setTourists(prev => prev.filter(t => t.id !== tId));
            const removedT = tourists.find(t => t.id === tId);
            if (removedT && trackedPhoneNumber === removedT.phone) {
              setIsCellLocked(false);
              setTrackedPhoneNumber('');
            }
            
            // Forceful local logout of this tourist
            const cached = localStorage.getItem('safetour_tourist');
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (parsed.id === tId) {
                  localStorage.removeItem('safetour_tourist');
                  window.dispatchEvent(new Event('storage'));
                  window.dispatchEvent(new CustomEvent('safetour_logout', { detail: { id: tId } }));
                }
              } catch (e) {}
            }
          } else {
            const errData = await res.json();
            alert(errData.error || 'Failed to remove tourist.');
          }
        } catch (e) {
          console.error('Failed to remove tourist', e);
        }
      }
    });
  };

  const handleLogoutAllTourists = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Hiker Checkout',
      message: 'Are you sure you want to log out all tourists and clear all active portal sessions? This will instantly de-register and sign out every connected tourist.',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/tourists/logout-all', {
            method: 'POST',
          });
          if (res.ok) {
            setTourists([]);
            setIsCellLocked(false);
            setTrackedPhoneNumber('');
            
            // Clear locally cached tourist session and dispatch logout event
            localStorage.removeItem('safetour_tourist');
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('safetour_logout', { detail: { allCleared: true } }));
          } else {
            const errData = await res.json();
            alert(errData.error || 'Failed to logout tourists.');
          }
        } catch (e) {
          console.error('Failed to logout all tourists', e);
        }
      }
    });
  };

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBroadcastMessage.trim()) {
      setBroadcastError('Broadcast message cannot be empty.');
      return;
    }
    setBroadcastError('');
    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newBroadcastMessage,
          severity: broadcastSeverity,
        }),
      });
      if (res.ok) {
        setNewBroadcastMessage('');
        fetchAllData();
      } else {
        setBroadcastError('Failed to send global broadcast alert.');
      }
    } catch (err) {
      setBroadcastError('Network communication error.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleClearBroadcast = async (alertId?: string) => {
    try {
      const res = await fetch('/api/alerts/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error('Failed to clear alert broadcast', e);
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle.trim() || !newNewsMessage.trim()) {
      setNewsError('Title and message are required.');
      return;
    }
    setNewsError('');
    setIsPublishingNews(true);
    try {
      const res = await fetch('/api/disaster-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNewsTitle,
          message: newNewsMessage,
          category: newNewsCategory,
          severity: newNewsSeverity,
        })
      });
      if (res.ok) {
        setNewNewsTitle('');
        setNewNewsMessage('');
        setNewNewsCategory('Weather Warning');
        setNewNewsSeverity('warning');
        fetchAllData();
      } else {
        setNewsError('Failed to publish news advisory.');
      }
    } catch (err) {
      setNewsError('Network communication error.');
    } finally {
      setIsPublishingNews(false);
    }
  };

  const handleDeleteNews = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Archive Advisory',
      message: 'Are you sure you want to archive and remove this safety advisory? This action is logged permanently on the blockchain.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/disaster-news/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            fetchAllData();
          }
        } catch (err) {
          console.error('Failed to delete safety news', err);
        }
      }
    });
  };

  const handleLocateOnMap = (tourist: Tourist) => {
    setTrackedTouristId(tourist.id);
    setMapCenter({ lat: tourist.lat, lng: tourist.lng });
    setMapZoom(15);
  };

  const filteredTourists = tourists.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.phone.includes(searchQuery) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 p-4 lg:p-8">
      {/* Developed By Banner */}
      <div className="w-full text-center py-2.5 text-sm font-sans font-black text-slate-700 bg-white/70 border border-slate-200 rounded-xl mb-4 shadow-xs uppercase tracking-wider">
        Developed by Abhay Chavadi, Choudari Lalithya, Vaibhavi, Nandita, Pavan, Ramya V R
      </div>
      
      {/* SOS DISPATCH WARNING ALARM PANEL */}
      {activeSOSCount > 0 && (
        <div className="p-6 rounded-2xl border border-red-500 bg-red-650 text-white animate-pulse flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
          <div className="absolute inset-y-0 left-0 w-3 bg-red-900" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-800 rounded-full text-white animate-bounce">
              <AlertOctagon className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-black font-sans uppercase tracking-wider">
                CRITICAL INCIDENT RESPONDER BROADCAST ACTIVE
              </h2>
              <p className="text-sm font-sans font-extrabold text-red-100 mt-1">
                {activeSOSCount} Tourist(s) transmitting emergency distress signals. Drone tracking units and rangers pre-dispatched.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSirenMuted(!isSirenMuted)}
              className="px-5 py-2.5 rounded-xl border border-red-400 bg-red-800 hover:bg-red-900 text-white font-sans text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {isSirenMuted ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>UNMUTE CHIME</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 animate-ping" />
                  <span>MUTE CHIME</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Automated Weather Notification Banner */}
      {weatherAlert && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`xl:col-span-12 w-full py-3 px-5 rounded-xl border transition-all duration-300 text-sm font-sans flex flex-col xl:flex-row items-center justify-between backdrop-blur-md ${weatherAlert.containerClass}`}
        >
          <div className="flex items-center gap-4 mb-2 xl:mb-0 w-full xl:w-auto justify-between xl:justify-start">
            <div className="flex items-center gap-2 font-black">
              <Cloud className={`w-5 h-5 animate-pulse ${weatherAlert.iconClass}`} />
              <span className="font-black tracking-widest text-base">{weatherAlert?.placeName?.toUpperCase() || 'UNKNOWN'}: {weatherAlert?.status?.toUpperCase() || ''}</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 border-l border-current/20 pl-4 font-extrabold">
              <span className="flex items-center gap-1.5 text-base"><Thermometer className={`w-4 h-4 ${weatherAlert.iconClass}`} /> {weatherAlert.temperature}°C</span>
              <span className="flex items-center gap-1.5 text-base"><Wind className={`w-4 h-4 ${weatherAlert.iconClass}`} /> {weatherAlert.windspeed} km/h</span>
            </div>
          </div>
          
          {weatherAlert.forecast && weatherAlert.forecast.length > 0 && (
            <div className="flex items-center gap-4 text-xs sm:text-sm mb-2 xl:mb-0">
              <span className="hidden sm:inline font-black opacity-85">TODAY'S FORECAST:</span>
              <div className="flex items-center gap-4 bg-white/80 border border-current/15 px-4 py-1.5 rounded-full shadow-sm">
                {weatherAlert.forecast.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 border-r border-current/15 pr-4 last:border-0 last:pr-0">
                    <span className="opacity-75 font-bold">{f.time}</span>
                    <span className="font-black">{f.temp}°</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={searchWeatherLocation} className="flex flex-wrap items-center gap-2 text-xs font-sans font-black text-slate-800 w-full xl:w-auto justify-end">
            <input type="text" value={weatherSearchQuery} onChange={e => setWeatherSearchQuery(e.target.value)} placeholder="Enter city..." className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 font-bold transition-colors shadow-xs" />
            <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border border-emerald-500 font-black cursor-pointer shadow-xs">SEARCH</button>
            <span className="ml-2 hidden sm:inline font-black tracking-wide text-[11px] text-slate-500">LIVE METEO SYNC</span>
            <div className={`w-2 h-2 rounded-full animate-pulse ${weatherAlert.dotClass}`} />
          </form>
        </motion.div>
      )}      {/* TOURIST DISPATCH TERMINAL & ONBOARDING (TOP SECTION) */}

      {/* DISPATCH TERMINAL QR ONBOARDING (XL: 5 COLS) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="xl:col-span-5 p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-sans font-black text-white uppercase tracking-wider">
                TOURIST DISPATCH TERMINAL
              </h3>
            </div>
            <p className="text-sm font-sans text-white font-bold leading-relaxed">
              Provide tourists with instant digital passport check-in. Have them scan the dynamic QR code with their mobile device camera.
            </p>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-2 font-sans text-xs text-slate-100 font-extrabold">
              <div className="flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Fast, Zero-install mobile onboarding
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Capture ID, nationality, and duration
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant real-time dashboard sync
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-white/10">
            <div className="flex flex-col items-center gap-2 p-2.5 bg-[#0a0e10] border border-white/15 rounded-xl shadow-xl shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&color=000000&bgcolor=ffffff&data=${encodeURIComponent(
                  typeof window !== 'undefined' ? `${window.location.href.split('?')[0]}?view=tourist&t=${qrNonce}` : ''
                )}`}
                alt="Dynamic Tourist Portal QR"
                className="w-28 h-28 rounded border border-emerald-500/20 p-1 bg-white transition-all duration-300 transform hover:scale-105"
              />
              <span className="text-[10px] font-sans font-black text-emerald-300 uppercase tracking-widest text-center animate-pulse">
                SCAN FOR MOBILE ENTRY
              </span>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    // Update URL and trigger redirection to the tourist view with the QR nonce
                    const targetUrl = `${window.location.origin}${window.location.pathname}?view=tourist&t=${qrNonce}`;
                    window.history.pushState({ path: targetUrl }, '', targetUrl);
                    // Dispatch popstate event so App.tsx detects it immediately
                    window.dispatchEvent(new Event('popstate'));
                  }
                }}
                className="mt-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-lg text-[9px] cursor-pointer font-black uppercase transition-all shadow-md w-full text-center hover:scale-[1.03] active:scale-95"
                title="Simulate scanning this QR code in your browser"
              >
                🖱️ SIMULATE SCAN
              </button>
            </div>
            <div className="space-y-2 text-left min-w-0 flex-1">
              <div className="text-xs text-slate-100 font-sans font-extrabold leading-relaxed">
                Onboard hikers, tourists, and wilderness guides to Shillong operations central.
              </div>

              {/* Dynamic QR Security Monitor */}
              <div className="p-3 rounded-lg bg-slate-900 border border-white/10 space-y-1.5 font-sans text-xs font-extrabold">
                <div className="flex items-center justify-between text-slate-200">
                  <span className="flex items-center gap-1 font-black">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    SECURE ROTATION ENGINE:
                  </span>
                  <span className="font-black text-emerald-300">{qrCountdown}s</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-full transition-all duration-1000 ease-linear" 
                    style={{ width: `${(qrCountdown / 15) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-300 font-bold">
                  <span className="truncate font-mono">NONCE: {qrNonce}</span>
                  <button 
                    onClick={() => {
                      setQrNonce(Math.random().toString(36).substring(2, 10).toUpperCase());
                      setQrCountdown(15);
                    }}
                    className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/45 text-emerald-300 hover:text-emerald-100 rounded text-[9px] cursor-pointer font-black uppercase transition-colors"
                  >
                    ROTATE NOW
                  </button>
                </div>
              </div>

              <div className="text-[10px] sm:text-xs text-slate-300 font-sans font-bold select-all break-all leading-tight">
                Portal Link: <span className="text-slate-100 underline font-black">{typeof window !== 'undefined' ? `${window.location.href.split('?')[0]}?view=tourist` : ''}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* REGISTERED TOURISTS LIST (XL: 7 COLS) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="xl:col-span-7 p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col"
        >
          <div className="flex flex-col flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-sans font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-emerald-400" /> REGISTERED TOURIST PORTAL
                </h3>
                <p className="text-xs font-sans text-slate-200 font-bold">
                  Hikers who checked in and registered their digital passport via the Dispatch QR Code.
                </p>
              </div>

              {/* Filter Search & Logout All */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search registered guests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-2.5 py-1.5 bg-slate-900 text-white border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded text-xs transition-all font-sans font-bold placeholder:text-slate-400"
                  />
                </div>
                <button
                  onClick={handleLogoutAllTourists}
                  disabled={tourists.length === 0}
                  className="px-3.5 py-1.5 bg-red-900 hover:bg-red-800 border border-red-500 hover:border-red-400 text-white disabled:opacity-30 disabled:hover:bg-red-950 text-xs font-sans uppercase font-black tracking-wider cursor-pointer rounded-lg transition-all shrink-0 shadow-md"
                  title="Force check out and log out all active tourist sessions"
                >
                  LOGOUT ALL
                </button>
              </div>
            </div>

            {/* Tourist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1">
              {filteredTourists.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-300 font-sans text-sm font-black border border-dashed border-white/20 bg-slate-950/40 rounded-xl">
                  NO REGISTERED TOURISTS IN PORTAL YET.
                </div>
              ) : (
                filteredTourists.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => handleLocateOnMap(t)}
                    className={`p-3.5 rounded-xl border relative overflow-hidden transition-all duration-300 cursor-pointer ${
                      trackedTouristId === t.id
                        ? 'border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.15)] text-slate-100'
                        : t.sosActive 
                        ? 'border-red-500 bg-red-900 text-white animate-pulse shadow-md' 
                        : 'border-white/10 bg-slate-900 text-slate-100 hover:border-emerald-500 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex gap-2.5 items-start">
                      <img 
                        src={t.facePhoto} 
                        alt={t.name} 
                        className="w-12 h-12 rounded-lg object-cover border border-white/10 bg-black shrink-0"
                      />
                      <div className="space-y-1 font-sans text-xs flex-1 min-w-0 font-bold">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-black text-white text-sm block truncate flex items-center gap-1.5">
                            {trackedTouristId === t.id && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                            )}
                            {t.name}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 ${
                            t.sosActive 
                            ? 'bg-red-600 text-white animate-pulse' 
                            : t.offlineMode 
                            ? 'bg-amber-900 text-amber-100 border border-amber-400' 
                            : 'bg-emerald-900 text-emerald-100 border border-emerald-400'
                          }`}>
                            {t.sosActive ? 'SOS ALARM' : t.offlineMode ? 'OFFLINE' : 'LIVE'}
                          </span>
                        </div>
                        <div className="text-slate-200 truncate font-sans font-bold">PHONE: {t.phone}</div>
                        <div className="text-slate-300 flex items-center justify-between gap-1 mt-0.5">
                          <span className="text-[10px] font-bold">LAT: {t.lat.toFixed(5)} LNG: {t.lng.toFixed(5)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTourist(t.id);
                            }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 border border-red-400 text-white text-[10px] font-sans rounded font-black uppercase transition-all shrink-0 cursor-pointer shadow-sm"
                          >
                            CHECKOUT
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>




      
      {/* EMERGENCY OPERATIONS CENTRAL MAP */}
      <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden shadow-2xl mb-8">
        <h3 className="text-base font-sans font-black text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-5 h-5 text-emerald-400" /> EMERGENCY OPERATIONS CENTRAL MAP
        </h3>
        <div className="h-[520px] w-full rounded-2xl overflow-hidden relative border border-white/10 shadow-inner">
          <MapplsMap center={mapCenter} zoom={mapZoom} geoFences={geoFences} tourists={tourists} />
        </div>
      </div>

      {/* REAL-TIME INCIDENT & BROADCAST TIMELINE */}
      <div className="mb-8">
        <IncidentTimeline 
          incidentReports={incidentReports} 
          broadcasts={activeAlerts} 
          onSelectIncident={(lat, lng) => {
            setMapCenter({ lat, lng });
            setMapZoom(16);
          }} 
        />
      </div>

          
      {/* GPS SATELLITE CELLULAR LOCK & QR CHECKPOINT SCANNER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR CHECKPOINT SCANNER */}
            <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-sans font-black text-white mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-5 h-5 text-emerald-400" /> DIGITAL ID QR CHECKPOINT
                </h3>
                <p className="text-xs font-sans text-slate-200 mb-4 font-bold leading-relaxed">
                  Scan a tourist's dynamic QR code block to securely verify identities and extract telemetry readings.
                </p>
              </div>

              {/* Action area */}
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setIsQrScannerOpen(true);
                    setScanSuccess(false);
                    setScannedTourist(null);
                  }}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md border border-emerald-400"
                >
                  <Camera className="w-5 h-5" /> LAUNCH CHECKPOINT SCANNER
                </button>
              </div>
            </div>

            {/* LIVE CELLULAR GPS PHONE TRACKER */}
            <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-sans font-black text-white mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-5 h-5 text-emerald-400 animate-pulse" /> SATELLITE CELLULAR TRACKER
                </h3>
                <p className="text-xs font-sans text-slate-200 mb-4 font-bold leading-relaxed">
                  Lock on to any registered cellular contact frequency. Real-time GPS pings are automatically projected on the map.
                </p>
              </div>

              {/* Cellular Tracker Input & Display */}
              <div className="space-y-3 font-sans text-xs font-bold">
                {isCellLocked ? (
                  <div className="p-3 bg-emerald-950 border border-emerald-400 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] text-emerald-300 font-black uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> SATELLITE GPS LOCK-ON
                      </span>
                      <span className="text-sm text-white font-black block">{trackedPhoneNumber}</span>
                      {(() => {
                        const t = tourists.find(t => t.phone.replace(/\s+/g, '') === trackedPhoneNumber.replace(/\s+/g, ''));
                        return t ? (
                          <span className="text-[11px] text-slate-200 font-bold block truncate max-w-[150px]">
                            Tracking: {t.name} ({t.lat.toFixed(5)}, {t.lng.toFixed(5)})
                          </span>
                        ) : (
                          <span className="text-[11px] text-red-300 font-bold block">Out of grid range / Offline</span>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => {
                        setIsCellLocked(false);
                        setTrackedPhoneNumber('');
                      }}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white border border-red-400 font-black text-xs rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      BREAK LOCK
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={trackedPhoneNumber}
                      onChange={(e) => setTrackedPhoneNumber(e.target.value)}
                      className="flex-1 p-2.5 bg-slate-900 border border-white/10 text-white rounded-lg text-xs font-sans font-bold"
                    >
                      <option value="">-- SELECT PHONE --</option>
                      {tourists.map(t => (
                        <option key={t.id} value={t.phone}>{t.phone} ({t.name})</option>
                      ))}
                    </select>
                    <button
                      disabled={!trackedPhoneNumber}
                      onClick={() => {
                        setIsCellLocked(true);
                        // Center map on the tourist immediately when locking on
                        const t = tourists.find(t => t.phone === trackedPhoneNumber);
                        if (t) {
                          setMapCenter({ lat: t.lat, lng: t.lng });
                          setMapZoom(15);
                        }
                      }}
                      className="px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-black text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center shadow-sm border border-emerald-400"
                    >
                      LOCK ON
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GLOBAL EMERGENCY BROADCAST DISPATCH */}
          <div className="p-6 rounded-2xl border border-red-500 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Visual warning background pattern */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,#000_10px,#000_20px)] opacity-60" />
            
            <h3 className="text-base font-sans font-black text-red-400 mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" /> GLOBAL EMERGENCY BROADCAST DISPATCH
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Broadcast Trigger Form */}
              <form onSubmit={handleCreateBroadcast} className="space-y-4 font-sans text-xs font-bold">
                <div>
                  <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Select Alert Preset (Optional)</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewBroadcastMessage(e.target.value);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-red-500 rounded-lg text-xs font-sans font-bold cursor-pointer"
                  >
                    <option value="">-- SELECT PRESET ALERT --</option>
                    <option value="Severe weather warning: Storm front approaching Shillong. Take shelter immediately.">Severe Weather Warning</option>
                    <option value="Evacuation required: Landslide hazard detected in Shillong West. Exit immediately.">Evacuation Required</option>
                    <option value="Bear sighting warning: Wildlife rangers report active bear activity near Camp 4. Keep food secure.">Bear Sighting Warning</option>
                    <option value="Flash flood watch: Heavy rain in high country. Avoid crossing rivers or stream canyons.">Flash Flood Watch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Custom Alert Message</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="E.g., Avalanche warning or high wind warnings..."
                    value={newBroadcastMessage}
                    onChange={(e) => setNewBroadcastMessage(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg font-sans text-xs leading-relaxed font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Severity Level</label>
                    <select
                      value={broadcastSeverity}
                      onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-red-500 rounded-lg text-xs font-sans font-bold cursor-pointer"
                    >
                      <option value="warning">⚠️ WARNING</option>
                      <option value="critical">🚨 CRITICAL</option>
                      <option value="info">ℹ️ INFORMATION</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isBroadcasting}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md border border-red-500"
                    >
                      {isBroadcasting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>SENDING...</span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4 animate-pulse text-white" />
                          <span>SEND BROADCAST</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {broadcastError && (
                  <p className="text-xs text-red-400 font-black">{broadcastError}</p>
                )}
              </form>

              {/* Active Broadcasts List */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">ACTIVE TRANSMISSIONS</h4>
                    {activeAlerts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearBroadcast()}
                        className="text-[10px] text-red-300 hover:text-red-100 font-black uppercase border border-red-500 hover:border-red-400 px-2.5 py-1 rounded cursor-pointer transition-all bg-red-950/40 shadow-sm"
                      >
                        CLEAR ALL ALERTS
                      </button>
                    )}
                  </div>

                  {activeAlerts.length === 0 ? (
                    <div className="p-6 text-center border border-white/10 bg-slate-900 rounded-xl text-slate-400 text-xs font-sans font-black">
                      NO ACTIVE BROADCASTS CURRENTLY TRANSMITTING
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activeAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 rounded-xl border flex justify-between items-start gap-4 text-xs font-sans font-bold ${
                            alert.severity === 'critical'
                              ? 'border-red-400 bg-red-950 text-red-100'
                              : alert.severity === 'info'
                              ? 'border-blue-400 bg-blue-950 text-blue-100'
                              : 'border-yellow-400 bg-yellow-950 text-yellow-100'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-black text-[10px] uppercase">
                              <span className={`w-2 h-2 rounded-full ${
                                alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'info' ? 'bg-blue-500' : 'bg-yellow-500'
                              } animate-ping`} />
                              <span>{alert.severity} • {new Date(alert.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="font-sans leading-relaxed text-white text-xs font-black">{alert.message}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleClearBroadcast(alert.id)}
                            className="text-white hover:text-red-400 text-sm font-bold font-mono p-1 cursor-pointer transition-colors"
                            title="Remove Alert"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-900 border border-white/10 rounded-xl text-[10px] leading-relaxed text-slate-300 mt-4 font-bold">
                  🚨 <span className="text-white font-black">Broadcast Verification:</span> Sending a broadcast automatically generates a permanent emergency proof log.
                </div>
              </div>
            </div>
          </div>

          {/* GEO-FENCING CONTROLLER STATION */}
          <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            <h3 className="text-base font-sans font-black text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-5 h-5 text-emerald-400" /> DEPLOY REAL-TIME GEO-FENCE
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form creation */}
              <form onSubmit={handleCreateFence} className="space-y-4 font-sans text-xs font-bold">

                <div>
                  <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Fence Area Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Avalanche Slopes Warning"
                    value={newFenceName}
                    onChange={(e) => setNewFenceName(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded-lg text-xs font-sans font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Fence Type</label>
                    <select
                      value={newFenceType}
                      onChange={(e: any) => setNewFenceType(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded-lg text-xs font-sans font-bold cursor-pointer"
                    >
                      <option value="danger">DANGER ZONE</option>
                      <option value="safe">SAFE ZONE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Radius (Meters)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 800"
                      value={newFenceRadius}
                      onChange={(e) => setNewFenceRadius(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded-lg text-xs font-sans font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newFenceLat}
                      onChange={(e) => setNewFenceLat(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded-lg text-xs font-sans font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newFenceLng}
                      onChange={(e) => setNewFenceLng(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded-lg text-xs font-sans font-bold"
                    />
                  </div>
                </div>

                {fenceFormError && (
                  <div className="p-3 bg-red-950 border border-red-500 text-red-200 text-xs rounded-lg font-black">
                    {fenceFormError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isDeployingFence}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-400 shadow-md"
                >
                  <Plus className="w-5 h-5" /> DEPLOY GEO-FENCE SIGNAL TO BROADCAST
                </button>
              </form>

              {/* Geo-fence active list */}
              <div className="space-y-3 font-sans text-xs font-bold">
                <span className="block text-slate-200 font-sans uppercase text-[10px] font-black tracking-wide">CURRENT DEPLOYED SIGNAL FENCES</span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {geoFences.map(fence => (
                    <div 
                      key={fence.id} 
                      className={`p-3.5 rounded-xl border font-sans text-xs flex items-center justify-between ${
                        fence.type === 'safe' 
                        ? 'border-emerald-400 bg-emerald-950 text-emerald-100 font-black' 
                        : 'border-red-400 bg-red-950 text-red-100 font-black'
                      }`}
                    >
                      <div>
                        <span className="block font-black text-sm">{fence.name}</span>
                        <span className="text-[10px] text-slate-250">
                          LAT: {fence.lat.toFixed(4)}, LNG: {fence.lng.toFixed(4)} • {fence.radius}m
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteFence(fence.id)}
                        className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg border border-red-400 hover:text-white transition-all cursor-pointer shadow-sm"
                        title="Remove Geo-fence"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* INCIDENT REPORT / DISPATCH RADAR */}
          <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-sans font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-5 h-5 text-amber-500 animate-pulse" /> DISPATCH INCIDENT RADAR
              </h3>
              <div className="px-3 py-1 rounded-full bg-amber-500 border border-amber-600 font-sans text-[10px] text-white font-black uppercase tracking-wider animate-pulse shadow-sm">
                {incidentReports.filter(r => r.status === 'active').length} Active Reports
              </div>
            </div>

            {incidentReports.length === 0 ? (
              <div className="p-8 text-center border border-white/10 bg-slate-900 rounded-2xl text-slate-400 text-xs font-sans font-black">
                NO SUBMITTED INCIDENTS ON PATROL RADAR
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {incidentReports.map((report) => {
                  const matchTourist = tourists.find(t => t.id === report.touristId);
                  const isResolved = report.status === 'resolved';
                  
                  return (
                    <div 
                      key={report.id}
                      className={`p-4 rounded-xl border font-sans text-xs transition-all relative ${
                        isResolved 
                        ? 'border-emerald-500 bg-emerald-950/20 text-slate-300 font-bold' 
                        : 'border-amber-500 bg-amber-950/20 text-white font-bold'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2.5 h-2.5 rounded-full ${isResolved ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                            <span className="font-black text-sm uppercase tracking-wider text-white">
                              {matchTourist ? matchTourist.name : 'Guest Scout'}
                            </span>
                            {report.touristId && (
                              <span className="text-[10px] text-slate-300 font-black bg-slate-800 px-1.5 py-0.5 rounded">
                                ID: {report.touristId.substring(0, 8)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 font-bold">
                            COORD-TAG: <span className="text-white font-black underline cursor-pointer hover:text-emerald-400 bg-slate-900 px-2 py-0.5 rounded" onClick={() => {
                              setMapCenter({ lat: report.lat, lng: report.lng });
                              setMapZoom(16);
                            }}>{report.lat.toFixed(5)}, {report.lng.toFixed(5)}</span>
                          </p>
                        </div>
                        <div className="text-right text-[10px] text-slate-200 font-black bg-slate-800 px-2 py-0.5 rounded">
                          {new Date(report.timestamp).toLocaleTimeString()}
                        </div>
                      </div>

                      <p className="bg-slate-900 p-3 rounded-lg border border-white/15 text-xs text-white font-bold leading-relaxed mb-3">
                        {report.message}
                      </p>

                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setMapCenter({ lat: report.lat, lng: report.lng });
                            setMapZoom(16);
                          }}
                          className="px-3 py-1.5 text-[10px] font-black font-sans border border-white hover:border-emerald-500 text-white hover:text-emerald-400 rounded-lg transition-all cursor-pointer bg-slate-900/60 flex items-center gap-1 shadow-sm"
                        >
                          <MapPin className="w-3.5 h-3.5" /> TRACK LOCATION
                        </button>

                        {!isResolved && (
                          <button
                            type="button"
                            onClick={() => handleResolveReport(report.id)}
                            className="px-3.5 py-1.5 text-[10px] font-black font-sans bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md cursor-pointer flex items-center gap-1 transition-all border border-emerald-400"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> MARK RESOLVED
                          </button>
                        )}

                        {isResolved && (
                          <span className="text-[10px] font-black text-emerald-300 flex items-center gap-1 bg-emerald-950 border border-emerald-500 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> RESOLVED & ARCHIVED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SAFETY HUB NEWS & ADVISORIES DISPATCH */}
          <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Visual background ambient light */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <h3 className="text-base font-sans font-black text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <Newspaper className="w-5 h-5 text-emerald-400" /> SAFETY HUB NEWS & ADVISORIES
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* News Publish Form */}
              <form onSubmit={handleCreateNews} className="space-y-4 font-sans text-xs font-bold">
                <div>
                  <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Advisory Headline / Title</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., 🚨 HEAVY RAINFALL IN SHILLONG"
                    value={newNewsTitle}
                    onChange={(e) => setNewNewsTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded-lg text-xs font-sans font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Category</label>
                  <select
                    value={newNewsCategory}
                    onChange={(e) => setNewNewsCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded-lg text-xs font-sans font-bold cursor-pointer"
                  >
                    <option value="Weather Warning">Weather Warning</option>
                    <option value="Road & Travel">Road & Travel</option>
                    <option value="Local Safety">Local Safety</option>
                    <option value="System Announcement">System Announcement</option>
                    <option value="General Safety">General Safety</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Severity Level</label>
                    <select
                      value={newNewsSeverity}
                      onChange={(e) => setNewNewsSeverity(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded-lg text-xs font-sans font-bold cursor-pointer"
                    >
                      <option value="info">ℹ️ INFO</option>
                      <option value="warning">⚠️ WARNING</option>
                      <option value="critical">🚨 CRITICAL</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isPublishingNews}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md border border-emerald-500"
                    >
                      {isPublishingNews ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>PUBLISHING...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-white" />
                          <span>PUBLISH ADVISORY</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-200 uppercase text-[10px] mb-1.5 font-black tracking-wide">Detailed Advisory Message</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide full description and travel advice for tourists..."
                    value={newNewsMessage}
                    onChange={(e) => setNewNewsMessage(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg font-sans text-xs leading-relaxed font-bold"
                  />
                </div>

                {newsError && (
                  <p className="text-xs text-red-400 font-black">{newsError}</p>
                )}
              </form>

              {/* Active News List */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">CURRENT ACTIVE ADVISORIES</h4>
                    <div className="px-2.5 py-1 rounded bg-slate-900 border border-white/10 text-[10px] text-emerald-400 font-black">
                      {safetyNews.length} Active
                    </div>
                  </div>

                  {safetyNews.length === 0 ? (
                    <div className="p-8 text-center border border-white/10 bg-slate-900 rounded-xl text-slate-400 text-xs font-sans font-black">
                      NO SAFETY HUB NEWS CURRENTLY PUBLISHED
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[310px] overflow-y-auto pr-1">
                      {safetyNews.map((newsItem) => (
                        <div
                          key={newsItem.id}
                          className={`p-3.5 rounded-xl border flex justify-between items-start gap-4 text-xs font-sans font-bold ${
                            newsItem.severity === 'critical'
                              ? 'border-red-400 bg-red-950/20 text-red-100'
                              : newsItem.severity === 'info'
                              ? 'border-blue-400 bg-blue-950/20 text-blue-100'
                              : 'border-yellow-400 bg-yellow-950/20 text-yellow-100'
                          }`}
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 font-black text-[10px] uppercase">
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                newsItem.severity === 'critical' ? 'bg-red-500 animate-pulse' : newsItem.severity === 'info' ? 'bg-blue-500' : 'bg-yellow-500'
                              }`} />
                              <span>{newsItem.category} • {new Date(newsItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <h4 className="font-sans leading-relaxed text-white text-xs font-black truncate">{newsItem.title}</h4>
                            <p className="font-sans text-[11px] text-slate-300 font-bold leading-normal">{newsItem.message}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteNews(newsItem.id)}
                            className="text-slate-400 hover:text-red-400 p-1.5 bg-slate-900 hover:bg-slate-850 rounded-lg border border-white/10 transition-colors shrink-0 cursor-pointer"
                            title="Archive Advisory"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-900 border border-white/10 rounded-xl text-[10px] leading-relaxed text-slate-300 mt-4 font-bold">
                  📢 <span className="text-white font-black">Safety Hub Broadcast:</span> News published here instantly broadcasts to all tourist devices connected to the Safety Hub in real-time.
                </div>
              </div>
            </div>
          </div>

      {/* QR CHECKPOINT SCANNER MODAL */}
      {isQrScannerOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono">
          <div className="bg-[#090d0e] border border-white/10 p-6 rounded-2xl max-w-md w-full relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-scaleUp">
            
            {/* Corner styling brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-500/40" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500/40" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500/40" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-500/40" />

            <button 
              onClick={() => {
                setIsQrScannerOpen(false);
                setScannedTourist(null);
                setScanSuccess(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            <div className="mb-4 text-center">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Shield className="w-4 h-4" /> CHECKPOINT PASSPORT DECODER
              </h3>
              <p className="text-[10px] text-slate-400">BIOMETRIC DECRYPTION HUB</p>
            </div>

            {!scanSuccess ? (
              <div className="space-y-6">
                {/* Simulated Lens Area */}
                <div className="relative h-48 bg-slate-950 rounded-xl border border-emerald-500/20 overflow-hidden flex flex-col items-center justify-center">
                  {scannerLoading ? (
                    <div className="space-y-3 text-center z-10">
                      <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-400 font-bold animate-pulse block">DECRYPTING BLOCK DATA...</span>
                        <span className="text-[8px] text-slate-500 block">SHA-256 HASH RESOLUTION IN PROGRESS</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 z-10 px-4">
                      <Camera className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
                      <span className="text-[10px] text-slate-400 block">SELECT DIGITAL ID PASSPORT TO SIMULATE CHECKPOINT DISPATCH</span>
                    </div>
                  )}

                  {/* Laser line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-scanline top-0" />
                  
                  {/* Scope target */}
                  <div className="absolute w-24 h-24 border border-dashed border-emerald-500/20 rounded-full animate-spin-slow pointer-events-none" />
                </div>

                {/* Simulation input form */}
                <div className="space-y-3">
                  <label className="block text-[10px] text-slate-400 uppercase">Simulate Camera Scanner Target</label>
                  <select
                    value={selectedScannerId}
                    onChange={(e) => setSelectedScannerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 text-white rounded text-xs"
                    disabled={scannerLoading}
                  >
                    <option value="">-- SELECT REGISTERED TOURIST --</option>
                    {tourists.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (ID: {t.id.slice(0, 10)}...)
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={async () => {
                      if (!selectedScannerId) return;
                      setScannerLoading(true);
                      
                      // Play scanner chime if possible
                      try {
                        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                        const ctx = new AudioContextClass();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.frequency.setValueAtTime(1200, ctx.currentTime);
                        gain.gain.setValueAtTime(0.05, ctx.currentTime);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.1);
                      } catch (e) {}

                      // Mock decoding processing
                      await new Promise(resolve => setTimeout(resolve, 1800));
                      
                      const found = tourists.find(t => t.id === selectedScannerId);
                      if (found) {
                        setScannedTourist(found);
                        setScanSuccess(true);
                      }
                      setScannerLoading(false);
                    }}
                    disabled={!selectedScannerId || scannerLoading}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-stone-950 font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {scannerLoading ? 'DECODING QR PASSPORT...' : 'TRIGGER SIMULATED QR CAMERA SCAN'}
                  </button>
                </div>
              </div>
            ) : (
              /* DECODED RESULT PROFILE */
              <div className="space-y-5">
                <div className="p-3 bg-emerald-950/15 border border-emerald-500/30 rounded-xl text-center flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs text-emerald-400 font-bold">DIGITAL ID VERIFICATION SUCCESSFUL</span>
                </div>

                {scannedTourist && (
                  <div className="space-y-4">
                    {/* ID Card Display */}
                    <div className="p-4 rounded-xl border border-white/10 bg-black/40 relative overflow-hidden">
                      <div className="flex gap-4 items-center">
                        <img 
                          src={scannedTourist.facePhoto} 
                          alt="Decoded avatar" 
                          className="w-16 h-16 rounded-lg object-cover border border-emerald-500/30 bg-slate-900" 
                        />
                        <div className="space-y-1 font-mono text-[11px] flex-1">
                          <div className="text-sm font-bold text-white tracking-wide">{scannedTourist.name}</div>
                          <div className="text-slate-400 text-[10px]">PHONE: {scannedTourist.phone}</div>
                          <div className="text-[9px] text-emerald-400 break-all leading-tight">ID: {scannedTourist.id}</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[9px] text-slate-400">
                        <div>
                          <span className="block text-slate-500 text-[8px]">BLOCK INDEX</span>
                          <span className="text-white font-semibold">#{scannedTourist.blockchainBlockIndex}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 text-[8px]">SAFE STANDING STATUS</span>
                          <span className={`font-semibold ${scannedTourist.sosActive ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                            {scannedTourist.sosActive ? 'DISTRESS SIGNALLING' : 'SECURE & VALID'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-slate-500 text-[8px]">LAST KNOWN GPS TELEMETRY</span>
                          <span className="text-white font-semibold flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-400" /> 
                            {scannedTourist.lat.toFixed(6)}, {scannedTourist.lng.toFixed(6)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setTrackedTouristId(scannedTourist.id);
                          setMapCenter({ lat: scannedTourist.lat, lng: scannedTourist.lng });
                          setMapZoom(15);
                          setIsQrScannerOpen(false);
                        }}
                        className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-bold text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" /> PAN MAP TO TARGET
                      </button>
                      <button
                        onClick={() => {
                          setTrackedPhoneNumber(scannedTourist.phone);
                          setIsCellLocked(true);
                          setTrackedTouristId(scannedTourist.id);
                          setMapCenter({ lat: scannedTourist.lat, lng: scannedTourist.lng });
                          setMapZoom(15);
                          setIsQrScannerOpen(false);
                        }}
                        className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> ENGAGE CELL LOCK
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setScanSuccess(false);
                    setScannedTourist(null);
                  }}
                  className="w-full py-2 border border-dashed border-white/10 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 text-[10px] uppercase rounded transition-all cursor-pointer"
                >
                  Scan Another Passport
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 p-6 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col gap-4 max-w-sm w-full font-sans text-white">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="p-2 bg-red-950/50 rounded-xl text-red-500 border border-red-500/20">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-red-400">{confirmModal.title}</h3>
                <span className="text-[10px] font-mono font-black text-slate-400">OPERATION DESK SECURE SIGN-OFF</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 font-bold leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/20 transition-all cursor-pointer uppercase"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
