const fs = require('fs');

function patchFile(filename) {
  let content = fs.readFileSync(filename, 'utf8');

  // Remove import { APIProvider...
  content = content.replace(/import \{.*?APIProvider.*?\} from '@vis\.gl\/react-google-maps';/g, '');
  content = content.replace(/import \{ APIProvider, Map, Marker, Pin, useMap, useMapsLibrary \} from '@vis\.gl\/react-google-maps';/g, '');
  content = content.replace(/import MapPlaceholder from '.\/MapPlaceholder';/g, '');
  content = `import MapPlaceholder from './MapPlaceholder';\n` + content;
  
  // Replace <Map ...> ... </Map> with <MapPlaceholder />
  content = content.replace(/<Map[\s\S]*?<\/Map>/g, '<MapPlaceholder />');
  
  // Remove MapCircle function
  content = content.replace(/function MapCircle\(\{[\s\S]*?return null;\n\}/g, '');
  
  // Remove PlaceAutocomplete function if exists
  content = content.replace(/function PlaceAutocomplete\(\{[\s\S]*?return \(\s*<input[\s\S]*?<\/input>\s*\);\n\}/g, '');
  
  // Remove type MapCircle ...
  content = content.replace(/type MapCircle[\s\S]*?;/g, '');
  
  fs.writeFileSync(filename, content, 'utf8');
  console.log(`Patched ${filename}`);
}

patchFile('src/components/TouristView.tsx');
patchFile('src/components/AdminView.tsx');
