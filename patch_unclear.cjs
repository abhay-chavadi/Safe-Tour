const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf-8');
code = code.replace("localStorage.clear();\n", "");
fs.writeFileSync('src/main.tsx', code);
