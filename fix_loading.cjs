const fs = require('fs');
let content = fs.readFileSync('src/components/MapplsMap.tsx', 'utf8');

content = content.replace(
  '          newMap.on("load", () => {',
  '          setIsMapLoaded(true);\n          newMap.on("load", () => {'
);

fs.writeFileSync('src/components/MapplsMap.tsx', content, 'utf8');
