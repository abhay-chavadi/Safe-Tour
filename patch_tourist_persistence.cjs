const fs = require('fs');
let code = fs.readFileSync('src/components/TouristView.tsx', 'utf-8');

// 1. Initializers
code = code.replace(
  /const \[currentTourist, setCurrentTourist\] = useState<Tourist \| null>\(null\);/,
  `const [currentTourist, setCurrentTourist] = useState<Tourist | null>(() => {
    try {
      const stored = localStorage.getItem('safetour_tourist');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });`
);

code = code.replace(
  /const \[geoFences, setGeoFences\] = useState<GeoFence\[\]>\(\[\]\);/,
  `const [geoFences, setGeoFences] = useState<GeoFence[]>(() => {
    try {
      const stored = localStorage.getItem('safetour_geofences');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });`
);

// 2. Fetch Fences
code = code.replace(
  /const fetchFences = async \(\) => \{[\s\S]*?setGeoFences\(data\);\n\s*\}\n\s*\} catch \(e\) \{/,
  `const fetchFences = async () => {
    try {
      const res = await fetch('/api/geofences');
      if (res.ok) {
        const data = await res.json();
        setGeoFences(data);
        localStorage.setItem('safetour_geofences', JSON.stringify(data));
      }
    } catch (e) {`
);

// 3. Save Tourist effect
code = code.replace(
  /const \[isOfflineMode, setIsOfflineMode\] = useState\(false\);/,
  `const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  useEffect(() => {
    if (currentTourist) {
      localStorage.setItem('safetour_tourist', JSON.stringify(currentTourist));
    } else {
      localStorage.removeItem('safetour_tourist');
    }
  }, [currentTourist]);`
);

fs.writeFileSync('src/components/TouristView.tsx', code);
