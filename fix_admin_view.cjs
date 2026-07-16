const fs = require('fs');
let content = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

const searchStr = `<div className="text-slate-500 flex items-center gap-1">
                          <MapPlaceholder />
            </div>
          </div>`;

const replaceStr = `<div className="text-slate-500 flex items-center gap-1">
                          LAT: {t.lat.toFixed(5)} LNG: {t.lng.toFixed(5)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>`;

content = content.replace(searchStr, replaceStr);
fs.writeFileSync('src/components/AdminView.tsx', content, 'utf8');
