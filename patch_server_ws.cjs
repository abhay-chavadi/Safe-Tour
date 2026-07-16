const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace app.listen to keep the server instance
const startStr = `  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(\`[Safe Tour] Server running at http://localhost:\${PORT}\`);
  });

  setupWebSocket(server);
`;

code = code.replace(/app\.listen\(PORT, '0\.0\.0\.0', \(\) => \{\n    console\.log\(`\[Safe Tour\] Server running at http:\/\/localhost:\$\{PORT\}`\);\n  \}\);/, startStr);

fs.writeFileSync('server.ts', code);
