const fs = require('fs');
let code = fs.readFileSync('src/components/TouristView.tsx', 'utf-8');

// 1. Add state for suggested places
if (!code.includes('suggestedPlaces')) {
  code = code.replace(/const \[currentTourist, setCurrentTourist\] = useState<Tourist \| null>\(null\);/, `const [currentTourist, setCurrentTourist] = useState<Tourist | null>(null);\n  const [suggestedPlaces, setSuggestedPlaces] = useState<{title: string, uri: string, lat?: number, lng?: number}[]>([]);`);
}

// 2. Pass to MapplsMap
code = code.replace(/<MapplsMap center=\{coords\} zoom=\{13\} geoFences=\{geoFences\} tourists=\{currentTourist \? \[currentTourist\] : \[\]\} \/>/, `<MapplsMap center={coords} zoom={13} geoFences={geoFences} tourists={currentTourist ? [currentTourist] : []} suggestedPlaces={suggestedPlaces} />`);

// 3. Pass callback to TouristChatbot
code = code.replace(/<TouristChatbot \/>/, `<TouristChatbot onPlacesSuggested={(places) => setSuggestedPlaces(places)} />`);

fs.writeFileSync('src/components/TouristView.tsx', code);
