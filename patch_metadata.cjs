const fs = require('fs');
let code = JSON.parse(fs.readFileSync('metadata.json', 'utf-8'));

if (!code.requestFramePermissions) {
  code.requestFramePermissions = [];
}
if (!code.requestFramePermissions.includes('microphone')) {
  code.requestFramePermissions.push('microphone');
}

if (!code.majorCapabilities) {
  code.majorCapabilities = [];
}
if (!code.majorCapabilities.includes('MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API')) {
  code.majorCapabilities.push('MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API');
}

fs.writeFileSync('metadata.json', JSON.stringify(code, null, 2));
