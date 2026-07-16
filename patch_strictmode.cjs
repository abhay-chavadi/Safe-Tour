const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf-8');
code = code.replace(/<StrictMode>/g, '');
code = code.replace(/<\/StrictMode>,/g, ',');
fs.writeFileSync('src/main.tsx', code);
