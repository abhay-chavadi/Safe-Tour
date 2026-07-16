const fs = require('fs');
let content = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

const searchStr = `<PlaceAutocomplete onPlaceSelect={(place) => {
                      if (place.geometry?.location) {
                        setNewFenceLat(place.geometry.location.lat().toString());
                        setNewFenceLng(place.geometry.location.lng().toString());
                        if (place.name) setNewFenceName(place.name);
                        setMapCenter({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
                      }
                    }} />`;

const replaceStr = `<input type="text" placeholder="Search disabled" className="flex-1 p-2 bg-slate-900 border border-white/10 text-white rounded disabled:opacity-50" disabled />`;

content = content.replace(searchStr, replaceStr);

content = content.replace(/function PlaceAutocomplete[\s\S]*?return \(\s*<input[\s\S]*?<\/input>\s*\);\n\}/, '');

fs.writeFileSync('src/components/AdminView.tsx', content, 'utf8');
