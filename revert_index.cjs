const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

content = content.replace(
  '  <script src="https://apis.mappls.com/advancedmaps/api/hklmgbwzrxncdyavtsuojqpiefrbhqplnm/map_sdk?layer=vector&v=3.0"></script>\n    <script src="https://apis.mappls.com/advancedmaps/api/hklmgbwzrxncdyavtsuojqpiefrbhqplnm/map_sdk_plugins"></script>\n  </head>',
  '  </head>'
);

fs.writeFileSync('index.html', content, 'utf8');
