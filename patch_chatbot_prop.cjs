const fs = require('fs');
let code = fs.readFileSync('src/components/TouristChatbot.tsx', 'utf-8');

code = code.replace(/export default function TouristChatbot\(\) \{/, `export default function TouristChatbot({ onPlacesSuggested }: { onPlacesSuggested?: (places: any[]) => void }) {`);

code = code.replace(/setMessages\(prev => \[\.\.\.prev, \{ role: 'model', content: data\.text, places: data\.places \}\]\);/, `setMessages(prev => [...prev, { role: 'model', content: data.text, places: data.places }]);\n        if (onPlacesSuggested && data.places) {\n          onPlacesSuggested(data.places);\n        }`);

fs.writeFileSync('src/components/TouristChatbot.tsx', code);
