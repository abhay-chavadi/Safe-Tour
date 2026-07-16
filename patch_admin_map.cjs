const fs = require('fs');
let content = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

const mapHTML = `
      {/* EMERGENCY OPERATIONS CENTRAL MAP */}
      <div className="p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden shadow-2xl mb-8">
        <h3 className="text-sm font-mono font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-emerald-400" /> EMERGENCY OPERATIONS CENTRAL MAP
        </h3>
        <div className="h-[520px] w-full rounded-2xl overflow-hidden relative border border-white/10 shadow-inner">
          <MapplsMap center={mapCenter} zoom={mapZoom} geoFences={geoFences} tourists={tourists} />
        </div>
      </div>
`;

content = content.replace(
  '          {/* GPS SATELLITE CELLULAR LOCK & QR CHECKPOINT SCANNER */}',
  mapHTML + '\n          {/* GPS SATELLITE CELLULAR LOCK & QR CHECKPOINT SCANNER */}'
);

fs.writeFileSync('src/components/AdminView.tsx', content, 'utf8');
