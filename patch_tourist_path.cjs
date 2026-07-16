const fs = require('fs');
let code = fs.readFileSync('src/components/TouristView.tsx', 'utf-8');

const newPath = `  const simulationPath = [
    { name: 'Police Bazaar Safe Base', lat: 25.5760, lng: 91.8825, note: 'Inside Ranger safe zone perimeter.' },
    { name: 'Shillong Peak Wilderness', lat: 25.5398, lng: 91.8617, note: 'Remote mountain wilderness region.' },
    { name: 'Cherrapunji (Sohra) Cliffs', lat: 25.2755, lng: 91.7346, note: 'Deep cliffs, high rainfall zone.' },
    { name: 'Dawki River Border', lat: 25.1837, lng: 92.0163, note: 'International border crossing.' },
    { name: 'Krang Suri Waterfalls', lat: 25.2891, lng: 92.1752, note: 'Forest waterfall reserve.' },
    { name: 'Umiam Lake Boating Area', lat: 25.6601, lng: 91.8953, note: 'WARNING: Inside deep water hazard zone.' },
    { name: 'Nongriat Root Bridges', lat: 25.2447, lng: 91.6811, note: 'Dense tropical forest.' },
    { name: 'Returning to Safe Haven', lat: 25.5760, lng: 91.8825, note: 'Safely arrived back at Ranger base.' },
  ];`;

code = code.replace(/const simulationPath = \[[\s\S]*?\];/, newPath);

fs.writeFileSync('src/components/TouristView.tsx', code);
