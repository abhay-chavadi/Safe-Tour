const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const newFences = `  {
    id: 'f-5',
    name: 'Umiam Lake Deep Water Danger Zone',
    type: 'danger',
    shape: 'circle',
    lat: 25.6601,
    lng: 91.8953,
    radius: 900,
  },
  {
    id: 'f-6',
    name: 'Mawphlang Sacred Forest Safe Zone',
    type: 'safe',
    shape: 'circle',
    lat: 25.4468,
    lng: 91.7589,
    radius: 1500,
  },
  {
    id: 'f-7',
    name: 'Ward\\'s Lake Safe Park',
    type: 'safe',
    shape: 'circle',
    lat: 25.5794,
    lng: 91.8887,
    radius: 500,
  },
`;

content = content.replace(/(id: 'f-4',\s+name: 'Police Bazaar Safe Base'[\s\S]*?radius: 1000, \/\/ 1km\s+\},)/, `$1\n${newFences}`);

fs.writeFileSync('server.ts', content);
