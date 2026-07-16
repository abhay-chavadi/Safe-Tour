const fs = require('fs');
let content = fs.readFileSync('src/components/MapplsMap.tsx', 'utf8');
content = content.replace(
  'return (\n    <div id={mapContainerId} style={{ width: "100%", height: "100%", display: "inline-block" }}>\n      {!isMapLoaded && (\n        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-emerald-400 font-mono text-sm border-white/10 border relative overflow-hidden">\n           <div className="flex flex-col items-center gap-3 relative z-10">\n              <span className="w-8 h-8 rounded-full border-t-2 border-emerald-500 animate-spin" />\n              <span>INITIALIZING MAPPLS SATELLITE LINK...</span>\n           </div>\n        </div>\n      )}\n    </div>\n  );',
  `return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div id={mapContainerId} style={{ width: "100%", height: "100%", display: "inline-block" }} />
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-emerald-400 font-mono text-sm border-white/10 border overflow-hidden z-50">
           <div className="flex flex-col items-center gap-3 relative z-10">
              <span className="w-8 h-8 rounded-full border-t-2 border-emerald-500 animate-spin" />
              <span>INITIALIZING MAPPLS SATELLITE LINK...</span>
           </div>
        </div>
      )}
    </div>
  );`
);
fs.writeFileSync('src/components/MapplsMap.tsx', content, 'utf8');
