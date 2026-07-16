import React, { useState, useEffect } from 'react';
import { Battery, BatteryCharging, AlertTriangle, Zap } from 'lucide-react';

export default function BatteryIndicator() {
  const [level, setLevel] = useState<number>(0.92); // Default to 92%
  const [charging, setCharging] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  useEffect(() => {
    let batteryInstance: any = null;

    const updateBattery = (battery: any) => {
      setLevel(battery.level);
      setCharging(battery.charging);
      setIsSimulated(false);
    };

    const handleLevelChange = () => {
      if (batteryInstance) {
        setLevel(batteryInstance.level);
      }
    };

    const handleChargingChange = () => {
      if (batteryInstance) {
        setCharging(batteryInstance.charging);
      }
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery()
        .then((battery: any) => {
          batteryInstance = battery;
          updateBattery(battery);

          battery.addEventListener('levelchange', handleLevelChange);
          battery.addEventListener('chargingchange', handleChargingChange);
        })
        .catch((err: any) => {
          console.warn('Battery API not allowed in sandbox/iframe, engaging simulated battery telemetry:', err);
          engageSimulation();
        });
    } else {
      engageSimulation();
    }

    function engageSimulation() {
      setIsSimulated(true);
      // Retrieve previous simulation state or set high defaults
      const savedLevel = localStorage.getItem('safetour_sim_battery_level');
      const savedCharging = localStorage.getItem('safetour_sim_battery_charging');
      
      if (savedLevel !== null) {
        setLevel(parseFloat(savedLevel));
      } else {
        setLevel(0.87); // Default mock battery
      }

      if (savedCharging !== null) {
        setCharging(savedCharging === 'true');
      } else {
        setCharging(false);
      }
    }

    return () => {
      if (batteryInstance) {
        batteryInstance.removeEventListener('levelchange', handleLevelChange);
        batteryInstance.removeEventListener('chargingchange', handleChargingChange);
      }
    };
  }, []);

  // Update localStorage when simulation levels change
  useEffect(() => {
    if (isSimulated) {
      localStorage.setItem('safetour_sim_battery_level', level.toString());
      localStorage.setItem('safetour_sim_battery_charging', charging.toString());
    }
  }, [level, charging, isSimulated]);

  // Handle ticking down simulated battery or charging it
  useEffect(() => {
    if (!isSimulated) return;

    const interval = setInterval(() => {
      setLevel((prev) => {
        if (charging) {
          const next = Math.min(prev + 0.01, 1.0);
          return Math.round(next * 100) / 100;
        } else {
          // Slowly discharge
          const next = Math.max(prev - 0.005, 0.05);
          return Math.round(next * 1000) / 1000;
        }
      });
    }, 15000); // Ticks every 15 seconds for simulation speed

    return () => clearInterval(interval);
  }, [charging, isSimulated]);

  // Click handler to toggle charging state for simulation purposes
  const toggleSimulationCharging = () => {
    if (isSimulated) {
      setCharging(prev => !prev);
    } else {
      // Force simulation override if user wants to play with it
      setIsSimulated(true);
      setCharging(prev => !prev);
    }
  };

  const pct = Math.round(level * 100);
  
  // Choose battery visual states
  let colorClass = "text-emerald-600 bg-emerald-500/15 border-emerald-500/20";
  let barColor = "bg-emerald-500";
  let pulseClass = "";

  if (pct <= 20) {
    colorClass = "text-rose-600 bg-rose-500/15 border-rose-500/25 animate-pulse";
    barColor = "bg-rose-500";
    pulseClass = "animate-ping";
  } else if (pct <= 45) {
    colorClass = "text-amber-600 bg-amber-500/15 border-amber-500/20";
    barColor = "bg-amber-500";
  }

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold transition-all ${colorClass}`}
      title={isSimulated ? "Simulated Telemetry - Click battery to toggle charger" : "Real-time Device Battery Telemetry"}
    >
      <button 
        type="button"
        onClick={toggleSimulationCharging} 
        className="flex items-center gap-1.5 focus:outline-none hover:opacity-85 select-none"
      >
        <div className="relative flex items-center justify-center">
          {charging ? (
            <BatteryCharging className="w-4 h-4" />
          ) : (
            <Battery className="w-4 h-4" />
          )}
          {pct <= 20 && !charging && (
            <span className={`absolute -top-1 -right-1 flex h-2 w-2`}>
              <span className={`absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 ${pulseClass}`}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </div>
        
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-black">{pct}%</span>
          <span className="text-[7px] text-slate-500 tracking-tighter uppercase font-medium">
            {charging ? "Charging" : isSimulated ? "Simulated" : "Live"}
          </span>
        </div>
      </button>

      {/* Mini graphical battery cell */}
      <div className="w-6 h-3 border border-current rounded-xs p-0.5 flex items-center gap-[1px] relative">
        <div className="h-full rounded-2xs transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: pct <= 20 ? '#ef4444' : pct <= 45 ? '#f59e0b' : '#10b981' }} />
        <div className="w-[1.5px] h-1.5 bg-current rounded-r-xs absolute -right-[2.5px] top-[2px]" />
      </div>

      {/* Visual lightning indicator if charging */}
      {charging && <Zap className="w-3 h-3 text-amber-500 fill-amber-400 animate-pulse" />}
    </div>
  );
}
