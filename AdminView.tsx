import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, AlertOctagon, Phone, RefreshCw, MapPin, Camera,
  Trash2, Plus, Database, Link, Lock, Search, HeartPulse, Volume2, VolumeX,
  ShieldAlert, Radio, CheckCircle2, Cloud, Thermometer, Wind
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Tourist, GeoFence, BlockchainBlock } from '../types';

// MapCircle helper for Admin Map circles
function MapCircle({ center, radius, type }: { center: google.maps.LatLngLiteral; radius: number; type: 'safe' | 'danger' }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const circle = new google.maps.Circle({
      map,
      center,
      radius,
      fillColor: type === 'safe' ? '#10B981' : '#EF4444',
      fillOpacity: 0.15,
      strokeColor: type === 'safe' ? '#10B981' : '#EF4444',
      strokeOpacity: 0.5,
      strokeWeight: 1.5,
    });
    return () => {
      circle.setMap(null);
    };
  }, [map, center.lat, center.lng, radius, type]);
  return null;
}

function PlaceAutocomplete({ onPlaceSelect }: { onPlaceSelect: (place: google.maps.places.PlaceResult) => void }) {
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    
    // We are using the classic places Autocomplete
    if (!placesLib.Autocomplete) return;
    
    const options = {
      fields: ['geometry', 'name', 'formatted_address']
    };
    
    setPlaceAutocomplete(new placesLib.Autocomplete(inputRef.current, options));
  }, [placesLib]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    const listener = placeAutocomplete.addListener('place_changed', () => {
      onPlaceSelect(placeAutocomplete.getPlace());
    });

    return () => {
      if (listener) listener.remove();
    };
  }, [placeAutocomplete, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="E.g., Elephant Falls"
      className="flex-1 p-2 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      }}
    />
  );
}

export default function AdminView({ googleMapsApiKey }: { googleMapsApiKey: string }) {
  const [tourists, setTourists] = useState<Tourist[]>([]);
  const [geoFences, setGeoFences] = useState<GeoFence[]>([]);
  const [blockchain, setBlockchain] = useState<BlockchainBlock[]>([]);
  const [weatherAlert, setWeatherAlert] = useState<{ status: string; code: number; color: string; temperature: number; windspeed: number; containerClass: string; dotClass: string; placeName: string; forecast: { time: string, temp: number, code: number }[] } | null>(null);
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
          let containerClass = 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400';
          let dotClass = 'bg-emerald-400';
          if (code >= 1 && code <= 3) {
            status = 'Cloudy / Fair';
            color = 'blue';
            containerClass = 'bg-blue-950/30 border-blue-800/40 text-blue-400';
            dotClass = 'bg-blue-400';
          } else if (code >= 51 && code <= 67) {
            status = 'Rain Alert: Wet Trails';
            color = 'amber';
            containerClass = 'bg-amber-950/30 border-amber-800/40 text-amber-400';
            dotClass = 'bg-amber-400';
          } else if (code >= 71 && code <= 86) {
            status = 'Snow / Hail Alert';
            color = 'red';
            containerClass = 'bg-red-950/30 border-red-800/40 text-red-400';
            dotClass = 'bg-red-400';
          } else if (code >= 95) {
            status = 'Thunderstorm Warning';
            color = 'red';
            containerClass = 'bg-red-950/30 border-red-800/40 text-red-400';
            dotClass = 'bg-red-400';
          }
          setWeatherAlert({ 
            status, 
            code, 
            color,
            temperature: data.current_weather.temperature,
            windspeed: data.current_weather.windspeed,
            containerClass,
            dotClass,
            placeName: weatherCoords.name
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

  const handleRemoveTourist = async (tId: string) => {
    if (!window.confirm('Are you sure you want to remove this tourist from the Shillong operations center? This action checked out/de-registers their digital passport and is stored securely.')) {
      return;
    }
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
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to remove tourist.');
      }
    } catch (e) {
      console.error('Failed to remove tourist', e);
    }
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

  const handleLocateOnMap = (tourist: Tourist) => {
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
      <div className="w-full text-center py-2 text-xs font-mono text-slate-500 bg-black/20 border border-white/5 rounded-xl mb-4">
        Developed by Abhay Chavadi,Choudari Lalithya,Vaibhavi,Nandita,Pavan,Ramya V R
      </div>
      
      {/* SOS DISPATCH WARNING ALARM PANEL */}
      {activeSOSCount > 0 && (
        <div className="p-6 rounded-2xl border border-red-500/50 bg-red-950/45 text-red-200 animate-pulse flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl shadow-red-950/20">
          <div className="absolute inset-y-0 left-0 w-2 bg-red-500" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600 rounded-full text-white animate-bounce">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono uppercase tracking-wide">
                CRITICAL INCIDENT RESPONDER BROADCAST ACTIVE
              </h2>
              <p className="text-xs font-mono text-red-300">
                {activeSOSCount} Tourist(s) transmitting emergency distress signals. Drone tracking units and rangers pre-dispatched.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSirenMuted(!isSirenMuted)}
              className="p-2.5 rounded-full border border-red-500/30 bg-red-900/40 hover:bg-red-900/70 text-red-400 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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

      {/* Automated Weather Notification Banner */}
      {weatherAlert && (
        <div className={`w-full py-2 px-4 mb-8 rounded-xl border transition-all duration-300 text-xs font-mono flex flex-col xl:flex-row items-center justify-between backdrop-blur-md ${weatherAlert.containerClass}`}>
          <div className="flex items-center gap-4 mb-2 xl:mb-0 w-full xl:w-auto justify-between xl:justify-start">
            <div className="flex items-center gap-1.5">
              <Cloud className="w-4 h-4 animate-pulse" />
              <span className="font-bold tracking-wider">{weatherAlert?.placeName?.toUpperCase() || 'UNKNOWN'}: {weatherAlert?.status?.toUpperCase() || ''}</span>
            </div>
            <div className="hidden sm:flex items-center gap-3 border-l border-white/10 pl-3">
              <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" /> {weatherAlert.temperature}°C</span>
              <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5" /> {weatherAlert.windspeed} km/h</span>
            </div>
          </div>
          
          {weatherAlert.forecast && weatherAlert.forecast.length > 0 && (
            <div className="flex items-center gap-4 text-[10px] sm:text-xs mb-2 xl:mb-0">
              <span className="opacity-70 hidden sm:inline">TODAY:</span>
              <div className="flex items-center gap-3 bg-black/20 px-3 py-1 rounded-full">
                {weatherAlert.forecast.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 border-r border-white/10 pr-3 last:border-0 last:pr-0">
                    <span className="opacity-70">{f.time}</span>
                    <span className="font-bold">{f.temp}°</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={searchWeatherLocation} className="flex flex-wrap items-center gap-2 text-[10px] opacity-100 w-full xl:w-auto justify-end">
            <input type="text" value={weatherSearchQuery} onChange={e => setWeatherSearchQuery(e.target.value)} placeholder="Enter city..." className="px-2 py-1 rounded bg-black/30 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-emerald-500 transition-colors" />
            <button type="submit" className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded border border-white/20 cursor-pointer">SEARCH</button>
            <span className="opacity-70 ml-2 hidden sm:inline">LIVE METEO SYNC</span>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${weatherAlert.dotClass}`} />
          </form>
        </div>
      )}

      {/* TOURIST DISPATCH TERMINAL & ONBOARDING (TOP SECTION) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* DISPATCH TERMINAL QR ONBOARDING (XL: 5 COLS) */}
        <div className="xl:col-span-5 p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                TOURIST DISPATCH TERMINAL
              </h3>
            </div>
            <p className="text-xs font-sans text-slate-300 leading-relaxed">
              Provide tourists with instant digital passport check-in. Have them scan the dynamic QR code with their mobile device camera.
            </p>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-2 font-mono text-[10px] text-slate-400">
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fast, Zero-install mobile onboarding
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Capture ID, nationality, and duration
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Instant real-time dashboard sync
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-white/5">
            <div className="flex flex-col items-center gap-2 p-2.5 bg-[#0a0e10] border border-white/10 rounded-xl shadow-xl shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&color=000000&bgcolor=ffffff&data=${encodeURIComponent(
                  typeof window !== 'undefined' ? `${window.location.href.split('?')[0]}?view=tourist&t=${qrNonce}` : ''
                )}`}
                alt="Dynamic Tourist Portal QR"
                className="w-28 h-28 rounded border border-emerald-500/20 p-1 bg-white transition-all duration-300 transform hover:scale-105"
              />
              <span className="text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-widest text-center animate-pulse">
                SCAN FOR MOBILE ENTRY
              </span>
            </div>
            <div className="space-y-2 text-left min-w-0 flex-1">
              <div className="text-[10px] text-slate-400 font-mono">
                Onboard hikers, tourists, and wilderness guides to Shillong operations central.
              </div>

              {/* Dynamic QR Security Monitor */}
              <div className="p-2 rounded bg-slate-900 border border-white/5 space-y-1 font-mono text-[9px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    SECURE ROTATION ENGINE:
                  </span>
                  <span className="font-bold text-emerald-400">{qrCountdown}s</span>
                </div>
                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-1000 ease-linear" 
                    style={{ width: `${(qrCountdown / 15) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-0.5 text-[8px] text-slate-500">
                  <span className="truncate">NONCE: {qrNonce}</span>
                  <button 
                    onClick={() => {
                      setQrNonce(Math.random().toString(36).substring(2, 10).toUpperCase());
                      setQrCountdown(15);
                    }}
                    className="px-1 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded text-[7px] cursor-pointer font-bold uppercase transition-colors"
                  >
                    ROTATE NOW
                  </button>
                </div>
              </div>

              <div className="text-[9px] text-slate-500 font-mono select-all break-all leading-tight">
                Portal Link: <span className="text-slate-300 underline">{typeof window !== 'undefined' ? `${window.location.href.split('?')[0]}?view=tourist` : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* REGISTERED TOURISTS LIST (XL: 7 COLS) */}
        <div className="xl:col-span-7 p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
          <div className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-emerald-400" /> REGISTERED TOURIST PORTAL
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Hikers who checked in and registered their digital passport via the Dispatch QR Code.
                </p>
              </div>

              {/* Filter Search */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search registered guests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-slate-900 text-white border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded text-[11px] transition-all font-mono"
                />
              </div>
            </div>

            {/* Tourist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 max-h-[300px] flex-1">
              {filteredTourists.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs border border-dashed border-white/10 bg-slate-950/20 rounded-xl">
                  NO REGISTERED TOURISTS IN PORTAL YET.
                </div>
              ) : (
                filteredTourists.map(t => (
                  <div 
                    key={t.id} 
                    className={`p-3 rounded-xl border relative overflow-hidden transition-all duration-300 ${
                      t.sosActive 
                      ? 'border-red-500/50 bg-red-950/40 text-red-200 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                      : 'border-white/5 bg-slate-900/60 text-slate-350 hover:border-emerald-500/30 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex gap-2.5 items-start">
                      <img 
                        src={t.facePhoto} 
                        alt={t.name} 
                        className="w-10 h-10 rounded-lg object-cover border border-white/10 bg-black shrink-0"
                      />
                      <div className="space-y-0.5 font-mono text-[10px] flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-white block truncate">{t.name}</span>
                          <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase tracking-tighter shrink-0 ${
                            t.sosActive 
                            ? 'bg-red-600 text-white animate-pulse' 
                            : t.offlineMode 
                            ? 'bg-amber-950 text-amber-400 border border-amber-500/20' 
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {t.sosActive ? 'SOS ALARM' : t.offlineMode ? 'OFFLINE' : 'LIVE'}
                          </span>
                        </div>
                        <div className="text-slate-400 truncate">PHONE: {t.phone}</div>
                        <div className="text-slate-500 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-emerald-500" /> {t.lat.toFixed(4)}, {t.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/5 flex gap-1.5">
                      <button
                        onClick={() => handleLocateOnMap(t)}
                        className="flex-1 py-1 bg-slate-950 hover:bg-slate-800 border border-white/10 text-[9px] text-slate-300 font-bold font-mono rounded text-center cursor-pointer transition-colors"
                      >
                        FOCUS MAP
                      </button>
                      <button
                        onClick={() => {
                          setTrackedPhoneNumber(t.phone);
                          setIsCellLocked(true);
                          setMapCenter({ lat: t.lat, lng: t.lng });
                          setMapZoom(15);
                        }}
                        className={`flex-1 py-1 text-[9px] font-bold font-mono rounded text-center cursor-pointer transition-all border ${
                          isCellLocked && trackedPhoneNumber === t.phone
                          ? 'bg-emerald-500 text-stone-950 border-emerald-500 hover:bg-emerald-400'
                          : 'bg-slate-950 hover:bg-emerald-950/20 border-white/10 hover:border-emerald-500/40 text-emerald-400'
                        }`}
                      >
                        {isCellLocked && trackedPhoneNumber === t.phone ? 'LOCK ACTIVE' : 'TRACK CELL'}
                      </button>
                      <button
                        onClick={() => handleRemoveTourist(t.id)}
                        className="px-2 py-1 bg-red-950/30 hover:bg-red-950 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded cursor-pointer transition-all flex items-center justify-center"
                        title="De-register & Check out Tourist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {t.sosActive && (
                      <button
                        onClick={() => handleResolveSos(t.id)}
                        className="w-full mt-2 py-1 bg-red-600 hover:bg-red-500 text-[9px] text-white font-bold font-mono rounded text-center cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse transition-colors"
                      >
                        ACK RESCUE SIGNALS
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: MAP & GEO-FENCING CONTROLS (12 COLS) */}
        <div className="lg:col-span-12 space-y-8">
          
          {/* MAP TRACKING STATION */}
          <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            <h3 className="text-sm font-mono font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" /> EMERGENCY OPERATIONS CENTRAL MAP
            </h3>

            {/* Map Element */}
            <div className="h-[520px] w-full rounded-2xl overflow-hidden relative border border-white/10 shadow-inner">
                <Map
                  center={mapCenter}
                  zoom={mapZoom}
                  onCameraChanged={(ev: any) => {
                    setMapCenter(ev.detail.center);
                    setMapZoom(ev.detail.zoom);
                  }}
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                  gestureHandling="greedy"
                  zoomControl={true}
                  disableDefaultUI={false}
                >
                  {/* Draw circular geo-fences */}
                  {geoFences.map(fence => (
                    <React.Fragment key={fence.id}>
                      <MapCircle 
                        center={{ lat: fence.lat, lng: fence.lng }} 
                        radius={fence.radius} 
                        type={fence.type} 
                      />
                      <AdvancedMarker position={{ lat: fence.lat, lng: fence.lng }}>
                        <div className={`p-1 rounded-full border text-[10px] font-mono font-bold ${
                          fence.type === 'safe' 
                          ? 'border-emerald-500 bg-emerald-950/85 text-emerald-400' 
                          : 'border-red-500 bg-red-950/85 text-red-400'
                        }`}>
                          {fence.name}
                        </div>
                      </AdvancedMarker>
                    </React.Fragment>
                  ))}

                  {/* Display markers for all registered tourists */}
                  {tourists.map(tourist => (
                    <AdvancedMarker 
                      key={tourist.id} 
                      position={{ lat: tourist.lat, lng: tourist.lng }}
                    >
                      <div className="relative flex flex-col items-center">
                        <div className={`p-1 rounded-full border-2 bg-slate-900 ${
                          tourist.sosActive 
                          ? 'border-red-500 animate-pulse shadow-lg shadow-red-500/50 scale-110' 
                          : 'border-emerald-500'
                        }`}>
                          <img 
                            src={tourist.facePhoto} 
                            alt={tourist.name} 
                            className="w-10 h-10 rounded-full object-cover" 
                          />
                        </div>
                        <span className={`mt-1 px-1.5 py-0.5 font-mono text-[8px] font-bold rounded shadow-md ${
                          tourist.sosActive 
                          ? 'bg-red-600 text-white animate-bounce' 
                          : 'bg-slate-900 text-slate-300'
                        }`}>
                          {tourist.name}
                        </span>
                      </div>
                    </AdvancedMarker>
                  ))}
                </Map>
            </div>
          </div>

          {/* GPS SATELLITE CELLULAR LOCK & QR CHECKPOINT SCANNER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR CHECKPOINT SCANNER */}
            <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-mono font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" /> DIGITAL ID QR CHECKPOINT
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mb-4 leading-relaxed">
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
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  <Camera className="w-4 h-4" /> LAUNCH CHECKPOINT SCANNER
                </button>
              </div>
            </div>

            {/* LIVE CELLULAR GPS PHONE TRACKER */}
            <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-mono font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-400 animate-pulse" /> SATELLITE CELLULAR TRACKER
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mb-4 leading-relaxed">
                  Lock on to any registered cellular contact frequency. Real-time GPS pings are automatically projected on the map.
                </p>
              </div>

              {/* Cellular Tracker Input & Display */}
              <div className="space-y-3 font-mono">
                {isCellLocked ? (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> SATELLITE GPS LOCK-ON
                      </span>
                      <span className="text-xs text-white font-bold block">{trackedPhoneNumber}</span>
                      {(() => {
                        const t = tourists.find(t => t.phone.replace(/\s+/g, '') === trackedPhoneNumber.replace(/\s+/g, ''));
                        return t ? (
                          <span className="text-[9px] text-slate-400 block truncate max-w-[150px]">
                            Tracking: {t.name} ({t.lat.toFixed(5)}, {t.lng.toFixed(5)})
                          </span>
                        ) : (
                          <span className="text-[9px] text-red-400 block">Out of grid range / Offline</span>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => {
                        setIsCellLocked(false);
                        setTrackedPhoneNumber('');
                      }}
                      className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/30 hover:border-red-500 font-bold text-[10px] rounded transition-all cursor-pointer"
                    >
                      BREAK LOCK
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={trackedPhoneNumber}
                      onChange={(e) => setTrackedPhoneNumber(e.target.value)}
                      className="flex-1 p-2 bg-slate-900 border border-white/10 text-white rounded text-xs"
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
                      className="px-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-stone-950 font-bold text-xs rounded transition-all cursor-pointer flex items-center justify-center"
                    >
                      LOCK ON
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GLOBAL EMERGENCY BROADCAST DISPATCH */}
          <div className="p-6 rounded-2xl border border-red-500/30 bg-red-950/5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Visual warning background pattern */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,#000_10px,#000_20px)] opacity-60" />
            
            <h3 className="text-sm font-mono font-bold text-red-400 mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" /> GLOBAL EMERGENCY BROADCAST DISPATCH
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Broadcast Trigger Form */}
              <form onSubmit={handleCreateBroadcast} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Select Alert Preset (Optional)</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewBroadcastMessage(e.target.value);
                      }
                    }}
                    className="w-full p-2 bg-slate-900 border border-white/10 text-white focus:border-red-500 rounded text-xs cursor-pointer"
                  >
                    <option value="">-- SELECT PRESET ALERT --</option>
                    <option value="Severe weather warning: Storm front approaching Shillong. Take shelter immediately.">Severe Weather Warning</option>
                    <option value="Evacuation required: Landslide hazard detected in Shillong West. Exit immediately.">Evacuation Required</option>
                    <option value="Bear sighting warning: Wildlife rangers report active bear activity near Camp 4. Keep food secure.">Bear Sighting Warning</option>
                    <option value="Flash flood watch: Heavy rain in high country. Avoid crossing rivers or stream canyons.">Flash Flood Watch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Custom Alert Message</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="E.g., Avalanche warning or high wind warnings..."
                    value={newBroadcastMessage}
                    onChange={(e) => setNewBroadcastMessage(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded font-sans text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Severity Level</label>
                    <select
                      value={broadcastSeverity}
                      onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                      className="w-full p-2 bg-slate-900 border border-white/10 text-white focus:border-red-500 rounded text-xs cursor-pointer"
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
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-stone-950 hover:text-white font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.2)] border border-red-500/30"
                    >
                      {isBroadcasting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-950" />
                          <span>SENDING...</span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-3.5 h-3.5 animate-pulse text-stone-950" />
                          <span>SEND BROADCAST</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {broadcastError && (
                  <p className="text-[10px] text-red-400 font-semibold">{broadcastError}</p>
                )}
              </form>

              {/* Active Broadcasts List */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">ACTIVE TRANSMISSIONS</h4>
                    {activeAlerts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearBroadcast()}
                        className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase border border-red-500/20 hover:border-red-500/40 px-2 py-0.5 rounded cursor-pointer transition-all"
                      >
                        CLEAR ALL ALERTS
                      </button>
                    )}
                  </div>

                  {activeAlerts.length === 0 ? (
                    <div className="p-6 text-center border border-white/5 bg-white/2 rounded-xl text-slate-500 text-[10px] font-mono">
                      NO ACTIVE BROADCASTS CURRENTLY TRANSMITTING
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activeAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 rounded-lg border flex justify-between items-start gap-4 text-[11px] ${
                            alert.severity === 'critical'
                              ? 'border-red-500/30 bg-red-950/15 text-red-200'
                              : alert.severity === 'info'
                              ? 'border-blue-500/30 bg-blue-950/15 text-blue-200'
                              : 'border-yellow-500/30 bg-yellow-950/15 text-yellow-200'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-[9px] uppercase">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'info' ? 'bg-blue-500' : 'bg-yellow-500'
                              } animate-ping`} />
                              <span>{alert.severity} • {new Date(alert.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="font-sans leading-relaxed text-white text-xs">{alert.message}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleClearBroadcast(alert.id)}
                            className="text-slate-400 hover:text-red-400 text-xs font-bold font-mono p-1 cursor-pointer transition-colors"
                            title="Remove Alert"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-black/30 border border-white/5 rounded-xl text-[9px] leading-relaxed text-slate-500 mt-4">
                  🚨 <span className="text-slate-400 font-semibold">Broadcast Verification:</span> Sending a broadcast automatically generates a permanent emergency proof log.
                </div>
              </div>
            </div>
          </div>

          {/* GEO-FENCING CONTROLLER STATION */}
          <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            <h3 className="text-sm font-mono font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" /> DEPLOY REAL-TIME GEO-FENCE
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form creation */}
              <form onSubmit={handleCreateFence} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Place Search (Auto-fill Coordinates)</label>
                  <div className="flex gap-2">
                    <PlaceAutocomplete onPlaceSelect={(place) => {
                      if (place.geometry?.location) {
                        setNewFenceLat(place.geometry.location.lat().toString());
                        setNewFenceLng(place.geometry.location.lng().toString());
                        if (place.name) setNewFenceName(place.name);
                        setMapCenter({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
                      }
                    }} />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 uppercase text-[10px] mb-1">Fence Area Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Avalanche Slopes Warning"
                    value={newFenceName}
                    onChange={(e) => setNewFenceName(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Fence Type</label>
                    <select
                      value={newFenceType}
                      onChange={(e: any) => setNewFenceType(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded"
                    >
                      <option value="danger">DANGER ZONE</option>
                      <option value="safe">SAFE ZONE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Radius (Meters)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 800"
                      value={newFenceRadius}
                      onChange={(e) => setNewFenceRadius(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newFenceLat}
                      onChange={(e) => setNewFenceLat(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 uppercase text-[10px] mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newFenceLng}
                      onChange={(e) => setNewFenceLng(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-white/10 text-white focus:border-emerald-500 rounded"
                    />
                  </div>
                </div>

                {fenceFormError && (
                  <div className="p-2.5 bg-red-950/30 border border-red-500/20 text-red-400 text-[11px]">
                    {fenceFormError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isDeployingFence}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold uppercase text-[11px] rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> DEPLOY GEO-FENCE SIGNAL TO BROADCAST
                </button>
              </form>

              {/* Geo-fence active list */}
              <div className="space-y-3">
                <span className="block text-slate-400 font-mono uppercase text-[10px]">CURRENT DEPLOYED SIGNAL FENCES</span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {geoFences.map(fence => (
                    <div 
                      key={fence.id} 
                      className={`p-3 rounded-lg border font-mono text-[11px] flex items-center justify-between ${
                        fence.type === 'safe' 
                        ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-400' 
                        : 'border-red-500/20 bg-red-950/20 text-red-400'
                      }`}
                    >
                      <div>
                        <span className="block font-bold">{fence.name}</span>
                        <span className="text-[9px] opacity-75">
                          LAT: {fence.lat.toFixed(4)}, LNG: {fence.lng.toFixed(4)} • {fence.radius}m
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteFence(fence.id)}
                        className="p-1 hover:bg-slate-800 rounded border border-transparent hover:border-white/10 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                        title="Remove Geo-fence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-500 animate-pulse" /> DISPATCH INCIDENT RADAR
              </h3>
              <div className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 font-mono text-[9px] text-amber-400 font-bold uppercase tracking-wider animate-pulse">
                {incidentReports.filter(r => r.status === 'active').length} Active Reports
              </div>
            </div>

            {incidentReports.length === 0 ? (
              <div className="p-8 text-center border border-white/5 bg-white/2 rounded-2xl text-slate-500 text-[11px] font-mono">
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
                      className={`p-4 rounded-xl border font-mono text-xs transition-all relative ${
                        isResolved 
                        ? 'border-emerald-500/15 bg-emerald-950/5 text-slate-400' 
                        : 'border-amber-500/20 bg-amber-950/10 text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${isResolved ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                            <span className="font-bold text-[11px] uppercase tracking-wider">
                              {matchTourist ? matchTourist.name : 'Guest Scout'}
                            </span>
                            {report.touristId && (
                              <span className="text-[10px] text-slate-500">
                                (ID: {report.touristId.substring(0, 8)})
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            COORD-TAG: <span className="text-slate-300 font-bold underline cursor-pointer hover:text-emerald-400" onClick={() => {
                              setMapCenter({ lat: report.lat, lng: report.lng });
                              setMapZoom(16);
                            }}>{report.lat.toFixed(5)}, {report.lng.toFixed(5)}</span>
                          </p>
                        </div>
                        <div className="text-right text-[9px] text-slate-500">
                          {new Date(report.timestamp).toLocaleTimeString()}
                        </div>
                      </div>

                      <p className="bg-black/30 p-2.5 rounded-lg border border-white/5 text-xs text-white leading-relaxed mb-3">
                        {report.message}
                      </p>

                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setMapCenter({ lat: report.lat, lng: report.lng });
                            setMapZoom(16);
                          }}
                          className="px-2.5 py-1 text-[9px] font-bold font-mono border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 rounded transition-all cursor-pointer bg-slate-900/40 flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" /> TRACK LOCATION
                        </button>

                        {!isResolved && (
                          <button
                            type="button"
                            onClick={() => handleResolveReport(report.id)}
                            className="px-3 py-1 text-[9px] font-bold font-mono bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded shadow-md cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <CheckCircle2 className="w-3 h-3" /> MARK RESOLVED
                          </button>
                        )}

                        {isResolved && (
                          <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> RESOLVED & ARCHIVED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN WAS HERE, NOW REMOVED */}
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

    </div>
  );
}
