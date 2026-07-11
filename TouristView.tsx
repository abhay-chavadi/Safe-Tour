import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Shield, AlertOctagon, Phone, Wifi, WifiOff, RefreshCw, 
  MapPin, HelpCircle, ShieldAlert, CheckCircle2, Navigation,
  Award, Play, ArrowRight, User, HeartPulse, Globe, FileText, Clock, Cloud, Thermometer, Wind
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { Tourist, GeoFence } from '../types';

// MapCircle draws a google.maps.Circle using the raw map instance
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
  }, [map, center, radius, type]);
  return null;
}

const PRESET_AVATARS = [
  { name: 'Redwood Pathfinder', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150' },
  { name: 'Sierra Summit Blazer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150' },
  { name: 'Glacier Explorer', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150' },
];

export default function TouristView({ googleMapsApiKey }: { googleMapsApiKey: string }) {
  // Navigation & GPS simulation in Shillong
  // Standard coordinates for Shillong Center
  const [coords, setCoords] = useState({ lat: 25.5788, lng: 91.8933 });
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('');
  const [passportId, setPassportId] = useState('');
  const [stayDuration, setStayDuration] = useState('');
  const [incidentReportMessage, setIncidentReportMessage] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [photo, setPhoto] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isQrZoomed, setIsQrZoomed] = useState(false);
  
  // Current registered tourist state (loaded from session or state)
  const [currentTourist, setCurrentTourist] = useState<Tourist | null>(null);
  const [geoFences, setGeoFences] = useState<GeoFence[]>([]);
  const [sosLoading, setSosLoading] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [incidentNotifications, setIncidentNotifications] = useState<{
    id: string;
    message: string;
    incidentMessage: string;
    timestamp: number;
  }[]>([]);
  
  // Offline state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  
  // Weather state
  const [weatherAlert, setWeatherAlert] = useState<{ status: string; code: number; color: string; temperature: number; windspeed: number; containerClass: string; dotClass: string; forecast: { time: string, temp: number, code: number }[] } | null>(null);

  // Video capture refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=1`);
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
            dotClass
          });
        }
      } catch (e) {
        console.warn('Weather fetch failed', e);
      }
    };
    fetchWeather();
    // Update weather every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [coords.lat, coords.lng]);

  // Shillong Simulation presets (simulate walking from Safe Ranger Station towards Elephant Falls Danger Zone)
  const [isSimulatingPath, setIsSimulatingPath] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);

  const simulationPath = [
    { name: 'Police Bazaar Safe Base', lat: 25.5760, lng: 91.8825, note: 'Inside Ranger safe zone perimeter.' },
    { name: 'Shillong Visitor Station', lat: 25.5788, lng: 91.8933, note: 'Entering general public visitor trails.' },
    { name: 'Shillong Peak Wilderness', lat: 25.5398, lng: 91.8617, note: 'Remote mountain wilderness region.' },
    { name: 'Elephant Falls Cliff Ridge', lat: 25.5347, lng: 91.8211, note: 'WARNING: Inside Extreme Fall Danger Zone.' },
    { name: 'Laitlum Canyons Overlook', lat: 25.4851, lng: 91.9567, note: 'WARNING: Inside Mountain Drop-off Hazard Zone.' },
    { name: 'Returning to Safe Haven', lat: 25.5760, lng: 91.8825, note: 'Safely arrived back at Ranger base.' },
  ];

  // Emergency contact directory
  const emergencyContacts = [
    { name: 'Shillong Search & Rescue', number: '1-800-SAR-BASE', role: 'Air & Ground Rescue Unit' },
    { name: 'Wilderness Medical Dispatch', number: '1-888-MED-WILD', role: 'Emergency Field First Aid' },
    { name: 'Central Ranger Base Station', number: '+1 (209) 372-0200', role: 'Liaison & Patrol Center' },
  ];

  // Load geo-fences and alerts on mount
  useEffect(() => {
    fetchFences();
    fetchAlerts();
    const interval = setInterval(() => {
      fetchFences();
      fetchAlerts();
      if (currentTourist && !isOfflineMode) {
        syncLocation(coords.lat, coords.lng);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [currentTourist, coords, isOfflineMode]);

  // Load cached user on start if any
  useEffect(() => {
    const cached = localStorage.getItem('safetour_tourist');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setCurrentTourist(parsed);
        setCoords({ lat: parsed.lat, lng: parsed.lng });
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Listen for real-time notifications via SSE
  useEffect(() => {
    if (!currentTourist || isOfflineMode) return;

    const eventSource = new EventSource('/api/sse');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'REPORT_RESOLVED') {
          const report = payload.data;
          if (report.touristId === currentTourist.id) {
            setIncidentNotifications(prev => {
              if (prev.some(n => n.id === report.id)) return prev;
              return [
                {
                  id: report.id,
                  message: `Ranger Dispatch has resolved your incident report: "${report.message}"`,
                  incidentMessage: report.message,
                  timestamp: Date.now()
                },
                ...prev
              ];
            });
          }
        }
      } catch (err) {
        console.error('Failed to parse SSE event in TouristView', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE disconnected in TouristView, retrying...', err);
    };

    return () => {
      eventSource.close();
    };
  }, [currentTourist, isOfflineMode]);

  const fetchFences = async () => {
    try {
      const res = await fetch('/api/geofences');
      if (res.ok) {
        const data = await res.json();
        setGeoFences(data);
      }
    } catch (e) {
      console.log('Failed to fetch geo-fences, using local offline defaults', e);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setActiveAlerts(data);
      }
    } catch (e) {
      console.log('Failed to fetch broadcast alerts');
    }
  };

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlertIds(prev => [...prev, alertId]);
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    setRegistrationError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, facingMode: 'user' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      console.warn('Webcam not allowed or unavailable. Falling back to Explorer Preset avatars.', e);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 320, 240);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const selectPresetAvatar = (url: string) => {
    setPhoto(url);
    stopCamera();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setRegistrationError('Please provide your name and phone number.');
      return;
    }
    
    setRegistrationError('');
    setIsRegistering(true);

    const registrationData = {
      name,
      phone,
      nationality,
      passportId,
      stayDuration,
      facePhoto: photo || PRESET_AVATARS[0].url,
      lat: coords.lat,
      lng: coords.lng
    };

    if (isOfflineMode) {
      // Offline Registration Simulation: Generate localized digital ID
      const mockId = `0xOFFLINE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const offlineTourist: Tourist = {
        id: mockId,
        name,
        phone,
        nationality,
        passportId,
        stayDuration,
        facePhoto: registrationData.facePhoto,
        lat: coords.lat,
        lng: coords.lng,
        lastActive: Date.now(),
        sosActive: false,
        sosTime: null,
        offlineMode: true,
        registrationTimestamp: Date.now(),
        blockchainBlockIndex: 9999,
        blockHash: '0x_OFFLINE_LOCAL_BLOCK_PENDING_MERKLE_SYNC'
      };

      // Add to offline queue
      const queueItem = { type: 'REGISTER', data: registrationData };
      const updatedQueue = [...offlineQueue, queueItem];
      setOfflineQueue(updatedQueue);
      localStorage.setItem('safetour_offline_queue', JSON.stringify(updatedQueue));

      setCurrentTourist(offlineTourist);
      localStorage.setItem('safetour_tourist', JSON.stringify(offlineTourist));
      setIsRegistering(false);
      return;
    }

    try {
      const res = await fetch('/api/tourists/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      if (res.ok) {
        const result = await res.json();
        setCurrentTourist(result.tourist);
        localStorage.setItem('safetour_tourist', JSON.stringify(result.tourist));
      } else {
        const errData = await res.json();
        setRegistrationError(errData.error || 'Failed to generate Digital ID.');
      }
    } catch (e) {
      setRegistrationError('Unable to connect to the central registry. Toggle Offline Mode to log in locally.');
    } finally {
      setIsRegistering(false);
    }
  };

  const syncLocation = async (lat: number, lng: number) => {
    if (!currentTourist) return;
    
    if (isOfflineMode) {
      // Update local storage location
      const updated = { ...currentTourist, lat, lng, offlineMode: true };
      setCurrentTourist(updated);
      localStorage.setItem('safetour_tourist', JSON.stringify(updated));
      return;
    }

    try {
      await fetch('/api/tourists/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId: currentTourist.id,
          lat,
          lng,
          offlineMode: false
        })
      });
    } catch (e) {
      console.log('Location synchronization failed.');
    }
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentReportMessage.trim()) return;

    setReportLoading(true);
    setReportSuccess(false);

    try {
      if (isOfflineMode) {
        // Offline Mode: save to localStorage queue
        const queueItem = {
          type: 'INCIDENT_REPORT',
          data: {
            touristId: currentTourist ? currentTourist.id : 'OFFLINE_GUEST',
            message: incidentReportMessage,
            lat: coords.lat,
            lng: coords.lng
          }
        };
        const updatedQueue = [...offlineQueue, queueItem];
        setOfflineQueue(updatedQueue);
        localStorage.setItem('safetour_offline_queue', JSON.stringify(updatedQueue));
        
        setReportSuccess(true);
        setIncidentReportMessage('');
        setReportLoading(false);
        return;
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId: currentTourist ? currentTourist.id : 'SYSTEM_GUEST',
          message: incidentReportMessage,
          lat: coords.lat,
          lng: coords.lng
        })
      });

      if (res.ok) {
        setReportSuccess(true);
        setIncidentReportMessage('');
      }
    } catch (e) {
      console.error('Incident report failed to send', e);
    } finally {
      setReportLoading(false);
    }
  };

  const handleSosToggle = async () => {
    if (!currentTourist) return;
    const nextSosState = !currentTourist.sosActive;
    
    setSosLoading(true);

    if (isOfflineMode) {
      const updated = { ...currentTourist, sosActive: nextSosState, sosTime: nextSosState ? Date.now() : null };
      setCurrentTourist(updated);
      localStorage.setItem('safetour_tourist', JSON.stringify(updated));
      
      // Add to offline cache queue
      const queueItem = { type: 'SOS', data: { touristId: currentTourist.id, active: nextSosState } };
      const updatedQueue = [...offlineQueue, queueItem];
      setOfflineQueue(updatedQueue);
      localStorage.setItem('safetour_offline_queue', JSON.stringify(updatedQueue));
      
      setSosLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/tourists/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId: currentTourist.id,
          active: nextSosState
        })
      });

      if (res.ok) {
        const result = await res.json();
        setCurrentTourist(result.tourist);
        localStorage.setItem('safetour_tourist', JSON.stringify(result.tourist));
      }
    } catch (e) {
      console.error('Failed to trigger SOS on server');
    } finally {
      setSosLoading(false);
    }
  };

  const toggleOfflineMode = async () => {
    const nextMode = !isOfflineMode;
    setIsOfflineMode(nextMode);

    if (!nextMode && currentTourist && offlineQueue.length > 0) {
      // Returning online: trigger synchronized Merkle-sync
      console.log('Synchronizing cached data back online...');
      setIsRegistering(true);
      
      // Process offline queue sequentially
      for (const item of offlineQueue) {
        try {
          if (item.type === 'REGISTER') {
            const res = await fetch('/api/tourists/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data)
            });
            if (res.ok) {
              const r = await res.json();
              setCurrentTourist(r.tourist);
              localStorage.setItem('safetour_tourist', JSON.stringify(r.tourist));
            }
          } else if (item.type === 'SOS') {
            await fetch('/api/tourists/sos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data)
            });
          }
        } catch (err) {
          console.error('Sync failed for item', item);
        }
      }
      
      // Clear queue
      setOfflineQueue([]);
      localStorage.removeItem('safetour_offline_queue');
      setIsRegistering(false);
    }
  };

  const handleSimulatePath = () => {
    if (!currentTourist) return;
    setIsSimulatingPath(true);
    const nextIdx = (simulationIndex + 1) % simulationPath.length;
    setSimulationIndex(nextIdx);
    const destination = simulationPath[nextIdx];
    
    setCoords({ lat: destination.lat, lng: destination.lng });
    syncLocation(destination.lat, destination.lng);
  };

  // Check if current coordinate is in a danger zone
  const getSafetyStatus = () => {
    let status = { text: 'GREEN ZONE (SECURE)', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' };
    
    // Calculate Haversine distance
    function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371000; // Earth radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    let inDanger = false;
    geoFences.forEach(fence => {
      const d = getDistance(coords.lat, coords.lng, fence.lat, fence.lng);
      if (d <= fence.radius && fence.type === 'danger') {
        inDanger = true;
      }
    });

    if (currentTourist?.sosActive) {
      status = { text: 'SOS CRITICAL ALARM TRANSMITTING', color: 'text-red-400 bg-red-950/60 border-red-500/50 animate-pulse' };
    } else if (inDanger) {
      status = { text: 'RED ZONE (DANGER FENCE ACTIVE)', color: 'text-amber-500 bg-amber-950/50 border-amber-500/40 animate-pulse' };
    }

    return status;
  };

  const safetyStatus = getSafetyStatus();

  const pendingAlerts = activeAlerts.filter(alert => !dismissedAlertIds.includes(alert.id));

  return (
    <div className="w-full">
      {/* Developed By Banner */}
      <div className="w-full text-center py-2 text-xs font-mono text-slate-500 bg-black/20 border-b border-white/5">
        Developed by Abhay Chavadi,Choudari Lalithya,Vaibhavi,Nandita,Pavan,Ramya V R
      </div>
      {/* Offline Status Bar */}
      <div className={`w-full py-2 px-4 border-b transition-all duration-300 text-xs font-mono flex items-center justify-between backdrop-blur-md ${isOfflineMode ? 'bg-amber-950/30 border-amber-800/40 text-amber-400' : 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400'}`}>
        <div className="flex items-center gap-2">
          {isOfflineMode ? (
            <>
              <WifiOff className="w-4 h-4 animate-pulse" />
              <span>OFFLINE MODE ENGAGED (LOCAL CACHE ON)</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              <span>SECURE NETWORK LINK OPERATIONAL</span>
            </>
          )}
        </div>
        <button 
          onClick={toggleOfflineMode}
          className={`px-3 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${isOfflineMode ? 'border-amber-500 hover:bg-amber-500 hover:text-black' : 'border-emerald-500 hover:bg-emerald-500 hover:text-black'}`}
        >
          {isOfflineMode ? 'GO ONLINE & SYNC' : 'GO OFFLINE (SIMULATE OUT OF RANGE)'}
        </button>
      </div>

      {/* Automated Weather Notification Banner */}
      {weatherAlert && (
        <div className={`w-full py-2 px-4 border-b transition-all duration-300 text-xs font-mono flex flex-col md:flex-row items-center justify-between backdrop-blur-md ${weatherAlert.containerClass}`}>
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start mb-2 md:mb-0">
            <div className="flex items-center gap-1.5">
              <Cloud className="w-4 h-4 animate-pulse" />
              <span className="font-bold tracking-wider">{weatherAlert?.status?.toUpperCase() || ''}</span>
            </div>
            <div className="hidden sm:flex items-center gap-3 border-l border-white/10 pl-3">
              <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" /> {weatherAlert.temperature}°C</span>
              <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5" /> {weatherAlert.windspeed} km/h</span>
            </div>
          </div>
          
          {weatherAlert.forecast && weatherAlert.forecast.length > 0 && (
            <div className="flex items-center gap-4 text-[10px] sm:text-xs">
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

          <div className="flex items-center gap-2 text-[10px] opacity-70 mt-2 md:mt-0 w-full md:w-auto justify-end">
            <span className="hidden sm:inline">LIVE METEO SYNC</span>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${weatherAlert.dotClass}`} />
          </div>
        </div>
      )}

      {!currentTourist ? (
        /* REGISTRATION CARD */
        <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Visual Scanline Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent h-1/2 w-full animate-scanline pointer-events-none" />

          <div className="text-center mb-8 relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Shield className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-sans font-semibold tracking-tight text-white uppercase italic">Central Registration Hub</h2>
            <p className="text-xs font-mono text-slate-400 mt-2">MINING REAL-TIME SECURE IMMUTABLE DIGITAL ID</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6 relative">
            {/* Webcam / Selfie Module */}
            <div className="flex flex-col items-center p-4 rounded-xl border border-white/10 bg-black/40">
              <span className="text-xs font-mono text-slate-400 mb-3 flex items-center gap-1.5 self-start">
                <Camera className="w-3.5 h-3.5 text-emerald-500" /> BIO-METRIC FACIAL SIGNATURE CAPTURE
              </span>

              {isCameraActive ? (
                <div className="relative w-80 h-60 bg-slate-900 rounded-lg overflow-hidden border border-emerald-500/30 shadow-inner">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover scale-x-[-1]" 
                    playsInline 
                    muted 
                  />
                  <div className="absolute inset-x-0 top-[10%] bottom-[10%] border-y border-dashed border-emerald-500/30 pointer-events-none animate-pulse" />
                  <div className="absolute inset-x-[15%] inset-y-0 border-x border-dashed border-emerald-500/30 pointer-events-none animate-pulse" />
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-full border border-emerald-400 shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-4 h-4 animate-spin-slow" /> CAPTURE BIO-DATA
                  </button>
                </div>
              ) : photo ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-40 h-40 rounded-full overflow-hidden border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <img src={photo} alt="Scanned facial profile" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-emerald-900/10 mix-blend-color" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-mono text-[10px] rounded border border-white/10 cursor-pointer"
                    >
                      SCAN FACE AGAIN
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4 w-full">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full max-w-sm py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 font-mono text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4 animate-bounce" /> INITIALIZE WEB-CAMERA FACE REGISTER
                  </button>

                  <div className="w-full">
                    <div className="text-slate-500 text-[10px] text-center font-mono uppercase mb-2">OR USE AN ADVENTURER PRESET MODEL</div>
                    <div className="grid grid-cols-3 gap-2">
                      {PRESET_AVATARS.map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectPresetAvatar(preset.url)}
                          className="p-1.5 rounded-lg border border-white/10 bg-slate-900 hover:border-emerald-500/40 transition-all flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <img src={preset.url} alt={preset.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                          <span className="text-[9px] text-slate-400 text-center font-mono leading-tight">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} width="320" height="240" className="hidden" />
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">Registered Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="E.g., Dr. Abhay"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 text-white border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">Phone Number (Emergency Contact Broadcast)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 text-white border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">Nationality</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="E.g., India"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 text-white border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">Passport / ID</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="E.g., 1234 5678 9012 or P1234567"
                      value={passportId}
                      onChange={(e) => setPassportId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">Stay Duration</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="E.g., 5 Days"
                      value={stayDuration}
                      onChange={(e) => setStayDuration(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {registrationError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs font-mono text-red-400">
                {registrationError}
              </div>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-mono text-sm font-bold shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isRegistering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>REGISTERING DIGITAL ID...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>INITIALIZE DIGITAL ID</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* REGISTERED TOURIST DASHBOARD */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 lg:p-8">
          
          {/* INCIDENT RESOLVED NOTIFICATIONS */}
          {incidentNotifications.length > 0 && (
            <div className="lg:col-span-12 space-y-2">
              {incidentNotifications.map(notif => (
                <div 
                  key={notif.id}
                  className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 flex items-center justify-between gap-4 font-mono text-xs shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-pulse" />
                    <div>
                      <span className="font-extrabold text-emerald-400 uppercase text-[10px] block">
                        INCIDENT RESOLVED &bull; {new Date(notif.timestamp).toLocaleTimeString()}
                      </span>
                      <p className="font-semibold text-white mt-0.5">{notif.message}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIncidentNotifications(prev => prev.filter(n => n.id !== notif.id));
                    }}
                    className="px-2.5 py-1 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 font-bold rounded text-[9px] uppercase border border-emerald-500/20 cursor-pointer"
                  >
                    DISMISS
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* ACTIVE DISPATCH ANNOUNCEMENTS */}
          {activeAlerts.length > 0 && (
            <div className="lg:col-span-12 space-y-2">
              {activeAlerts.map(alert => (
                <div 
                  key={alert.id}
                  className="p-4 rounded-xl border border-red-500/40 bg-red-950/20 text-red-200 flex items-center justify-between gap-4 font-mono text-xs shadow-lg animate-pulse"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <span className="font-extrabold text-red-400 uppercase text-[10px] block">ACTIVE PATROL ALARM ({new Date(alert.timestamp).toLocaleTimeString()})</span>
                      <p className="font-semibold text-white mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (!dismissedAlertIds.includes(alert.id)) {
                        handleDismissAlert(alert.id);
                      } else {
                        setDismissedAlertIds(prev => prev.filter(id => id !== alert.id));
                      }
                    }}
                    className="px-2.5 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 font-bold rounded text-[9px] uppercase border border-red-500/20 cursor-pointer"
                  >
                    {!dismissedAlertIds.includes(alert.id) ? 'DISMISS OVERLAY' : 'SHOW OVERLAY'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* LEFT RAIL: TELEMETRY & SOS */}
          <div className="lg:col-span-4 space-y-6 flex flex-col justify-between h-full">
            <div className="space-y-6">
              {/* DIGITAL ID CARD */}
              <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                {/* Hologram lines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-mono text-slate-300 font-bold uppercase">SAFE TOUR PASSPORT</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="flex gap-4 items-start">
                  <img 
                    src={currentTourist.facePhoto} 
                    alt="Facial snapshot" 
                    className="w-16 h-16 rounded-lg object-cover border border-white/10 bg-slate-900"
                  />
                  <div className="space-y-1 font-mono">
                    <div className="text-sm font-semibold text-white tracking-wide">{currentTourist.name}</div>
                    <div className="text-[10px] text-slate-400">PHONE: {currentTourist.phone}</div>
                    <div className="text-[9px] text-emerald-400 break-all select-all font-mono font-bold">BLOCK-ID: {currentTourist.id}</div>
                  </div>
                </div>

                {/* QR Code identity passport checkpoint scan */}
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center gap-2">
                  <div 
                    onClick={() => setIsQrZoomed(true)}
                    className="relative group cursor-pointer p-1.5 bg-black/50 hover:bg-black border border-white/5 hover:border-emerald-500/40 rounded-xl transition-all duration-300"
                    title="Tap to zoom QR Passport"
                  >
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=000000&bgcolor=ffffff&data=${encodeURIComponent(currentTourist.id)}`} 
                      alt="ID QR Code" 
                      className="w-20 h-20 rounded bg-white p-1" 
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-mono font-bold text-emerald-400">
                      TAP TO ZOOM
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider text-center">CHECKPOINT DYNAMIC QR PASS</span>
                  
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to log out and reset this tourist portal session?')) {
                        localStorage.removeItem('safetour_tourist');
                        setCurrentTourist(null);
                      }
                    }}
                    className="mt-2 w-full py-1.5 bg-red-950/20 hover:bg-red-900/40 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded font-mono text-[9px] uppercase font-bold tracking-wider cursor-pointer transition-all"
                  >
                    RESET PORTAL / LOG OUT
                  </button>
                </div>
              </div>

              {/* DYNAMIC SAFETY RATING / GEO-FENCING ALERT */}
              <div className={`p-4 rounded-xl border text-xs font-mono font-bold flex flex-col gap-2 shadow-md ${safetyStatus.color}`}>
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 animate-pulse" />
                  <span>SAFETY STANDING: {safetyStatus.text}</span>
                </div>
              </div>

              {/* BIG CRITICAL SOS TRIGGER BUTTON */}
              <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl text-center flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
                {/* Visual red gradient glow behind button if SOS is active */}
                {currentTourist.sosActive && (
                  <div className="absolute inset-0 bg-red-950/20 animate-pulse pointer-events-none" />
                )}

                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> INSTANT INCIDENT DISPATCH
                </h3>
                <p className="text-[10px] font-mono text-slate-550 mb-4 max-w-xs">
                  PRESSING SEND BROADCASTS A SEARCH & RESCUE BEACON ACROSS LOCAL CHAIN NODES IMMEDIATELY
                </p>

                <button
                  onClick={handleSosToggle}
                  disabled={sosLoading}
                  className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer shadow-[0_0_30px_rgba(220,38,38,0.3)] outline-none select-none relative z-10 ${
                    currentTourist.sosActive 
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-[pulse-red_1.5s_infinite] border-4 border-red-300/60' 
                    : 'bg-slate-900 hover:bg-red-950/40 text-red-500 border-2 border-red-500/40 hover:border-red-500'
                  }`}
                  id="sos-trigger-button"
                >
                  <AlertOctagon className={`w-12 h-12 mb-1 ${currentTourist.sosActive ? 'animate-bounce' : 'text-red-500'}`} />
                  <span className="text-xs font-bold font-mono tracking-tighter">
                    {currentTourist.sosActive ? 'SOS ACTIVE' : 'PRESS SOS'}
                  </span>
                  <span className="text-[8px] font-mono opacity-80 mt-1">
                    {currentTourist.sosActive ? 'CLICK TO RESET' : 'BROADCAST BEACON'}
                  </span>
                </button>

                {currentTourist.sosActive && (
                  <button
                    onClick={handleSosToggle}
                    disabled={sosLoading}
                    className="mt-4 w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs rounded border border-red-400/40 hover:border-red-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.4)] z-10 animate-pulse"
                    id="stop-sos-button"
                  >
                    STOP SOS SIGNAL
                  </button>
                )}
              </div>

              {/* EMERGENCY PHONE DIRECTORY */}
              <div className="p-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
                <h3 className="text-xs font-mono font-bold text-white mb-3 uppercase flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-400" /> EMERGENCY VOICE CALL DIRECTORY
                </h3>
                <div className="space-y-3 font-mono text-xs">
                  {emergencyContacts.map((contact, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b border-white/10 pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <span className="block text-white text-[11px] font-semibold">{contact.name}</span>
                        <span className="text-[9px] text-slate-500">{contact.role}</span>
                      </div>
                      <a 
                        href={`tel:${contact.number.replace(/\s+/g, '')}`} 
                        className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-950/30 hover:border-emerald-500/50 border border-white/10 text-emerald-400 rounded text-[10px] font-bold transition-all cursor-pointer"
                      >
                        {contact.number}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>



          </div>

          {/* RIGHT RAIL: GOOGLE MAPS & SIMULATION PANEL */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* SIMULATOR CONTROLLER CARDS */}
            <div className="p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-2xl">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> WILDERNESS GPS WALKER SIMULATOR
                </span>
                <p className="text-[10px] font-mono text-slate-400">
                  Simulate walking in real-time between ranger bases, lakes, and high-cliff danger fences in Shillong and Meghalaya.
                </p>
              </div>

              <div className="flex gap-2 items-center">
                <div className="text-right text-[10px] font-mono mr-2">
                  <span className="block text-slate-500">CURRENT WAYPOINT</span>
                  <span className="text-white font-bold">{simulationPath[simulationIndex].name}</span>
                </div>
                <button
                  onClick={handleSimulatePath}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-mono font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  <Play className="w-3.5 h-3.5" /> WALK TO NEXT COORDINATE
                </button>
              </div>
            </div>

            {/* GOOGLE MAP */}
            <div className="relative">
              <div className="absolute top-4 left-4 z-10 flex gap-2 font-mono text-[10px]">
                <div className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/70 text-slate-300 backdrop-blur-md">
                  LAT: <span className="text-white font-bold">{coords.lat.toFixed(5)}</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/70 text-slate-300 backdrop-blur-md">
                  LNG: <span className="text-white font-bold">{coords.lng.toFixed(5)}</span>
                </div>
              </div>

              {/* Map element wrapper with forced height & overflow-hidden */}
              <div className="h-[520px] w-full rounded-2xl overflow-hidden shadow-2xl relative border border-white/10">
                  <Map
                    center={coords}
                    zoom={13}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                    gestureHandling="greedy"
                    zoomControl={true}
                    disableDefaultUI={false}
                  >
                    {/* Draw registered geo-fences */}
                    {geoFences.map(fence => (
                      <React.Fragment key={fence.id}>
                        <MapCircle 
                          center={{ lat: fence.lat, lng: fence.lng }} 
                          radius={fence.radius} 
                          type={fence.type} 
                        />
                        <AdvancedMarker 
                          position={{ lat: fence.lat, lng: fence.lng }}
                        >
                          <Pin 
                            background={fence.type === 'safe' ? '#10B981' : '#EF4444'} 
                            glyphColor="#fff"
                            scale={0.8}
                          />
                        </AdvancedMarker>
                      </React.Fragment>
                    ))}

                    {/* Current user marker */}
                    <AdvancedMarker position={coords}>
                      <div className="relative flex flex-col items-center">
                        <div className={`p-1 rounded-full border-2 bg-slate-900 ${currentTourist.sosActive ? 'border-red-500 animate-pulse' : 'border-emerald-400 shadow-lg'}`}>
                          <img 
                            src={currentTourist.facePhoto} 
                            alt="avatar" 
                            className="w-10 h-10 rounded-full object-cover" 
                          />
                        </div>
                        {currentTourist.sosActive && (
                          <span className="absolute -top-3.5 px-1.5 py-0.5 bg-red-600 text-white font-mono text-[8px] font-bold rounded animate-bounce">
                            SOS ALARM
                          </span>
                        )}
                        {!currentTourist.sosActive && (
                          <span className="absolute -top-3.5 px-1.5 py-0.5 bg-emerald-600 text-white font-mono text-[8px] font-bold rounded">
                            YOU
                          </span>
                        )}
                      </div>
                    </AdvancedMarker>
                  </Map>
              </div>

              {/* Waypoint details overlay in map footer */}
              <div className="absolute bottom-4 left-4 right-4 z-10 p-3 rounded-xl border border-white/10 bg-black/60 text-slate-300 backdrop-blur-md text-xs font-mono">
                <span className="font-bold text-emerald-400 block mb-0.5">LOCATION LOG: {simulationPath[simulationIndex].name}</span>
                <span className="text-slate-400 text-[11px]">{simulationPath[simulationIndex].note}</span>
              </div>
            </div>

            {/* INCIDENT REPORT STATION */}
            <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <h3 className="text-sm font-mono font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-500 animate-pulse" /> REPORT WILDERNESS INCIDENT / GET HELP
              </h3>
              <p className="text-[10px] font-mono text-slate-400 mb-4">
                Encountered an issue or need immediate ranger support? Submit a report below.
                <span className="text-amber-400 font-bold"> Your current GPS coordinates ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}) will be attached automatically.</span>
              </p>

              <form onSubmit={handleIncidentSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">Select Incident Category</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {[
                      'Missing property',
                      'Medical help needed',
                      'Wildlife encounter',
                      'Trail block / Hazard'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setIncidentReportMessage(preset)}
                        className={`p-2 rounded-lg border font-mono text-[10px] font-semibold text-center transition-all cursor-pointer ${
                          incidentReportMessage === preset
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">Incident Details / Custom Message</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide detailed description of the incident, injuries, or assistance needed..."
                    value={incidentReportMessage}
                    onChange={(e) => {
                      setIncidentReportMessage(e.target.value);
                      if (reportSuccess) setReportSuccess(false);
                    }}
                    className="w-full p-3 bg-slate-900 text-white border border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs font-mono transition-all"
                  />
                </div>

                {reportSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>REPORT SUBMITTED: Coordinates attached and broadcasted to Ranger Dispatch.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={reportLoading}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono text-xs font-bold shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {reportLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>DECENTRALIZING DISTRESS REPORT...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>SUBMIT COORD-TAGGED REPORT</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* Zoomed QR Code Modal */}
      {isQrZoomed && currentTourist && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-[#090d0e] border border-white/10 p-6 rounded-2xl max-w-sm w-full text-center relative shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-scaleUp">
            <button 
              onClick={() => setIsQrZoomed(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold font-mono text-lg cursor-pointer"
            >
              ✕
            </button>
            <div className="mb-4">
              <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">DIGITAL ID QR PASS</h3>
              <p className="text-[10px] text-slate-400 font-mono">SCAN CHECKPOINT TO VALIDATE IDENTITY</p>
            </div>
            <div className="bg-black/60 p-4 rounded-xl border border-white/5 flex justify-center mb-4 shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=000000&bgcolor=ffffff&data=${encodeURIComponent(currentTourist.id)}`} 
                alt="Zoomed Digital ID QR Code" 
                className="w-48 h-48 rounded border border-emerald-500/20 bg-white p-2" 
              />
            </div>
            <div className="space-y-1 font-mono text-left text-[11px] border-t border-white/10 pt-4 text-slate-300">
              <div><span className="text-slate-500">NAME:</span> <span className="text-white font-bold">{currentTourist.name}</span></div>
              <div><span className="text-slate-500">PHONE:</span> <span className="text-white font-bold">{currentTourist.phone}</span></div>
              <div><span className="text-slate-500">LAST COORDS:</span> <span className="text-white font-bold text-emerald-400">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span></div>
              <div className="truncate"><span className="text-slate-500">BLOCK ID:</span> <span className="text-emerald-400 text-[10px] select-all">{currentTourist.id}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL DISPATCH EMERGENCY OVERLAY MODAL */}
      {currentTourist && pendingAlerts.length > 0 && (
        (() => {
          const activeAlert = pendingAlerts[0];
          return (
            <div className="fixed inset-0 bg-red-950/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 font-mono">
              <div className="bg-[#0e0404] border-2 border-red-500/80 p-8 rounded-3xl max-w-lg w-full relative overflow-hidden shadow-[0_0_80px_rgba(239,68,68,0.5)] animate-scaleUp">
                
                {/* Hazard stripes at the top */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,#0e0404_10px,#0e0404_20px)]" />

                {/* Sound waves or alert pulse effects */}
                <div className="flex flex-col items-center text-center space-y-6 mt-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-bounce">
                    <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-red-500 font-bold text-xs uppercase tracking-[0.25em] block animate-pulse">
                      ⚠️ CRITICAL SYSTEM BROADCAST ⚠️
                    </span>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">
                      EMERGENCY ALERT FROM CENTRAL PATROL
                    </h2>
                  </div>

                  {/* The actual broadcast message */}
                  <div className="p-5 bg-red-950/30 border border-red-500/30 rounded-2xl w-full text-left text-xs space-y-3">
                    <div className="text-red-400 font-bold uppercase text-[10px] tracking-wider flex justify-between">
                      <span>ALERT MSG // INCOMING</span>
                      <span>{new Date(activeAlert.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-white text-sm font-bold leading-relaxed whitespace-pre-line border-t border-red-500/10 pt-3">
                      {activeAlert.message}
                    </div>
                  </div>

                  {/* Guidelines reminder based on broadcast info */}
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm">
                    This broadcast is registered in the system. Please read carefully and take appropriate safety actions immediately.
                  </p>

                  <button
                    onClick={() => handleDismissAlert(activeAlert.id)}
                    className="w-full py-3.5 bg-red-500 hover:bg-red-400 text-stone-950 font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_35px_rgba(239,68,68,0.6)] hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    CONFIRM & ACKNOWLEDGE WARNING
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
