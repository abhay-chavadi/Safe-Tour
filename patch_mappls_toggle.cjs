const fs = require('fs');
let code = fs.readFileSync('src/components/MapplsMap.tsx', 'utf-8');

// 1. Add lucide import for Layers
if (!code.includes('import { MapPin, Layers }')) {
  code = code.replace(/import { MapPin } from 'lucide-react';/, `import { MapPin, Layers } from 'lucide-react';`);
}

// 2. Add mapType state
if (!code.includes('const [mapType')) {
  code = code.replace(/const \[isMapLoaded, setIsMapLoaded\] = useState\(false\);/, `const [isMapLoaded, setIsMapLoaded] = useState(false);\n  const [mapType, setMapType] = useState<"standard" | "hybrid">("hybrid");`);
}

// 3. Add effect to change mapType
if (!code.includes('mapRef.current.setMapType')) {
  code = code.replace(/\/\/ Handle center \/ zoom changes/, `// Handle Map Type Change\n  useEffect(() => {\n    if (isMapLoaded && mapRef.current) {\n      try {\n        if (typeof mapRef.current.setMapType === 'function') {\n          mapRef.current.setMapType(mapType);\n        } else if (typeof mapRef.current.setMapTypeId === 'function') {\n          mapRef.current.setMapTypeId(mapType);\n        }\n      } catch (e) {}\n    }\n  }, [mapType, isMapLoaded]);\n\n  // Handle center / zoom changes`);
}

// 4. Update map_type initialization
code = code.replace(/map_type: "hybrid"/, `map_type: mapType`);

// 5. Add UI toggle
const toggleUI = `
      {/* Map Type Toggle */}
      <div className="absolute top-4 right-4 z-[60] pointer-events-auto">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMapType(prev => prev === 'hybrid' ? 'standard' : 'hybrid'); }}
          className="bg-slate-900/80 backdrop-blur-md border border-white/20 p-2.5 rounded-xl shadow-2xl text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/80 transition-all flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider"
        >
          <Layers className="w-4 h-4" />
          {mapType === 'hybrid' ? 'SATELLITE VIEW' : 'STANDARD VIEW'}
        </button>
      </div>
`;

code = code.replace(/\{errorText && \(/, `${toggleUI}\n      {errorText && (`);

fs.writeFileSync('src/components/MapplsMap.tsx', code);
