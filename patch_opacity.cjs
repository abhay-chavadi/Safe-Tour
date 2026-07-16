const fs = require('fs');
let code = fs.readFileSync('src/components/MapplsMap.tsx', 'utf-8');
code = code.replace(/fillOpacity: 0.2,/, 'fillOpacity: 0.1,');
fs.writeFileSync('src/components/MapplsMap.tsx', code);
