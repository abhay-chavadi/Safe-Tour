const fs = require('fs');
let code = fs.readFileSync('src/components/MapplsMap.tsx', 'utf-8');

// Replace .remove() with .remove() or setMap(null)
code = code.replace(/try \{ m\.remove\(\); \} catch \(e\) \{\}/g, `try { if(typeof m.remove === 'function') m.remove(); else if(typeof m.setMap === 'function') m.setMap(null); } catch (e) {}`);
code = code.replace(/try \{ c\.remove\(\); \} catch \(e\) \{\}/g, `try { if(typeof c.remove === 'function') c.remove(); else if(typeof c.setMap === 'function') c.setMap(null); } catch (e) {}`);

fs.writeFileSync('src/components/MapplsMap.tsx', code);
