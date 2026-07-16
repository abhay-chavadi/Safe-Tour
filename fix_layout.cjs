const fs = require('fs');
let content = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

// 1. Move Map above Weather Banner
const mapStart = content.indexOf('{/* EMERGENCY OPERATIONS CENTRAL MAP */}');
const mapEnd = content.indexOf('{/* DISPATCH TERMINAL QR ONBOARDING (XL: 5 COLS) */}');

if (mapStart !== -1 && mapEnd !== -1) {
  const mapBlock = content.substring(mapStart, mapEnd);
  // Remove from current position
  content = content.replace(mapBlock, '');
  
  // Insert above Automated Weather Notification
  const weatherStart = content.indexOf('{/* Automated Weather Notification Banner */}');
  content = content.substring(0, weatherStart) + mapBlock + content.substring(weatherStart);
}

// 2. Fix Tourist Grid max-h
content = content.replace(
  'className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 max-h-[300px] flex-1"',
  'className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1"'
);

// Remove justify-between to prevent gaps if it stretches
content = content.replace(
  'className="xl:col-span-7 p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col justify-between"',
  'className="xl:col-span-7 p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col"'
);

// Remove h-full
content = content.replace(
  '        <div className="xl:col-span-7 p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col">\n          <div className="h-full flex flex-col">',
  '        <div className="xl:col-span-7 p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col">\n          <div className="flex flex-col flex-1">'
);

fs.writeFileSync('src/components/AdminView.tsx', content, 'utf8');
