import MapplsMap from "./MapplsMap";
import { motion, AnimatePresence } from 'motion/react';
import BatteryIndicator from "./BatteryIndicator";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Shield, AlertOctagon, Phone, Wifi, WifiOff, RefreshCw, 
  MapPin, HelpCircle, ShieldAlert, CheckCircle2, Navigation,
  Award, Play, ArrowRight, User, HeartPulse, Globe, FileText, Clock, Cloud, Thermometer, Wind
} from 'lucide-react';
import { Tourist, GeoFence } from '../types';

// MapCircle draws a google.maps.Circle using the raw map instance


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
  const [digitalIdTab, setDigitalIdTab] = useState<'card' | 'json'>('card');
  const [copiedProof, setCopiedProof] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Current registered tourist state (loaded from session or state)
  const [currentTourist, setCurrentTourist] = useState<Tourist | null>(() => {
    try {
      const stored = localStorage.getItem('safetour_tourist');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [suggestedPlaces, setSuggestedPlaces] = useState<{title: string, uri: string, lat?: number, lng?: number}[]>([]);
  const [geoFences, setGeoFences] = useState<GeoFence[]>(() => {
    try {
      const stored = localStorage.getItem('safetour_geofences');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [sosLoading, setSosLoading] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [safetyNews, setSafetyNews] = useState<any[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [incidentNotifications, setIncidentNotifications] = useState<{
    id: string;
    message: string;
    incidentMessage: string;
    timestamp: number;
  }[]>([]);
  
  // Offline state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  const currentTouristRef = useRef(currentTourist);
  useEffect(() => {
    currentTouristRef.current = currentTourist;
    if (currentTourist) {
      localStorage.setItem('safetour_tourist', JSON.stringify(currentTourist));
    } else {
      localStorage.removeItem('safetour_tourist');
    }
  }, [currentTourist]);
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
          let containerClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
          let dotClass = 'bg-emerald-500';
          
          if (code >= 1 && code <= 3) {
            status = 'Cloudy / Fair';
            color = 'blue';
            containerClass = 'bg-blue-50 border-blue-200 text-blue-700';
            dotClass = 'bg-blue-500';
          } else if (code >= 51 && code <= 67) {
            status = 'Rain Alert: Wet Trails';
            color = 'amber';
            containerClass = 'bg-amber-50 border-amber-200 text-amber-700';
            dotClass = 'bg-amber-500';
          } else if (code >= 71 && code <= 86) {
            status = 'Snow / Hail Alert';
            color = 'red';
            containerClass = 'bg-red-50 border-red-200 text-red-700';
            dotClass = 'bg-red-500';
          } else if (code >= 95) {
            status = 'Thunderstorm Warning';
            color = 'red';
            containerClass = 'bg-red-50 border-red-200 text-red-700';
            dotClass = 'bg-red-500';
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
  const [isAutoPilotWalking, setIsAutoPilotWalking] = useState(false);
  const autoPilotIntervalRef = useRef<any>(null);
  const walkTimerRef = useRef<any>(null);
  

    const simulationPath = [
    { name: 'Police Bazaar Safe Base', lat: 25.5760, lng: 91.8825, note: 'Inside Ranger safe zone perimeter.' },
    { name: 'Shillong Peak Wilderness', lat: 25.5398, lng: 91.8617, note: 'Remote mountain wilderness region.' },
    { name: 'Cherrapunji (Sohra) Cliffs', lat: 25.2755, lng: 91.7346, note: 'Deep cliffs, high rainfall zone.' },
    { name: 'Dawki River Border', lat: 25.1837, lng: 92.0163, note: 'International border crossing.' },
    { name: 'Krang Suri Waterfalls', lat: 25.2891, lng: 92.1752, note: 'Forest waterfall reserve.' },
    { name: 'Umiam Lake Boating Area', lat: 25.6601, lng: 91.8953, note: 'WARNING: Inside deep water hazard zone.' },
    { name: 'Nongriat Root Bridges', lat: 25.2447, lng: 91.6811, note: 'Dense tropical forest.' },
    { name: 'Returning to Safe Haven', lat: 25.5760, lng: 91.8825, note: 'Safely arrived back at Ranger base.' },
  ];

  // Emergency contact directory
  const emergencyContacts = [
    { name: 'Shillong Search & Rescue', number: '1-800-SAR-BASE', role: 'Air & Ground Rescue Unit' },
    { name: 'Wilderness Medical Dispatch', number: '1-888-MED-WILD', role: 'Emergency Field First Aid' },
    { name: 'Central Ranger Base Station', number: '+1 (209) 372-0200', role: 'Liaison & Patrol Center' },
    { name: 'Police', number: '100', role: 'Local Police Assistance' },
  ];

  // Load geo-fences, alerts, and safety advisories on mount
  useEffect(() => {
    fetchFences();
    fetchAlerts();
    fetchNews();
    const interval = setInterval(() => {
      fetchFences();
      fetchAlerts();
      fetchNews();
      if (currentTourist && !isOfflineMode) {
        syncLocation(coords.lat, coords.lng);
        checkRegistrationStatus();
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
    const activeTouristOnMount = currentTouristRef.current;
    if (!activeTouristOnMount || isOfflineMode) return;

    const eventSource = new EventSource('/api/sse');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const activeTourist = currentTouristRef.current;
        if (!activeTourist) return;

        if (payload.type === 'TOURISTS_CLEARED' || (payload.type === 'TOURIST_REMOVED' && payload.data.id === activeTourist.id)) {
          localStorage.removeItem('safetour_tourist');
          setCurrentTourist(null);
          return;
        }
        if (payload.type === 'NEWS_UPDATED') {
          setSafetyNews(payload.data);
        } else if (payload.type === 'ALERT_BROADCAST') {
          setActiveAlerts(prev => {
            if (prev.some(a => a.id === payload.data.id)) return prev;
            return [payload.data, ...prev];
          });
        } else if (payload.type === 'ALERT_CLEARED') {
          if (payload.data.alertId) {
            setActiveAlerts(prev => prev.filter(a => a.id !== payload.data.alertId));
          } else {
            setActiveAlerts([]);
          }
        }
        if (payload.type === 'REPORT_RESOLVED') {
          const report = payload.data;
          if (report.touristId === activeTourist.id) {
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
  }, [currentTourist !== null, isOfflineMode]);

  // Handle forceful local logouts triggered by same-browser checkout
  useEffect(() => {
    const handleLogoutEvent = (e: any) => {
      if (e.type === 'safetour_logout' || !localStorage.getItem('safetour_tourist')) {
        console.log("Forceful logout triggered via event or storage change.");
        setCurrentTourist(null);
      }
    };
    window.addEventListener('storage', handleLogoutEvent);
    window.addEventListener('safetour_logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('storage', handleLogoutEvent);
      window.removeEventListener('safetour_logout', handleLogoutEvent);
    };
  }, []);

  const fetchFences = async () => {
    try {
      const res = await fetch('/api/geofences');
      if (res.ok) {
        const data = await res.json();
        setGeoFences(data);
        localStorage.setItem('safetour_geofences', JSON.stringify(data));
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

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/disaster-news');
      if (res.ok) {
        const data = await res.json();
        setSafetyNews(data);
      }
    } catch (e) {
      console.log('Failed to fetch safety advisories');
    }
  };

  const checkRegistrationStatus = async () => {
    if (!currentTourist || isOfflineMode) return;
    try {
      const res = await fetch('/api/tourists');
      if (res.ok) {
        const list = await res.json();
        const exists = list.some((t: any) => t.id === currentTourist.id);
        if (!exists) {
          console.log("Tourist no longer registered on server. Force logging out.");
          localStorage.removeItem('safetour_tourist');
          setCurrentTourist(null);
        }
      }
    } catch (e) {
      console.log('Failed to check tourist registration status');
    }
  };

  const handleResetPortal = async () => {
    if (currentTourist) {
      try {
        await fetch(`/api/tourists/${currentTourist.id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to delete tourist session on backend server:', e);
      }
    }
    localStorage.removeItem('safetour_tourist');
    setCurrentTourist(null);
    setShowResetConfirm(false);
    
    // Clear registration fields
    setName('');
    setPhone('');
    setNationality('');
    setPassportId('');
    setStayDuration('');
    setPhoto('');
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
      const res = await fetch('/api/tourists/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touristId: currentTourist.id,
          lat,
          lng,
          offlineMode: false
        })
      });
      if (res.ok) {
        const updated = { ...currentTourist, lat, lng, offlineMode: false };
        setCurrentTourist(updated);
        localStorage.setItem('safetour_tourist', JSON.stringify(updated));
      } else if (res.status === 404) {
        localStorage.removeItem('safetour_tourist');
        setCurrentTourist(null);
      }
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
    
    // Clear any previous walking timer first to avoid race conditions
    if (walkTimerRef.current) {
      clearInterval(walkTimerRef.current);
    }
    
    setIsSimulatingPath(true);
    const nextIdx = (simulationIndex + 1) % simulationPath.length;
    setSimulationIndex(nextIdx);
    const destination = simulationPath[nextIdx];
    
    // Start smooth walk interpolation from coords to destination
    const startLat = coords.lat;
    const startLng = coords.lng;
    const targetLat = destination.lat;
    const targetLng = destination.lng;
    
    const steps = 15;
    let currentStep = 0;
    
    walkTimerRef.current = setInterval(() => {
      currentStep++;
      const fraction = currentStep / steps;
      
      const intermediateLat = startLat + (targetLat - startLat) * fraction;
      const intermediateLng = startLng + (targetLng - startLng) * fraction;
      
      setCoords({ lat: intermediateLat, lng: intermediateLng });
      syncLocation(intermediateLat, intermediateLng);
      
      if (currentStep >= steps) {
        clearInterval(walkTimerRef.current);
        walkTimerRef.current = null;
        setCoords({ lat: targetLat, lng: targetLng });
        syncLocation(targetLat, targetLng);
        setIsSimulatingPath(false);
      }
    }, 150);
  };

  const toggleAutoPilotWalk = () => {
    if (isAutoPilotWalking) {
      if (autoPilotIntervalRef.current) {
        clearInterval(autoPilotIntervalRef.current);
        autoPilotIntervalRef.current = null;
      }
      setIsAutoPilotWalking(false);
    } else {
      setIsAutoPilotWalking(true);
      // Run immediately first
      handleSimulatePath();
      // Then schedule every 6 seconds
      autoPilotIntervalRef.current = setInterval(() => {
        handleSimulatePath();
      }, 6000);
    }
  };

  // Clean up all active intervals/timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoPilotIntervalRef.current) {
        clearInterval(autoPilotIntervalRef.current);
      }
      if (walkTimerRef.current) {
        clearInterval(walkTimerRef.current);
      }
    };
  }, []);

  // Check if current coordinate is in a danger zone
  const getSafetyStatus = () => {
    let status = { text: 'GREEN ZONE (SECURE)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    
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
      status = { text: 'SOS CRITICAL ALARM TRANSMITTING', color: 'text-red-700 bg-red-50 border-red-200 animate-pulse' };
    } else if (inDanger) {
      status = { text: 'RED ZONE (DANGER FENCE ACTIVE)', color: 'text-amber-700 bg-amber-50 border-amber-200 animate-pulse' };
    }

    return status;
  };

  const safetyStatus = getSafetyStatus();

  const pendingAlerts = activeAlerts.filter(alert => !dismissedAlertIds.includes(alert.id));

  return (
    <div className="w-full">
      {/* Developed By Banner */}
      <div className="w-full text-center py-2 text-sm font-sans font-black text-slate-700 bg-white/70 border-b border-slate-200 shadow-xs uppercase tracking-wider">
        Developed by Abhay Chavadi, Choudari Lalithya, Vaibhavi, Nandita, Pavan, Ramya V R
      </div>
      {/* Offline Status Bar */}
      <div className={`w-full py-3 px-5 border-b transition-all duration-300 text-sm font-sans flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md ${isOfflineMode ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-emerald-100 border-emerald-300 text-emerald-800'}`}>
        <div className="flex items-center gap-2">
          {isOfflineMode ? (
            <>
              <WifiOff className="w-5 h-5 animate-pulse text-amber-700" />
              <span className="font-black tracking-wide">OFFLINE SECURITY ENGAGED (LOCAL CACHE DEPLOYED)</span>
            </>
          ) : (
            <>
              <Wifi className="w-5 h-5 animate-pulse text-emerald-700" />
              <span className="animate-pulse font-black tracking-wide">SECURE NETWORK LINK OPERATIONAL</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <BatteryIndicator />
          <button 
            onClick={toggleOfflineMode}
            className={`px-4.5 py-1.5 rounded-full text-xs font-black border transition-all cursor-pointer ${isOfflineMode ? 'border-amber-400 bg-amber-500 hover:bg-amber-600 text-white shadow-md' : 'border-emerald-400 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'}`}
          >
            {isOfflineMode ? 'GO ONLINE & SYNC' : 'GO OFFLINE (SIMULATE DISCONNECTED)'}
          </button>
        </div>
      </div>

      {/* Automated Weather Notification Banner */}
      {weatherAlert && (
        <div className={`w-full py-3 px-5 border-b transition-all duration-300 text-sm font-sans flex flex-col md:flex-row items-center justify-between backdrop-blur-md ${weatherAlert.containerClass}`}>
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start mb-2 md:mb-0">
            <div className="flex items-center gap-2 font-black">
              <Cloud className="w-5 h-5 animate-pulse text-emerald-700" />
              <span className="font-black tracking-widest text-base">{weatherAlert?.status?.toUpperCase() || ''}</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 border-l border-slate-300 pl-4 text-slate-800 font-extrabold">
              <span className="flex items-center gap-1.5 text-base"><Thermometer className="w-4 h-4 text-emerald-700" /> {weatherAlert.temperature}°C</span>
              <span className="flex items-center gap-1.5 text-base"><Wind className="w-4 h-4 text-emerald-700" /> {weatherAlert.windspeed} km/h</span>
            </div>
          </div>
          
          {weatherAlert.forecast && weatherAlert.forecast.length > 0 && (
            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <span className="hidden sm:inline text-slate-600 font-black">TODAY'S FORECAST:</span>
              <div className="flex items-center gap-4 bg-white/70 border border-slate-200 px-4 py-1.5 rounded-full shadow-sm">
                {weatherAlert.forecast.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 border-r border-slate-200 pr-4 last:border-0 last:pr-0 text-slate-800">
                    <span className="opacity-95 font-bold">{f.time}</span>
                    <span className="font-black">{f.temp}°</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] opacity-70 mt-2 md:mt-0 w-full md:w-auto justify-end text-slate-500">
            <span className="hidden sm:inline">LIVE METEO SYNC</span>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${weatherAlert.dotClass}`} />
          </div>
        </div>
      )}

      {!currentTourist ? (
        /* REGISTRATION CARD */
        <motion.div 
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-xl mx-auto my-12 p-8 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-lg relative overflow-hidden text-slate-800"
        >
          {/* Visual Scanline Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent h-1/2 w-full animate-scanline pointer-events-none" />

          <div className="text-center mb-8 relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.1)]">
              <Shield className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-sans font-black tracking-wider text-emerald-800 uppercase italic">Central Registration Hub</h2>
            <p className="text-xs sm:text-sm font-sans font-black text-slate-600 mt-2 tracking-wide uppercase">MINING REAL-TIME SECURE IMMUTABLE DIGITAL ID</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6 relative">
            {/* Webcam / Selfie Module */}
            <div className="flex flex-col items-center p-5 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-xs sm:text-sm font-sans text-slate-750 mb-3 flex items-center gap-1.5 self-start font-black tracking-wider uppercase">
                <Camera className="w-4 h-4 text-emerald-600" /> BIO-METRIC FACIAL SIGNATURE CAPTURE
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
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-black rounded-full border border-emerald-400 shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-4 h-4 animate-spin-slow" /> CAPTURE BIO-DATA
                  </button>
                </div>
              ) : photo ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-40 h-40 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md">
                    <img src={photo} alt="Scanned facial profile" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-emerald-900/10 mix-blend-color" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-sans text-xs font-black rounded-full border border-slate-300 cursor-pointer shadow-sm"
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
                    className="w-full max-w-sm py-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 text-emerald-700 font-sans text-sm font-black rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Camera className="w-5 h-5 animate-bounce text-emerald-600" /> INITIALIZE WEB-CAMERA FACE REGISTER
                  </button>

                  <div className="w-full">
                    <div className="text-slate-500 text-xs text-center font-sans uppercase mb-2.5 font-black tracking-wide">OR USE AN ADVENTURER PRESET MODEL</div>
                    <div className="grid grid-cols-3 gap-2">
                      {PRESET_AVATARS.map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectPresetAvatar(preset.url)}
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-slate-50 transition-all flex flex-col items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <img src={preset.url} alt={preset.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                          <span className="text-[10px] text-slate-600 text-center font-sans font-black leading-tight">{preset.name}</span>
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
                <label className="block text-xs font-sans text-slate-700 uppercase mb-1.5 font-black tracking-wider">Registered Name</label>
                <div className="relative animate-pulse">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 animate-bounce" />
                  <input
                    type="text"
                    required
                    placeholder="E.g., Dr. Abhay"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm font-bold transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1.5 font-bold">Phone Number (Emergency Contact Broadcast)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1.5 font-bold">Nationality</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="E.g., India"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1.5 font-bold">Passport / ID</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="E.g., P1234567"
                      value={passportId}
                      onChange={(e) => setPassportId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1.5 font-bold">Stay Duration</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="E.g., 5 Days"
                      value={stayDuration}
                      onChange={(e) => setStayDuration(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {registrationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-mono text-red-700 font-bold">
                {registrationError}
              </div>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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
        </motion.div>
      ) : (
        /* REGISTERED TOURIST DASHBOARD */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 lg:p-8"
        >
          
          {/* INCIDENT RESOLVED NOTIFICATIONS */}
          {incidentNotifications.length > 0 && (
            <div className="lg:col-span-12 space-y-2">
              {incidentNotifications.map(notif => (
                <div 
                  key={notif.id}
                  className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center justify-between gap-4 font-mono text-xs shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 animate-pulse" />
                    <div>
                      <span className="font-extrabold text-emerald-700 uppercase text-[10px] block">
                        INCIDENT RESOLVED &bull; {new Date(notif.timestamp).toLocaleTimeString()}
                      </span>
                      <p className="font-semibold text-slate-800 mt-0.5">{notif.message}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIncidentNotifications(prev => prev.filter(n => n.id !== notif.id));
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[9px] uppercase border border-emerald-200 cursor-pointer transition-colors shadow-sm"
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
                  className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-center justify-between gap-4 font-mono text-xs shadow-sm animate-pulse"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <span className="font-extrabold text-red-700 uppercase text-[10px] block">ACTIVE PATROL ALARM ({new Date(alert.timestamp).toLocaleTimeString()})</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{alert.message}</p>
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
                    className="px-2.5 py-1 bg-white hover:bg-red-100 text-red-700 font-bold rounded text-[9px] uppercase border border-red-200 cursor-pointer transition-colors shadow-sm"
                  >
                    {!dismissedAlertIds.includes(alert.id) ? 'DISMISS OVERLAY' : 'SHOW OVERLAY'}
                  </button>
                </div>
              ))}
            </div>
          )}



          {/* LEFT RAIL: TELEMETRY & SOS */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-4 space-y-6 flex flex-col justify-between h-full"
          >
            <div className="space-y-6">
              {/* DIGITAL ID CARD */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                {/* Hologram lines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-mono text-slate-700 font-bold uppercase">SAFE TOUR PASSPORT</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-bounce" />
                </div>

                <div className="flex gap-4 items-start">
                  <img 
                    src={currentTourist.facePhoto} 
                    alt="Facial snapshot"                     className="w-16 h-16 rounded-lg object-cover border border-slate-200 bg-slate-100"
                  />
                  <div className="space-y-1 font-mono">
                    <div className="text-sm font-bold text-slate-800 tracking-wide">{currentTourist.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold">PHONE: {currentTourist.phone}</div>
                    <div className="text-[9px] text-emerald-700 break-all select-all font-mono font-bold">BLOCK-ID: {currentTourist.id}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsQrZoomed(true)}
                  className="mt-4 w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-[10px] uppercase font-black tracking-wider cursor-pointer rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md border border-emerald-400/40"
                >
                  <Award className="w-4 h-4 animate-pulse" /> View Blockchain Digital ID
                </button>

                {/* QR Code identity passport checkpoint scan */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
                  <div 
                    onClick={() => setIsQrZoomed(true)}
                    className="relative group cursor-pointer p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-emerald-500 rounded-xl transition-all duration-300"
                    title="Tap to zoom QR Passport"
                  >
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=000000&bgcolor=ffffff&data=${encodeURIComponent(currentTourist.id)}`} 
                      alt="ID QR Code" 
                      className="w-20 h-20 rounded bg-white p-1" 
                    />
                    <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-mono font-bold text-emerald-750">
                      TAP TO ZOOM
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider text-center font-bold">CHECKPOINT DYNAMIC QR PASS</span>
                  
                  {!showResetConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="mt-2 w-full py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded font-mono text-[9px] uppercase font-bold tracking-wider cursor-pointer transition-all"
                    >
                      RESET PORTAL / LOG OUT
                    </button>
                  ) : (
                    <div className="mt-2 w-full flex flex-col gap-1.5">
                      <span className="text-[9px] font-mono font-black text-red-700 text-center animate-pulse">
                        DE-REGISTER SESSION & DELETE DATA?
                      </span>
                      <div className="flex gap-2 w-full">
                        <button
                          type="button"
                          onClick={handleResetPortal}
                          className="flex-1 py-1 px-2 bg-red-600 hover:bg-red-700 border border-red-700 text-white rounded font-mono text-[9px] uppercase font-black tracking-wider cursor-pointer transition-all"
                        >
                          YES, RESET
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(false)}
                          className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded font-mono text-[9px] uppercase font-black tracking-wider cursor-pointer transition-all"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DYNAMIC SAFETY RATING / GEO-FENCING ALERT */}
              <div className={`p-4 rounded-xl border text-xs font-mono font-bold flex flex-col gap-2 shadow-sm ${safetyStatus.color}`}>
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 animate-pulse" />
                  <span>SAFETY STANDING: {safetyStatus.text}</span>
                </div>
              </div>

              {/* BIG CRITICAL SOS TRIGGER BUTTON */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md text-center flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
                {/* Visual red gradient glow behind button if SOS is active */}
                {currentTourist.sosActive && (
                  <div className="absolute inset-0 bg-red-50 animate-pulse pointer-events-none" />
                )}

                <h3 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-650 animate-pulse" /> INSTANT INCIDENT DISPATCH
                </h3>
                <p className="text-[10px] font-mono text-slate-500 mb-4 max-w-xs font-bold leading-normal">
                  PRESSING SEND BROADCASTS A SEARCH & RESCUE BEACON ACROSS LOCAL CHAIN NODES IMMEDIATELY
                </p>

                <button
                  onClick={handleSosToggle}
                  disabled={sosLoading}
                  className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer shadow-[0_4px_20px_rgba(220,38,38,0.15)] outline-none select-none relative z-10 hover:animate-haptic-vibrate active:animate-haptic-vibrate ${
                    currentTourist.sosActive 
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-[pulse-red_1.5s_infinite] border-4 border-red-300/60 animate-haptic-vibrate' 
                    : 'bg-slate-50 hover:bg-red-50 text-red-600 border-2 border-red-200 hover:border-red-500'
                  }`}
                  id="sos-trigger-button"
                >
                  <AlertOctagon className={`w-12 h-12 mb-1 ${currentTourist.sosActive ? 'animate-bounce text-white' : 'text-red-650'}`} />
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
                    className="mt-4 w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs rounded-xl border border-red-500 hover:border-red-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.4)] z-10 animate-pulse hover:animate-haptic-vibrate active:animate-haptic-vibrate animate-haptic-vibrate"
                    id="stop-sos-button"
                  >
                    STOP SOS SIGNAL
                  </button>
                )}
              </div>

              {/* EMERGENCY PHONE DIRECTORY */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
                <h3 className="text-xs font-mono font-bold text-slate-800 mb-3 uppercase flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" /> EMERGENCY VOICE CALL DIRECTORY
                </h3>
                <div className="space-y-3 font-mono text-xs">
                  {emergencyContacts.map((contact, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <span className="block text-slate-800 text-[11px] font-bold">{contact.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{contact.role}</span>
                      </div>
                      <a 
                        href={`tel:${contact.number.replace(/\s+/g, '')}`} 
                        className="px-2.5 py-1 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-emerald-700 rounded-full text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                      >
                        {contact.number}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>



          </motion.div>

          {/* RIGHT RAIL: GOOGLE MAPS & SIMULATION PANEL */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="lg:col-span-8 space-y-6"
          >
                       {/* SIMULATOR CONTROLLER CARDS */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" /> WILDERNESS GPS WALKER SIMULATOR
                </span>
                <p className="text-[10px] font-mono text-slate-500 font-medium">
                  Simulate walking in real-time between ranger bases, lakes, and high-cliff danger fences in Shillong and Meghalaya.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <div className="text-right text-[10px] font-mono mr-2">
                  <span className="block text-slate-400 font-bold">CURRENT WAYPOINT</span>
                  <span className="text-slate-800 font-extrabold">{simulationPath[simulationIndex].name}</span>
                </div>
                
                <button
                  onClick={handleSimulatePath}
                  disabled={isAutoPilotWalking}
                  className={`px-4 py-2 text-white font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${
                    isAutoPilotWalking 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50' 
                      : 'bg-emerald-650 hover:bg-emerald-700'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" /> WALK TO NEXT
                </button>

                <button
                  onClick={toggleAutoPilotWalk}
                  className={`px-4 py-2 font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${
                    isAutoPilotWalking 
                      ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse' 
                      : 'bg-slate-800 hover:bg-slate-900 text-white'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAutoPilotWalking ? 'animate-spin' : ''}`} /> 
                  {isAutoPilotWalking ? 'STOP AUTO-WALK' : 'START AUTO-WALK'}
                </button>
              </div>
            </div>

            {/* GOOGLE MAP */}
            <div className="relative">
              <div className="absolute top-4 left-4 z-10 flex gap-2 font-mono text-[10px]">
                <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white/95 text-slate-700 backdrop-blur-md shadow-sm font-bold">
                  LAT: <span className="text-slate-900 font-extrabold">{coords.lat.toFixed(5)}</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white/95 text-slate-700 backdrop-blur-md shadow-sm font-bold">
                  LNG: <span className="text-slate-900 font-extrabold">{coords.lng.toFixed(5)}</span>
                </div>
              </div>

              {/* Map element wrapper with forced height & overflow-hidden */}
              <div className="h-[520px] w-full rounded-2xl overflow-hidden shadow-sm relative border border-slate-200">
                  <MapplsMap 
                    center={coords} 
                    zoom={13} 
                    geoFences={geoFences} 
                    tourists={currentTourist ? [{ ...currentTourist, lat: coords.lat, lng: coords.lng }] : []} 
                    suggestedPlaces={suggestedPlaces} 
                    isSimulatingPath={isSimulatingPath}
                    simulationIndex={simulationIndex}
                    isAutoPilotWalking={isAutoPilotWalking}
                  />
              </div>

              {/* Waypoint details overlay in map footer */}
              <div className="absolute bottom-4 left-4 right-4 z-10 p-3 rounded-xl border border-slate-200 bg-white/95 text-slate-700 backdrop-blur-md text-xs font-mono shadow-md">
                <span className="font-extrabold text-emerald-750 block mb-0.5">LOCATION LOG: {simulationPath[simulationIndex].name}</span>
                <span className="text-slate-500 font-medium text-[11px]">{simulationPath[simulationIndex].note}</span>
              </div>
            </div>

            {/* INCIDENT REPORT STATION */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <h3 className="text-sm font-mono font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-600 animate-pulse" /> REPORT WILDERNESS INCIDENT / GET HELP
              </h3>
              <p className="text-[10px] font-mono text-slate-500 mb-4 font-bold">
                Encountered an issue or need immediate ranger support? Submit a report below.
                <span className="text-amber-700 font-extrabold"> Your current GPS coordinates ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}) will be attached automatically.</span>
              </p>

              <form onSubmit={handleIncidentSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1.5 font-bold">Select Incident Category</label>
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
                        className={`p-2 rounded-lg border font-mono text-[10px] font-bold text-center transition-all cursor-pointer ${
                          incidentReportMessage === preset
                          ? 'bg-amber-100 border-amber-400 text-amber-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1.5 font-bold">Incident Details / Custom Message</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide detailed description of the incident, injuries, or assistance needed..."
                    value={incidentReportMessage}
                    onChange={(e) => {
                      setIncidentReportMessage(e.target.value);
                      if (reportSuccess) setReportSuccess(false);
                    }}
                    className="w-full p-3 bg-white text-slate-800 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs font-mono transition-all"
                  />
                </div>

                {reportSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-800 flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>REPORT SUBMITTED: Coordinates attached and broadcasted to Ranger Dispatch.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={reportLoading}
                  className={`w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 hover:animate-haptic-vibrate active:animate-haptic-vibrate ${
                    reportLoading ? 'animate-haptic-vibrate' : ''
                  }`}
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

          {/* ACTIVE SAFETY ADVISORIES & HUB NEWS */}
          {safetyNews.length > 0 && (
            <div className="lg:col-span-12 space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-150 mt-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h2 className="text-xs font-mono font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-duration-1000"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Active Safety Advisories & Alert News
                </h2>
                <span className="text-[9px] font-mono font-black bg-emerald-500/10 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                  Safety Hub Live
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {safetyNews.map(news => {
                  let severityColor = "border-sky-250 bg-sky-50 text-sky-900";
                  let badgeColor = "bg-sky-500 text-white border-sky-600";
                  if (news.severity === "critical") {
                    severityColor = "border-rose-250 bg-rose-50 text-rose-900";
                    badgeColor = "bg-rose-500 text-white border-rose-600";
                  } else if (news.severity === "warning") {
                    severityColor = "border-amber-250 bg-amber-50 text-amber-900";
                    badgeColor = "bg-amber-500 text-stone-950 border-amber-600";
                  }
                  
                  return (
                    <div 
                      key={news.id} 
                      className={`p-4 rounded-xl border ${severityColor} relative overflow-hidden flex flex-col justify-between font-sans shadow-sm transition-all hover:shadow-md hover:scale-[1.01]`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-1.5">
                          <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                            {news.severity}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 font-bold">
                            {new Date(news.timestamp).toLocaleDateString()} {new Date(news.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 tracking-tight leading-snug">{news.title}</h4>
                        <p className="text-xs text-slate-700 leading-relaxed font-semibold">{news.message}</p>
                      </div>
                      <div className="mt-3.5 pt-2 border-t border-black/5 flex items-center justify-between text-[9px] font-mono font-bold text-slate-500">
                        <span>CATEGORY: <span className="text-slate-850 font-black">{news.category}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          </motion.div>

        </motion.div>
      )}      {/* Zoomed QR Code Modal */}
      <AnimatePresence>
        {isQrZoomed && currentTourist && (
          (() => {
            const blockchainPayload = JSON.stringify({
              version: "1.0.0",
              id: currentTourist.id,
              name: currentTourist.name,
              phone: currentTourist.phone,
              blockIndex: currentTourist.blockchainBlockIndex || 9999,
              blockHash: currentTourist.blockHash || "0x_OFFLINE_LOCAL_BLOCK_PENDING_MERKLE_SYNC",
              timestamp: new Date(currentTourist.registrationTimestamp || Date.now()).toISOString(),
              issuer: "SafeTour Autonomous Blockchain Ledger (SABL)",
              signature: `0x_SIG_${currentTourist.id.substring(2)}_${(currentTourist.blockHash || "0x").substring(0, 12)}`
            }, null, 2);

            const handleCopyProof = () => {
              navigator.clipboard.writeText(blockchainPayload);
              setCopiedProof(true);
              setTimeout(() => setCopiedProof(false), 2000);
            };

            return (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl max-w-md w-full relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)] text-white"
                >
                  {/* Holographic scanner laser line effect */}
                  <div className="absolute inset-x-0 h-1 bg-emerald-500/20 top-1/2 animate-bounce pointer-events-none" />

                  <button 
                    onClick={() => setIsQrZoomed(false)}
                    className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold font-mono text-sm cursor-pointer z-10 p-1 bg-slate-800 rounded-full"
                  >
                    ✕
                  </button>

                  <div className="mb-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-mono uppercase tracking-widest font-black mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      SECURED BLOCKCHAIN IDENTITY
                    </div>
                    <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider">BLOCKCHAIN DIGITAL ID</h3>
                    <p className="text-[10px] text-slate-400 font-mono font-semibold">CRYPTOGRAPHICALLY SIGNED PROOF OF EXISTENCE</p>
                  </div>

                  {/* Tab buttons */}
                  <div className="flex border-b border-slate-800 mb-5 text-xs font-mono">
                    <button
                      onClick={() => setDigitalIdTab('card')}
                      className={`flex-1 pb-2 font-black transition-colors border-b-2 ${
                        digitalIdTab === 'card' 
                          ? 'border-emerald-500 text-emerald-400' 
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      PASSPORT CREDENTIAL
                    </button>
                    <button
                      onClick={() => setDigitalIdTab('json')}
                      className={`flex-1 pb-2 font-black transition-colors border-b-2 ${
                        digitalIdTab === 'json' 
                          ? 'border-emerald-500 text-emerald-400' 
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      RAW SIGNED JSON
                    </button>
                  </div>

                  {digitalIdTab === 'card' ? (
                    <div className="space-y-4">
                      <div className="bg-white p-3 rounded-2xl border border-emerald-500/20 flex justify-center shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=052e16&bgcolor=ffffff&data=${encodeURIComponent(blockchainPayload)}`} 
                          alt="Zoomed Digital ID QR Code" 
                          className="w-44 h-44 rounded bg-white" 
                        />
                      </div>

                      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-[10px] text-slate-300">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                          <span className="text-slate-500 font-bold">NAME:</span>
                          <span className="text-white font-extrabold">{currentTourist.name.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                          <span className="text-slate-500 font-bold">BLOCK ID:</span>
                          <span className="text-emerald-400 font-extrabold select-all">{currentTourist.id}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                          <span className="text-slate-500 font-bold">LEDGER INDEX:</span>
                          <span className="text-white font-extrabold">#{currentTourist.blockchainBlockIndex || 9999}</span>
                        </div>
                        <div className="flex justify-between items-start gap-2 border-b border-slate-800 pb-1.5">
                          <span className="text-slate-500 font-bold shrink-0">BLOCK HASH:</span>
                          <span className="text-slate-400 font-bold text-right break-all text-[9px] select-all">
                            {currentTourist.blockHash || "0x_OFFLINE_LOCAL_BLOCK_PENDING_MERKLE_SYNC"}
                          </span>
                        </div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-500 font-bold shrink-0">SIGNATURE:</span>
                          <span className="text-emerald-400 font-extrabold text-right break-all text-[9px] select-all">
                            {`0x_SIG_${currentTourist.id.substring(2)}_${(currentTourist.blockHash || "0x").substring(0, 12)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 h-64 overflow-y-auto font-mono text-[9px] text-emerald-400 select-all leading-normal whitespace-pre-wrap scrollbar-thin">
                        {blockchainPayload}
                      </div>
                      <button
                        onClick={handleCopyProof}
                        className="w-full py-2 bg-slate-850 hover:bg-slate-750 text-white border border-slate-700 rounded-xl font-mono text-[10px] uppercase font-black tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        {copiedProof ? 'COPIED SECURE PROOF! ✓' : 'COPY RAW LEDGER PROOF'}
                      </button>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                    <p className="text-[9px] text-slate-500 font-mono">
                      VERIFIED SECURE BY AUTONOMOUS CONSENSUS SHA-256 SECURED BY SHILLONG OPERATIONAL BACKPLANE
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>

      {/* GLOBAL DISPATCH EMERGENCY OVERLAY MODAL */}
      {currentTourist && pendingAlerts.length > 0 && (
        (() => {
          const activeAlert = pendingAlerts[0];
          return (
            <div className="fixed inset-0 bg-red-900/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 font-mono">
              <div className="bg-white border-4 border-red-500 p-8 rounded-3xl max-w-lg w-full relative overflow-hidden shadow-2xl animate-scaleUp">
                
                {/* Hazard stripes at the top */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,#ffffff_10px,#ffffff_20px)]" />

                {/* Sound waves or alert pulse effects */}
                <div className="flex flex-col items-center text-center space-y-6 mt-4">
                  <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-500 flex items-center justify-center animate-bounce">
                    <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-red-600 font-bold text-xs uppercase tracking-[0.25em] block animate-pulse">
                      ⚠️ CRITICAL SYSTEM BROADCAST ⚠️
                    </span>
                    <h2 className="text-xl font-black text-red-800 uppercase tracking-tight">
                      EMERGENCY ALERT FROM CENTRAL PATROL
                    </h2>
                  </div>

                  {/* The actual broadcast message */}
                  <div className="p-5 bg-red-50 border border-red-200 rounded-2xl w-full text-left text-xs space-y-3">
                    <div className="text-red-700 font-bold uppercase text-[10px] tracking-wider flex justify-between">
                      <span>ALERT MSG // INCOMING</span>
                      <span>{new Date(activeAlert.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-800 text-sm font-bold leading-relaxed whitespace-pre-line border-t border-red-100 pt-3">
                      {activeAlert.message}
                    </div>
                  </div>

                  {/* Guidelines reminder based on broadcast info */}
                  <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm font-bold">
                    This broadcast is registered in the system. Please read carefully and take appropriate safety actions immediately.
                  </p>

                  <button
                    onClick={() => handleDismissAlert(activeAlert.id)}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.02] flex items-center justify-center gap-2"
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
