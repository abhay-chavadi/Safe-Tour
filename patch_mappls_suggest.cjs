const fs = require('fs');
let code = fs.readFileSync('src/components/MapplsMap.tsx', 'utf-8');

if (!code.includes('suggestedPlaces?: {title: string, uri: string}[]')) {
  code = code.replace(/tourists\?: Tourist\[\];/, `tourists?: Tourist[];\n  suggestedPlaces?: {title: string, uri: string}[];`);
}

code = code.replace(/export default function MapplsMap\(\{ id = "map", center, zoom = 13, tourists = \[\], geoFences = \[\] \}: MapplsMapProps\) \{/, `export default function MapplsMap({ id = "map", center, zoom = 13, tourists = [], geoFences = [], suggestedPlaces = [] }: MapplsMapProps) {`);

const overlayUI = `
      {/* Suggestions Overlay */}
      {suggestedPlaces && suggestedPlaces.length > 0 && (
        <div className="absolute top-4 left-4 z-[60] w-64 bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden shadow-2xl pointer-events-auto">
          <div className="bg-emerald-500/20 px-3 py-2 border-b border-white/10 font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-3 h-3" /> AI Suggested Locations
          </div>
          <div className="max-h-48 overflow-y-auto p-2 flex flex-col gap-1.5">
            {suggestedPlaces.map((p, i) => (
              <a key={i} href={p.uri} target="_blank" rel="noreferrer" className="block text-[11px] text-white hover:text-emerald-400 bg-white/5 hover:bg-white/10 p-2 rounded transition-colors border border-white/5">
                <div className="truncate font-semibold">{p.title}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Click to open on map</div>
              </a>
            ))}
          </div>
        </div>
      )}
`;

code = code.replace(/(<div id=\{containerId\} style=\{\{ width: "100%", height: "100%", display: "block", position: "absolute", inset: 0 \}\} \/>)/, `$1\n${overlayUI}`);

if (!code.includes('import { MapPin }')) {
  code = code.replace(/import React, \{ useEffect, useRef, useState, useMemo \} from "react";/, `import React, { useEffect, useRef, useState, useMemo } from "react";\nimport { MapPin } from 'lucide-react';`);
}

fs.writeFileSync('src/components/MapplsMap.tsx', code);
