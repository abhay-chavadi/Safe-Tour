const fs = require('fs');
let content = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

// Remove useMap
content = content.replace(/  const map = useMap\(\);\n/, '');

// Remove PlaceAutocomplete
content = content.replace(/function PlaceAutocomplete[\s\S]*?return \(\s*<input[\s\S]*?<\/input>\s*\);\n\}/, '');

fs.writeFileSync('src/components/AdminView.tsx', content, 'utf8');
