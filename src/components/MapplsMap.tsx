import React, { useEffect, useRef, useState, useMemo } from "react";
import { MapPin, Navigation } from 'lucide-react';
import { Tourist, GeoFence } from "../types";

interface MapplsMapProps {
  id?: string;
  center: { lat: number; lng: number };
  zoom?: number;
  tourists?: Tourist[];
  suggestedPlaces?: {title: string, uri: string}[];
  geoFences?: GeoFence[];
  isSimulatingPath?: boolean;
  simulationIndex?: number;
  isAutoPilotWalking?: boolean;
}

export default function MapplsMap({ 
  id = "map", 
  center, 
  zoom = 13, 
  tourists = [], 
  geoFences = [], 
  suggestedPlaces = [],
  isSimulatingPath = false,
  simulationIndex = 0,
  isAutoPilotWalking = false
}: MapplsMapProps) {
  const mapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const leafletMarkersRef = useRef<any[]>([]);
  const leafletCirclesRef = useRef<any[]>([]);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapProvider, setMapProvider] = useState<'mappls' | 'leaflet' | null>(null);
  const [errorText, setErrorText] = useState("");
  const [isTracking, setIsTracking] = useState(true);
  
  const containerId = useMemo(() => `mappls-map-${Math.random().toString(36).substring(2, 9)}`, []);

  useEffect(() => {
    let isMounted = true;
    const token = (import.meta as any).env.VITE_MAPPLS_TOKEN || "ylsajcxkwlytugyzbtpvwwrhlezzteaukczs";
    
    // Safety timeout to trigger Leaflet fallback if Mappls script or init fails/stalls
    const fallbackTimeout = setTimeout(() => {
      if (isMounted && !mapRef.current) {
        console.log("Mappls load stalled or failed. Launching ultra-reliable Leaflet Map fallback.");
        initLeafletMap();
      }
    }, 2500);

    const initLeafletMap = () => {
      if (!isMounted) return;
      
      const setupLeaflet = () => {
        const L = (window as any).L;
        if (!L) return;
        try {
          const mapEl = document.getElementById(containerId);
          if (mapEl) {
            mapEl.innerHTML = ''; // Clean up any failed map containers
          }
          const map = L.map(containerId, {
            zoomControl: true,
            attributionControl: false
          }).setView([center.lat, center.lng], zoom);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);

          leafletMapRef.current = map;

          // Detect user manual interaction to temporarily pause camera tracking
          map.on('dragstart', () => setIsTracking(false));

          setMapProvider('leaflet');
          setErrorText(""); // Clear error text since Leaflet loaded successfully
          setIsMapLoaded(true);

          // Force single layout invalidation once on initialization to prevent gray tiles
          setTimeout(() => {
            if (map) {
              map.invalidateSize();
            }
          }, 300);
        } catch (err) {
          console.error("Leaflet setup error:", err);
        }
      };

      if ((window as any).L) {
        setupLeaflet();
      } else {
        // Inject Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Inject Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          setupLeaflet();
        };
        document.head.appendChild(script);
      }
    };

    const initMap = () => {
       try {
           const mappls = (window as any).mappls;
           if (!mappls) {
               setErrorText("Mappls object not found on window");
               initLeafletMap();
               return;
           }

           const newMap = new mappls.Map(containerId, {
               center: [center.lat, center.lng],
               zoom: zoom,
               zoomControl: true,
               layerControl: true,
               map_type: "hybrid",
               geolocation: false
           });
           
           if (newMap) {
               mapRef.current = newMap;

               // Detect user manual interaction to temporarily pause camera tracking
               if (typeof newMap.on === 'function') {
                   newMap.on('dragstart', () => setIsTracking(false));
               } else if (typeof newMap.addListener === 'function') {
                   newMap.addListener('dragstart', () => setIsTracking(false));
               }
               const handleLoaded = () => {
                   clearTimeout(fallbackTimeout);
                   if (isMounted) {
                       setMapProvider('mappls');
                       setIsMapLoaded(true);
                       setErrorText("");
                   }
               };
               if (typeof newMap.addListener === 'function') {
                   newMap.addListener('load', handleLoaded);
               } else if (typeof newMap.on === 'function') {
                   newMap.on('load', handleLoaded);
               }
               setTimeout(() => {
                   clearTimeout(fallbackTimeout);
                   if (isMounted && !isMapLoaded) {
                       setMapProvider('mappls');
                       setIsMapLoaded(true);
                       setErrorText("");
                   }
               }, 1200);
           }
       } catch (err: any) {
           console.error("Error creating map:", err);
           if (isMounted) {
               initLeafletMap();
           }
       }
    };

    // Initialize if script is already present and loaded
    if ((window as any).mappls) {
        initMap();
    } else {
        const scriptId = 'mappls-sdk-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        // Ensure global callback exists
        (window as any).initMapplsMap = () => {
            console.log("Global Mappls callback fired");
            if (isMounted) initMap();
        };

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${token}&callback=initMapplsMap`;
            script.defer = true;
            script.async = true;
            script.onerror = () => {
                if (isMounted) {
                    initLeafletMap();
                }
            };
            document.head.appendChild(script);
        } else {
            const oldCallback = (window as any).initMapplsMap;
            (window as any).initMapplsMap = () => {
                if (oldCallback) oldCallback();
                if (isMounted) initMap();
            };
        }
    }

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
    };
  }, [containerId]); 

  // Auto-resume camera tracking when the simulation restarts or a new route waypoint is selected
  useEffect(() => {
    if (isSimulatingPath || isAutoPilotWalking) {
      setIsTracking(true);
    }
  }, [simulationIndex, isAutoPilotWalking, isSimulatingPath]);

  // Handle center / zoom changes
  useEffect(() => {
    if (isMapLoaded) {
      if (mapProvider === 'mappls' && mapRef.current) {
        try {
          if (!isSimulatingPath) {
            // Normal centering immediately when not actively simulating
            if (typeof mapRef.current.setCenter === 'function') {
              mapRef.current.setCenter({ lat: center.lat, lng: center.lng });
            }
          } else if (isTracking || isSimulatingPath || isAutoPilotWalking) {
            // Simulated active tracking with smooth panning (always active during walking/autopilot)
            if (typeof mapRef.current.panTo === 'function') {
              mapRef.current.panTo({ lat: center.lat, lng: center.lng });
            } else if (typeof mapRef.current.setCenter === 'function') {
              mapRef.current.setCenter({ lat: center.lat, lng: center.lng });
            }
          }
          if (typeof mapRef.current.setZoom === 'function' && zoom) {
            mapRef.current.setZoom(zoom);
          }
        } catch (e) {}
      } else if (mapProvider === 'leaflet' && leafletMapRef.current) {
        try {
          if (!isSimulatingPath) {
            // Normal centering immediately when not actively simulating
            leafletMapRef.current.setView([center.lat, center.lng], zoom, { animate: false });
          } else if (isTracking || isSimulatingPath || isAutoPilotWalking) {
            // Simulated active tracking with smooth panning (always active during walking/autopilot)
            leafletMapRef.current.panTo([center.lat, center.lng], { animate: true, duration: 0.3 });
            if (leafletMapRef.current.getZoom() !== zoom) {
              leafletMapRef.current.setZoom(zoom);
            }
          }
        } catch (e) {}
      }
    }
  }, [center.lat, center.lng, zoom, isMapLoaded, mapProvider, isTracking, isSimulatingPath, isAutoPilotWalking]);

  // Handle markers and fences for both providers
  useEffect(() => {
    if (!isMapLoaded) return;

    if (mapProvider === 'mappls' && mapRef.current) {
      const mappls = (window as any).mappls;
      if (!mappls) return;

      markersRef.current.forEach(m => {
         try { if(typeof m.remove === 'function') m.remove(); else if(typeof m.setMap === 'function') m.setMap(null); } catch (e) {}
      });
      markersRef.current = [];

      circlesRef.current.forEach(c => {
         try { if(typeof c.remove === 'function') c.remove(); else if(typeof c.setMap === 'function') c.setMap(null); } catch (e) {}
      });
      circlesRef.current = [];

      geoFences.forEach(fence => {
        try {
          if (mappls.Circle) {
             const circle = new mappls.Circle({
               map: mapRef.current,
               center: { lat: fence.lat, lng: fence.lng },
               radius: fence.radius,
               fillColor: fence.type === 'safe' ? '#10B981' : '#EF4444',
               fillOpacity: 0.02,
               strokeColor: fence.type === 'safe' ? '#10B981' : '#EF4444',
               strokeWeight: 1.0,
               strokeOpacity: 0.4,
             });
             if (circle) circlesRef.current.push(circle);
          }
        } catch (e) {}
      });

      tourists.forEach(tourist => {
        try {
          if (mappls.Marker) {
             const marker = new mappls.Marker({
               map: mapRef.current,
               position: { lat: tourist.lat, lng: tourist.lng },
               popupHtml: `<div style="font-family: sans-serif; padding: 6px; width: 130px; text-align: center; color: #1e293b;">
                 <img src="${tourist.facePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin: 0 auto 4px; border: 2px solid ${tourist.sosActive ? '#ef4444' : '#10b981'};" />
                 <div style="font-weight: 800; font-size: 11px; margin-bottom: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tourist.name}</div>
                 <div style="font-size: 9px; color: #64748b;">${tourist.phone}</div>
                 ${tourist.sosActive ? '<div style="color: #ef4444; font-size: 9px; font-weight: bold; margin-top: 2px;">🚨 SOS DISTRESS</div>' : ''}
               </div>`,
             });
             if (marker) markersRef.current.push(marker);
          }
        } catch (e) {}
      });
    } else if (mapProvider === 'leaflet' && leafletMapRef.current) {
      const L = (window as any).L;
      if (!L) return;

      // Remove old leaflet markers and circles
      leafletMarkersRef.current.forEach(m => m.remove());
      leafletMarkersRef.current = [];

      leafletCirclesRef.current.forEach(c => c.remove());
      leafletCirclesRef.current = [];

      // Add Leaflet geofences
      geoFences.forEach(fence => {
        try {
          const circle = L.circle([fence.lat, fence.lng], {
            color: fence.type === 'safe' ? '#10B981' : '#EF4444',
            fillColor: fence.type === 'safe' ? '#10B981' : '#EF4444',
            fillOpacity: 0.15,
            radius: fence.radius
          }).addTo(leafletMapRef.current);
          leafletCirclesRef.current.push(circle);
        } catch (e) {}
      });

      // Add Leaflet tourists
      tourists.forEach(tourist => {
        try {
          const lat = Number(tourist.lat);
          const lng = Number(tourist.lng);
          if (isNaN(lat) || isNaN(lng)) return;

          const avatarUrl = tourist.facePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150';
          const markerIcon = L.divIcon({
            className: 'custom-leaflet-marker',
            html: `<div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
              <img src="${avatarUrl}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2.5px solid ${tourist.sosActive ? '#ef4444' : '#10b981'}; box-shadow: 0 2px 6px rgba(0,0,0,0.35);" />
              ${tourist.sosActive ? '<span class="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full animate-ping border border-white" style="animation-duration: 1000ms;" />' : ''}
              ${tourist.sosActive ? '<span class="absolute top-0 right-0 w-3.5 h-3.5 bg-red-600 rounded-full border border-white" />' : ''}
            </div>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21]
          });

          const marker = L.marker([lat, lng], { icon: markerIcon })
            .addTo(leafletMapRef.current);

          marker.bindPopup(`
            <div style="font-family: sans-serif; text-align: center; color: #1e293b; min-width: 120px; padding: 4px;">
              <img src="${avatarUrl}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; margin: 0 auto 6px; border: 2.5px solid ${tourist.sosActive ? '#ef4444' : '#10b981'};" />
              <div style="font-weight: 800; font-size: 11px; margin-bottom: 1px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tourist.name}</div>
              <div style="font-size: 9px; color: #64748b; margin-bottom: 2px;">${tourist.phone}</div>
              ${tourist.sosActive ? '<div style="color: #ef4444; font-size: 8px; font-weight: 900; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; margin-top: 4px; animation: pulse 1s infinite;">🚨 DISTRESS EMERGENCY</div>' : ''}
            </div>
          `);
          leafletMarkersRef.current.push(marker);
        } catch (e) {}
      });
    }
  }, [tourists, geoFences, isMapLoaded, mapProvider]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div id={containerId} style={{ width: "100%", height: "100%", display: "block", position: "absolute", inset: 0 }} />

      {/* Floating Re-center on Tourist Button */}
      {!isTracking && (
        <button
          onClick={() => {
            setIsTracking(true);
            // Instantly force map view update to latest center coords
            if (mapProvider === 'mappls' && mapRef.current) {
              if (typeof mapRef.current.setCenter === 'function') {
                mapRef.current.setCenter({ lat: center.lat, lng: center.lng });
              }
            } else if (mapProvider === 'leaflet' && leafletMapRef.current) {
              leafletMapRef.current.setView([center.lat, center.lng], zoom, { animate: true });
            }
          }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-[11px] px-5 py-3 rounded-xl shadow-[0_8px_25px_rgba(16,185,129,0.4)] flex items-center gap-2 border border-emerald-500 hover:border-emerald-400 transition-all cursor-pointer animate-pulse uppercase tracking-wider"
        >
          <Navigation className="w-4 h-4 fill-white animate-[spin_3s_linear_infinite]" />
          Re-center on Tourist
        </button>
      )}

      {/* Suggestions Overlay */}
      {suggestedPlaces && suggestedPlaces.length > 0 && (
        <div className="absolute top-4 left-4 z-[60] w-64 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 overflow-hidden shadow-md pointer-events-auto text-slate-800">
          <div className="bg-emerald-50 px-3 py-2 border-b border-slate-100 font-mono text-[10px] text-emerald-700 font-bold uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-3 h-3 text-emerald-600" /> AI Suggested Locations
          </div>
          <div className="max-h-48 overflow-y-auto p-2 flex flex-col gap-1.5">
            {suggestedPlaces.map((p, i) => (
              <a key={i} href={p.uri} target="_blank" rel="noreferrer" className="block text-[11px] text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50/50 p-2 rounded transition-colors border border-slate-100">
                <div className="truncate font-semibold">{p.title}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Click to open on map</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {!isMapLoaded && (
        <div className="absolute inset-0 bg-[#f8fafc] flex items-center justify-center text-emerald-700 font-mono text-sm z-50 pointer-events-none">
           <div className="flex flex-col items-center gap-3 relative z-10 text-center">
              <span className="w-8 h-8 rounded-full border-t-2 border-emerald-600 animate-spin" />
              <span>INITIALIZING DIGITAL MAPPING LINK...</span>
           </div>
        </div>
      )}

      {/* Show beautiful active provider indicator in corner of map */}
      {isMapLoaded && (
        <div className="absolute top-4 right-4 z-20 px-2 py-1 rounded bg-slate-900/85 backdrop-blur text-[8px] font-mono text-white flex items-center gap-1.5 select-none pointer-events-none uppercase font-bold border border-white/10 shadow-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>MAP ENGINE: {mapProvider}</span>
        </div>
      )}
    </div>
  );
}
