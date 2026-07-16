const fs = require('fs');
let content = fs.readFileSync('src/components/AdminView.tsx', 'utf-8');

// Pulse weather
content = content.replace(/(className={\`w-full py-2 px-4 mb-8 rounded-xl border transition-all duration-300 text-xs font-mono flex flex-col xl:flex-row items-center justify-between backdrop-blur-md \$\{weatherAlert\.containerClass\}\`})/g, `className={\`w-full py-2 px-4 mb-8 rounded-xl border transition-all duration-300 text-xs font-mono flex flex-col xl:flex-row items-center justify-between backdrop-blur-md animate-pulse \$\{weatherAlert.containerClass\}\`}`);

fs.writeFileSync('src/components/AdminView.tsx', content);
