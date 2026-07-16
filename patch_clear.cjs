const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf-8');
code = code.replace("import App from './App'", "import App from './App'\n\nlocalStorage.clear();\n");
fs.writeFileSync('src/main.tsx', code);
