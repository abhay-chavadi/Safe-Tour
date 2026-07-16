const fs = require('fs');
let code = fs.readFileSync('src/components/TouristView.tsx', 'utf-8');

if (!code.includes('import TouristChatbot')) {
  code = code.replace(/import MapplsMap from "\.\/MapplsMap";/, "import MapplsMap from \"./MapplsMap\";\nimport TouristChatbot from './TouristChatbot';");
}

code = code.replace(/(<div className="absolute inset-0 z-0">[\s\S]*?<\/div>)/, `$1\n      <TouristChatbot />`);

fs.writeFileSync('src/components/TouristView.tsx', code);
