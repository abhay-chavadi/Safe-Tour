import React from 'react';

export default function MapPlaceholder() {
  return (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="text-slate-500 font-mono text-sm tracking-widest uppercase">Map Module Disconnected</div>
        <div className="text-slate-600 font-mono text-xs">Coordinates Tracked Successfully</div>
      </div>
    </div>
  );
}
