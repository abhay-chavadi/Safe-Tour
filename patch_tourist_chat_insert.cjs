const fs = require('fs');
let code = fs.readFileSync('src/components/TouristView.tsx', 'utf-8');

code = code.replace(/    <\/div>\n  \);\n\}\n?$/, `      <TouristChatbot />\n    </div>\n  );\n}\n`);

fs.writeFileSync('src/components/TouristView.tsx', code);
