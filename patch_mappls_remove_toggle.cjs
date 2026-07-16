const fs = require('fs');
let code = fs.readFileSync('src/components/MapplsMap.tsx', 'utf-8');

// 1. Remove mapType state
code = code.replace(/const \[mapType, setMapType\] = useState<"standard" \| "hybrid">\("hybrid"\);\n/, '');

// 2. Change map_type back to "hybrid"
code = code.replace(/map_type: mapType/, 'map_type: "hybrid"');

// 3. Remove Map Type Change useEffect
code = code.replace(/\/\/ Handle Map Type Change\n  useEffect\(\(\) => \{\n    if \(isMapLoaded && mapRef\.current\) \{\n      try \{\n        if \(typeof mapRef\.current\.setMapType === 'function'\) \{\n          mapRef\.current\.setMapType\(mapType\);\n        \} else if \(typeof mapRef\.current\.setMapTypeId === 'function'\) \{\n          mapRef\.current\.setMapTypeId\(mapType\);\n        \}\n      \} catch \(e\) \{\}\n    \}\n  \}, \[mapType, isMapLoaded\]\);\n/, '');

// 4. Remove UI toggle
code = code.replace(/      \{\/\* Map Type Toggle \*\/\}[\s\S]*?<\/div>\n/, '');

// 5. Remove Layers from lucide-react if unused elsewhere
// (It might be used in other places? Actually let's just leave the import or replace it back to MapPin)
code = code.replace(/import \{ MapPin, Layers \} from 'lucide-react';/, `import { MapPin } from 'lucide-react';`);

fs.writeFileSync('src/components/MapplsMap.tsx', code);
