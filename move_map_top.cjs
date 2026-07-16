const fs = require('fs');
let content = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

// Find the map block
const mapStart = content.indexOf('{/* EMERGENCY OPERATIONS CENTRAL MAP */}');
const mapEnd = content.indexOf('{/* GPS SATELLITE CELLULAR LOCK & QR CHECKPOINT SCANNER */}');

if (mapStart !== -1 && mapEnd !== -1) {
  const mapBlock = content.substring(mapStart, mapEnd);
  
  // Remove it from current location
  content = content.replace(mapBlock, '');
  
  // Find where to insert it: after {/* TOURIST DISPATCH TERMINAL & ONBOARDING (TOP SECTION) */}
  const insertTarget = '{/* TOURIST DISPATCH TERMINAL & ONBOARDING (TOP SECTION) */}';
  content = content.replace(insertTarget, insertTarget + '\n\n      ' + mapBlock);
  
  fs.writeFileSync('src/components/AdminView.tsx', content, 'utf8');
  console.log('Map moved successfully.');
} else {
  console.log('Could not find map block.', mapStart, mapEnd);
}
