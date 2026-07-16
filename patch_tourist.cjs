const fs = require('fs');

let content = fs.readFileSync('src/components/TouristView.tsx', 'utf-8');

const newDestinations = `    { name: 'Ward\\'s Lake Park', lat: 25.5794, lng: 91.8887, note: 'Entering safe park perimeter.' },
    { name: 'Umiam Lake Boating Area', lat: 25.6601, lng: 91.8953, note: 'WARNING: Inside deep water hazard zone.' },
    { name: 'Mawphlang Trek', lat: 25.4468, lng: 91.7589, note: 'Safe wilderness trekking.' },`;

content = content.replace(/(name: 'Laitlum Canyons Overlook'[\s\S]*?\n)/, `$1${newDestinations}\n`);

// Pulse animation for Secure Sync
content = content.replace(/(<Wifi className="w-4 h-4")(\s*\/>\s*<span[^>]*>SECURE NETWORK LINK OPERATIONAL<\/span>)/g, `$1 className="w-4 h-4 animate-pulse"$2`);
content = content.replace(/(<span[^>]*>)(SECURE NETWORK LINK OPERATIONAL)(<\/span>)/g, `$1 className="animate-pulse"$2$3`);

// Oh wait, the original was:
// <Wifi className="w-4 h-4" />
// <span>SECURE NETWORK LINK OPERATIONAL</span>
// We'll just replace the entire block.
content = content.replace(/<Wifi className="w-4 h-4" \/>\s*<span>SECURE NETWORK LINK OPERATIONAL<\/span>/g, `<Wifi className="w-4 h-4 animate-pulse" />\n              <span className="animate-pulse">SECURE NETWORK LINK OPERATIONAL</span>`);

// Weather pulse
content = content.replace(/(className={\`w-full py-2 px-4 mb-8 rounded-xl border transition-all duration-300 text-xs font-mono flex flex-col xl:flex-row items-center justify-between backdrop-blur-md \$\{weatherAlert\.containerClass\}\`})/g, `className={\`w-full py-2 px-4 mb-8 rounded-xl border transition-all duration-300 text-xs font-mono flex flex-col xl:flex-row items-center justify-between backdrop-blur-md animate-pulse \$\{weatherAlert.containerClass\}\`}`);

fs.writeFileSync('src/components/TouristView.tsx', content);
