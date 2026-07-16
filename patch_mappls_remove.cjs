const fs = require('fs');
let code = fs.readFileSync('src/components/MapplsMap.tsx', 'utf-8');

code = code.replace(/try \{ mapRef\.current\.remove\(\); \} catch \(e\) \{\}/, `// try { mapRef.current.remove(); } catch (e) {}\n        const el = document.getElementById(containerId);\n        if (el) el.innerHTML = '';`);

fs.writeFileSync('src/components/MapplsMap.tsx', code);
