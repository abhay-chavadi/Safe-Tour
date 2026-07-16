const fs = require('fs');
let content = fs.readFileSync('src/components/MapplsMap.tsx', 'utf8');

// Add global flag
content = content.replace(
  'const mapplsClassObject = new mappls();',
  'const mapplsClassObject = new mappls();\nlet isMapplsInitializing = false;\nlet isMapplsInitialized = false;'
);

// Update useEffect
content = content.replace(
  '  useEffect(() => {\n    const loadObject = {',
  `  useEffect(() => {
    if (isMapplsInitialized) {
      initMap();
      return;
    }
    if (isMapplsInitializing) {
      const checkInterval = setInterval(() => {
        if (isMapplsInitialized) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
    
    isMapplsInitializing = true;
    const loadObject = {`
);

content = content.replace(
  '    mapplsClassObject.initialize("hklmgbwzrxncdyavtsuojqpiefrbhqplnm", loadObject, () => {\n      try {',
  `    mapplsClassObject.initialize("hklmgbwzrxncdyavtsuojqpiefrbhqplnm", loadObject, () => {
      isMapplsInitialized = true;
      isMapplsInitializing = false;
      initMap();
    });

    function initMap() {
      if (!document.getElementById(mapContainerId)) return;
      try {`
);

content = content.replace(
  '        console.error("Map initialization failed", e);\n      }\n    });\n\n    return () => {',
  '        console.error("Map initialization failed", e);\n      }\n    }\n\n    return () => {'
);

fs.writeFileSync('src/components/MapplsMap.tsx', content, 'utf8');
