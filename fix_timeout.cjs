const fs = require('fs');
let content = fs.readFileSync('src/components/MapplsMap.tsx', 'utf8');

content = content.replace(
  '  const [isMapLoaded, setIsMapLoaded] = useState(false);',
  '  const [isMapLoaded, setIsMapLoaded] = useState(false);\n  useEffect(() => { const timer = setTimeout(() => setIsMapLoaded(true), 3000); return () => clearTimeout(timer); }, []);'
);

fs.writeFileSync('src/components/MapplsMap.tsx', content, 'utf8');
