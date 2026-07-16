const fs = require('fs');
let code = fs.readFileSync('src/components/AdminView.tsx', 'utf-8');

// The MAP block:
const mapRegex = /(\{\/\* EMERGENCY OPERATIONS CENTRAL MAP \*\/\}[\s\S]*?<\/div>\n      <\/div>)\n\n      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">/;

// Wait, the grid starts right after the map.
// Let's split the file into parts.

// Find indices
const mapStart = code.indexOf('{/* EMERGENCY OPERATIONS CENTRAL MAP */}');
const mapEnd = code.indexOf('<div className="grid grid-cols-1 xl:grid-cols-12 gap-8">');
const gridStart = code.indexOf('<div className="grid grid-cols-1 xl:grid-cols-12 gap-8">');
const gridEnd = code.indexOf('{/* GPS SATELLITE CELLULAR LOCK & QR CHECKPOINT SCANNER */}');

if (mapStart === -1 || mapEnd === -1 || gridStart === -1 || gridEnd === -1) {
  console.error("Could not find sections");
  process.exit(1);
}

const beforeMap = code.substring(0, mapStart);
const mapBlock = code.substring(mapStart, gridStart);
const gridBlock = code.substring(gridStart, gridEnd);
const afterGrid = code.substring(gridEnd);

// Fix the weather banner col-span
let newGridBlock = gridBlock.replace(/className={\`w-full py-2 px-4 mb-8 rounded-xl border/, 'className={`xl:col-span-12 w-full py-2 px-4 rounded-xl border');

// Reorder: beforeMap -> newGridBlock -> mapBlock -> afterGrid
const newCode = beforeMap + newGridBlock + '\n      ' + mapBlock + afterGrid;

fs.writeFileSync('src/components/AdminView.tsx', newCode);
