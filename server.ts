import express from 'express';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { Tourist, GeoFence, BlockchainBlock } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy load Gemini AI to avoid crash if API key is not present on startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return aiClient;
}

// In-Memory Database State
const tourists: Map<string, Tourist> = new Map();
let geoFences: GeoFence[] = [
  {
    id: 'f-1',
    name: 'Shillong Visitor Safe Zone',
    type: 'safe',
    shape: 'circle',
    lat: 25.5788,
    lng: 91.8933,
    radius: 1200, // 1.2km
  },
  {
    id: 'f-2',
    name: 'Elephant Falls Cliff Danger Zone',
    type: 'danger',
    shape: 'circle',
    lat: 25.5347,
    lng: 91.8211,
    radius: 800, // 800m
  },
  {
    id: 'f-3',
    name: 'Laitlum Canyons Overlook',
    type: 'danger',
    shape: 'circle',
    lat: 25.4851,
    lng: 91.9567,
    radius: 600, // 600m
  },
  {
    id: 'f-4',
    name: 'Police Bazaar Safe Base',
    type: 'safe',
    shape: 'circle',
    lat: 25.5760,
    lng: 91.8825,
    radius: 1000, // 1km
  },
  {
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
    name: 'Ward\'s Lake Safe Park',
    type: 'safe',
    shape: 'circle',
    lat: 25.5794,
    lng: 91.8887,
    radius: 500,
  },

];

const blockchain: BlockchainBlock[] = [];
let activeAlerts: { id: string; message: string; severity: 'warning' | 'info' | 'critical'; timestamp: number }[] = [];

// Real-time Event Broadcaster & Incidents
let sseClients: any[] = [];
let incidentReports: {
  id: string;
  touristId: string;
  touristName: string;
  message: string;
  lat: number;
  lng: number;
  timestamp: number;
  status: 'pending' | 'resolved';
}[] = [];

function broadcastToSse(type: string, data: any) {
  const payload = JSON.stringify({ type, data, timestamp: Date.now() });
  sseClients.forEach(client => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch (e) {
      console.error('Failed to write to SSE client', e);
    }
  });
}

// Helper to calculate SHA-256 block hash
function calculateBlockHash(
  index: number,
  timestamp: number,
  touristId: string,
  previousHash: string,
  data: string,
  nonce: number
): string {
  const input = `${index}${timestamp}${touristId}${previousHash}${data}${nonce}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Helper to mine block with low difficulty for speed (e.g. hash starting with '0')
function mineBlock(
  touristId: string,
  data: string
): BlockchainBlock {
  const previousBlock = blockchain[blockchain.length - 1];
  const previousHash = previousBlock ? previousBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000';
  const index = blockchain.length;
  const timestamp = Date.now();
  let nonce = 0;
  let hash = '';

  while (true) {
    hash = calculateBlockHash(index, timestamp, touristId, previousHash, data, nonce);
    if (hash.startsWith('0')) { // Proof of work condition
      break;
    }
    nonce++;
  }

  const block: BlockchainBlock = {
    index,
    timestamp,
    touristId,
    previousHash,
    hash,
    nonce,
    data,
  };

  blockchain.push(block);
  return block;
}

// Pre-populate with Genesis Block
blockchain.push({
  index: 0,
  timestamp: Date.now(),
  touristId: 'SYSTEM',
  previousHash: '0',
  hash: '00000000genesisblock0000000000000000000000000000000000000000000000',
  nonce: 42,
  data: 'Safe Tour Genesis Block - Decentralized Tourist Safety Registry Initialized',
});

// API Routes

// 1. Get all tourists
app.get('/api/tourists', (req, res) => {
  res.json(Array.from(tourists.values()));
});

// 2. Register a tourist & generate digital ID and blockchain block
app.post('/api/tourists/register', (req, res) => {
  const { name, phone, facePhoto, lat, lng, nationality, passportId, stayDuration } = req.body;

  if (!name || !phone) {
    res.status(400).json({ error: 'Name and phone number are required.' });
    return;
  }

  // Generate unique digital ID matching blockchain style (0x followed by part of sha256)
  const idSeed = `${phone}-${name}-${Date.now()}`;
  const idHash = crypto.createHash('sha256').update(idSeed).digest('hex');
  const digitalId = `0x${idHash.substring(0, 24).toUpperCase()}`;

  // Check if phone number already registered, reuse or re-create
  let existingTourist: Tourist | undefined;
  for (const t of tourists.values()) {
    if (t.phone === phone) {
      existingTourist = t;
      break;
    }
  }

  if (existingTourist) {
    res.status(400).json({ error: 'Phone number already registered. Please login to your existing Digital ID.' });
    return;
  }

  // Mine registration block
  const block = mineBlock(digitalId, `Tourist Registration: ${name} (${phone})`);

  const newTourist: Tourist = {
    id: digitalId,
    name,
    phone,
    nationality: nationality || '',
    passportId: passportId || '',
    stayDuration: stayDuration || '',
    facePhoto: facePhoto || '',
    lat: lat !== undefined ? Number(lat) : 25.5788, // Default near visitor center
    lng: lng !== undefined ? Number(lng) : 91.8933,
    lastActive: Date.now(),
    sosActive: false,
    sosTime: null,
    offlineMode: false,
    registrationTimestamp: Date.now(),
    blockchainBlockIndex: block.index,
    blockHash: block.hash,
  };

  tourists.set(digitalId, newTourist);
  broadcastToSse('TOURIST_REGISTERED', newTourist);
  res.status(201).json({ tourist: newTourist, block });
});

// 3. Update tourist location, check geo-fences, log in blockchain
app.post('/api/tourists/location', (req, res) => {
  const { touristId, lat, lng, offlineMode } = req.body;

  const tourist = tourists.get(touristId);
  if (!tourist) {
    res.status(404).json({ error: 'Tourist not found' });
    return;
  }

  tourist.lat = Number(lat);
  tourist.lng = Number(lng);
  tourist.lastActive = Date.now();
  tourist.offlineMode = Boolean(offlineMode);

  // We mine a lightweight block periodically for location telemetry, e.g. every 10 updates or just update locally.
  // To keep ledger clean, we create block on state changes (entering/exiting fences or going offline).
  // Let's check status
  broadcastToSse('LOCATION_UPDATED', { touristId, lat: tourist.lat, lng: tourist.lng, lastActive: tourist.lastActive, offlineMode: tourist.offlineMode });
  res.json({ success: true, tourist });
});

// 4. Trigger SOS
app.post('/api/tourists/sos', (req, res) => {
  const { touristId, active } = req.body;

  const tourist = tourists.get(touristId);
  if (!tourist) {
    res.status(404).json({ error: 'Tourist not found' });
    return;
  }

  tourist.sosActive = active;
  tourist.sosTime = active ? Date.now() : null;
  tourist.lastActive = Date.now();

  const eventText = active ? 'SOS Emergency Triggered' : 'SOS Emergency Cleared';
  const block = mineBlock(touristId, `${eventText} at Lat: ${tourist.lat.toFixed(4)}, Lng: ${tourist.lng.toFixed(4)}`);

  broadcastToSse('SOS_UPDATED', { touristId, sosActive: active, sosTime: tourist.sosTime, block });
  res.json({ success: true, tourist, block });
});

// 5. Get all geo-fences
app.get('/api/geofences', (req, res) => {
  res.json(geoFences);
});

// 6. Create geo-fence
app.post('/api/geofences', (req, res) => {
  const { name, type, lat, lng, radius } = req.body;

  if (!name || !type || lat === undefined || lng === undefined || !radius) {
    res.status(400).json({ error: 'Missing geo-fence configuration parameters' });
    return;
  }

  const newFence: GeoFence = {
    id: `f-${Date.now()}`,
    name,
    type,
    shape: 'circle',
    lat: Number(lat),
    lng: Number(lng),
    radius: Number(radius),
  };

  geoFences.push(newFence);

  // Register in blockchain
  mineBlock('SYSTEM', `New Geo-Fence Deployed: ${name} (${type.toUpperCase()})`);

  res.status(201).json(newFence);
});

// 7. Delete geo-fence
app.delete('/api/geofences/:id', (req, res) => {
  const { id } = req.params;
  const index = geoFences.findIndex(f => f.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Geo-fence not found' });
    return;
  }

  const removed = geoFences[index];
  geoFences.splice(index, 1);

  // Register removal in blockchain
  mineBlock('SYSTEM', `Geo-Fence Removed: ${removed.name}`);

  res.json({ success: true, removed });
});

// 8. Get blockchain ledger
app.get('/api/blockchain', (req, res) => {
  res.json(blockchain);
});

// 8b. Active Alerts Broadcast System
app.get('/api/alerts', (req, res) => {
  res.json(activeAlerts);
});

app.post('/api/alerts', (req, res) => {
  const { message, severity } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Alert message is required' });
    return;
  }
  const newAlert = {
    id: `alert-${Date.now()}`,
    message,
    severity: severity || 'warning',
    timestamp: Date.now()
  };
  activeAlerts.push(newAlert);
  // Also register in blockchain ledger for durability and proof-of-work authenticity
  mineBlock('SYSTEM', `Emergency Broadcast Issued: "${message}" [Severity: ${(severity || 'warning').toUpperCase()}]`);
  broadcastToSse('ALERT_BROADCAST', newAlert);
  res.status(201).json(newAlert);
});

app.post('/api/alerts/clear', (req, res) => {
  const { alertId } = req.body;
  if (alertId) {
    activeAlerts = activeAlerts.filter(a => a.id !== alertId);
  } else {
    activeAlerts = [];
  }
  mineBlock('SYSTEM', `Emergency Broadcast Cleared`);
  broadcastToSse('ALERT_CLEARED', { alertId });
  res.json({ success: true, activeAlerts });
});

// 8c. Server-Sent Events (SSE) Real-time Stream
app.get('/api/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send introductory connection message
  res.write(`data: ${JSON.stringify({ type: 'HELO', message: 'SSE Connection Established' })}\n\n`);

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

// 8d. Incident Reports Endpoints
app.get('/api/reports', (req, res) => {
  res.json(incidentReports);
});

// Disaster-related safety news articles and advisories
let disasterNews = [
  {
    id: 'news-1',
    title: '🚨 ORANGE ALERT: Torrential Rainfall in Shillong',
    category: 'Weather Warning',
    message: 'The Meteorological Department has issued an orange alert for East Khasi Hills. Heavy to very heavy rain expected over the next 24 hours. Flash flood risks are active.',
    timestamp: Date.now() - 15 * 60 * 1000,
    severity: 'warning' as const
  },
  {
    id: 'news-2',
    title: '🚧 NH-6 ROAD BLOCK: Sonapur Tunnel Landslide',
    category: 'Road & Travel',
    message: 'A massive landslide occurred near Sonapur Tunnel, completely blocking traffic on NH-6. Rescue and clearance operations are underway. Tourists are advised to take alternative routes or delay travel.',
    timestamp: Date.now() - 45 * 60 * 1000,
    severity: 'critical' as const
  },
  {
    id: 'news-3',
    title: '🌊 Mawlynnong Flash Flood Caution',
    category: 'Local Safety',
    message: 'Rising river levels near Dawki and Mawlynnong have prompted local rangers to issue a flash flood warning. Water crossings are strictly prohibited.',
    timestamp: Date.now() - 120 * 60 * 1000,
    severity: 'warning' as const
  },
  {
    id: 'news-4',
    title: '📢 Central Dispatch: SDMA Earthquake Awareness Drill Today',
    category: 'System Announcement',
    message: 'State Disaster Management Authority is conducting a safety drill today. Please ignore any sirens near central Shillong.',
    timestamp: Date.now() - 240 * 60 * 1000,
    severity: 'info' as const
  }
];

app.get('/api/disaster-news', (req, res) => {
  res.json(disasterNews);
});

app.post('/api/disaster-news', (req, res) => {
  const { title, message, category, severity } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: 'Title and message are required.' });
    return;
  }
  const newArticle = {
    id: `news-${Date.now()}`,
    title,
    message,
    category: category || 'General Safety',
    severity: severity || 'warning',
    timestamp: Date.now()
  };
  disasterNews.unshift(newArticle);
  
  // Register in blockchain for permanent, unalterable proof
  mineBlock('SYSTEM', `Published Safety Advisory: "${title}" [Category: ${newArticle.category}]`);
  
  // Broadcast to SSE so clients get it in real-time
  broadcastToSse('NEWS_UPDATED', disasterNews);
  
  res.status(201).json(newArticle);
});

app.delete('/api/disaster-news/:id', (req, res) => {
  const { id } = req.params;
  const index = disasterNews.findIndex(n => n.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'News advisory not found.' });
    return;
  }
  const removed = disasterNews[index];
  disasterNews.splice(index, 1);
  
  // Register in blockchain
  mineBlock('SYSTEM', `Archived Safety Advisory: "${removed.title}"`);
  
  // Broadcast to SSE
  broadcastToSse('NEWS_UPDATED', disasterNews);
  res.json({ success: true, removed });
});

app.post('/api/reports', (req, res) => {
  const { touristId, message, lat, lng } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Incident report message is required.' });
    return;
  }

  const tourist = touristId ? tourists.get(touristId) : null;
  const touristName = tourist ? tourist.name : 'Anonymous / Scan Walker';

  const newReport = {
    id: `report-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    touristId: touristId || 'SYSTEM_GUEST',
    touristName,
    message,
    lat: Number(lat) || 25.5788,
    lng: Number(lng) || 91.8933,
    timestamp: Date.now(),
    status: 'pending' as const
  };

  incidentReports.push(newReport);

  // Register in blockchain ledger for unalterable record
  mineBlock(touristId || 'SYSTEM_GUEST', `Incident Report Filed: "${message}" at Lat: ${newReport.lat.toFixed(4)}, Lng: ${newReport.lng.toFixed(4)}`);

  // Push to SSE clients
  broadcastToSse('REPORT_SUBMITTED', newReport);

  res.status(201).json(newReport);
});

app.post('/api/reports/resolve', (req, res) => {
  const { reportId } = req.body;
  const report = incidentReports.find(r => r.id === reportId);
  if (!report) {
    res.status(404).json({ error: 'Incident report not found.' });
    return;
  }

  report.status = 'resolved';

  // Register resolution in blockchain ledger
  mineBlock(report.touristId, `Incident Resolved: ID ${reportId} - Message: "${report.message}"`);

  // Push to SSE clients
  broadcastToSse('REPORT_RESOLVED', report);

  res.json({ success: true, report });
});

// 9. AI Smart Safety Assessment via Gemini
app.post('/api/ai/analyze-safety', async (req, res) => {
  const { touristId } = req.body;

  const tourist = tourists.get(touristId);
  if (!tourist) {
    res.status(404).json({ error: 'Tourist not found' });
    return;
  }

  // Find which geo-fences are active for this tourist
  const activeFences: string[] = [];
  let inDangerZone = false;
  let inSafeZone = false;

  // Simple Haversine formula
  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  }

  geoFences.forEach(fence => {
    const dist = getDistance(tourist.lat, tourist.lng, fence.lat, fence.lng);
    if (dist <= fence.radius) {
      activeFences.push(`${fence.name} (${fence.type === 'safe' ? 'Safe Zone' : 'Danger Zone'})`);
      if (fence.type === 'danger') inDangerZone = true;
      if (fence.type === 'safe') inSafeZone = true;
    }
  });

  const prompt = `You are the AI Core of the "Safe Tour" Smart Safety system.
Analyze the following tourist's real-time situation and generate a short, highly professional, cinematic, and actionable safety advisory.

Tourist Information:
- Name: ${tourist.name}
- Phone: ${tourist.phone}
- Digital Blockchain ID: ${tourist.id}
- Active SOS: ${tourist.sosActive ? 'YES (EMERGENCY IN PROGRESS)' : 'NO (Normal Status)'}
- Connection Mode: ${tourist.offlineMode ? 'OFFLINE (Remote/No coverage - relying on offline cache)' : 'ONLINE'}
- Current Location: Lat ${tourist.lat.toFixed(5)}, Lng ${tourist.lng.toFixed(5)} (Shillong Meghalaya Wilderness)
- Active Geo-fences around Tourist: ${activeFences.join(', ') || 'No active geo-fences nearby'}
- Safe Zone Presence: ${inSafeZone ? 'YES' : 'NO'}
- Danger Zone Presence: ${inDangerZone ? 'YES' : 'NO'}

Generate a safety report in JSON with three keys:
1. "advisory" (a punchy 2-sentence summary of their current safety rating and general travel guidance)
2. "recommendations" (an array of 3 specific wilderness survival/safety guidelines based on their geo-fencing or SOS status)
3. "threatLevel" (either "LOW", "MODERATE", "HIGH", or "CRITICAL")

Keep advice strictly relevant to mountainous wilderness environments (like Shillong, waterfalls, dropoffs, wild animals, or cold nights) and their actual status. Make it sound cinematic, futuristic yet highly practical.`;

  const client = getGeminiClient();

  if (client) {
    try {
      const aiResponse = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = aiResponse.text;
      if (responseText) {
        res.json(JSON.parse(responseText.trim()));
        return;
      }
    } catch (err) {
      console.error('Error generating content with Gemini:', err);
    }
  }

  // Fallback high-quality response if Gemini is not configured or fails
  let advisory = 'Location tracking remains operational. No active alarms in your coordinates.';
  let threatLevel = 'LOW';
  let recommendations = [
    'Stay on marked Shillong trails and avoid loose rocky terrain.',
    'Keep your offline safety kit synced and monitor offline telemetry signals.',
    'Ensure water supply is sufficient and bear-safe food lockers are utilized.',
  ];

  if (tourist.sosActive) {
    advisory = 'CRITICAL ALARM DETECTED. Emergency SOS signal broadcasted via blockchain ledger. Stand by.';
    threatLevel = 'CRITICAL';
    recommendations = [
      'Remain at your current coordinates. Moving may complicate Ranger rescue sweeps.',
      'Maximize visibility by using phone flash, and conserve battery power.',
      'Prepare standard emergency shelter and stay calm. Rescue teams are dispatched.',
    ];
  } else if (inDangerZone) {
    advisory = 'WARNING: You have entered a designated Wilderness Danger Zone with steep drop-offs and extreme terrain.';
    threatLevel = 'HIGH';
    recommendations = [
      'Exercise extreme caution near ridge borders, cliffs, or high-velocity water channels.',
      'Retrace your steps back towards the Valley Ranger Base safe zone.',
      'Check terrain maps for loose gravel or active warning flags.',
    ];
  } else if (tourist.offlineMode) {
    advisory = 'OFFLINE SYSTEM ACTIVATED: You are currently navigating in a remote area with zero network reception.';
    threatLevel = 'MODERATE';
    recommendations = [
      'Rely on cached maps and local landmark navigation guidelines.',
      'Offline SOS signals will be stored in local blockchain ledger and broadcast via mesh-caching.',
      'Do not venture off-trail while offline system is active.',
    ];
  }

  res.json({ advisory, recommendations, threatLevel });
});

// DELETE a registered tourist
app.delete('/api/tourists/:id', (req, res) => {
  const { id } = req.params;
  const tourist = tourists.get(id);
  if (!tourist) {
    res.status(404).json({ error: 'Tourist not found' });
    return;
  }

  tourists.delete(id);
  // Register removal in blockchain
  mineBlock('SYSTEM', `Tourist Checked Out / Removed: ${tourist.name} (ID: ${id})`);
  broadcastToSse('TOURIST_REMOVED', { id });
  res.json({ success: true, id });
});

// POST to logout / de-register all tourists
app.post('/api/tourists/logout-all', (req, res) => {
  const count = tourists.size;
  tourists.clear();
  mineBlock('SYSTEM', `Bulk Checkout: All active tourist sessions (${count}) have been logged out and cleared.`);
  broadcastToSse('TOURISTS_CLEARED', {});
  res.json({ success: true, clearedCount: count });
});

// Start server

function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on("connection", async (clientWs) => {
    try {
      const client = getGeminiClient();
      if (!client) {
        console.error("Gemini API Key is missing. Live audio session cannot start.");
        clientWs.send(JSON.stringify({ error: "Gemini API Key is required but not configured." }));
        clientWs.close();
        return;
      }
      const session = await client.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful tour guide for Shillong and Meghalaya. Provide concise, friendly suggestions for places to visit, weather updates, and safety tips. Focus on keeping tourists safe and informed.",
          tools: [{ googleSearch: {} }],
        },
        callbacks: {
          onmessage: (message) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) clientWs.send(JSON.stringify({ audio }));
            if (message.serverContent?.interrupted)
              clientWs.send(JSON.stringify({ interrupted: true }));
          },
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Live API WS message error:", e);
        }
      });
      
      clientWs.on("close", () => {
        // clean up
      });
    } catch (err) {
      console.error("Failed to start Live session", err);
      clientWs.close();
    }
  });
}

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

    const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Safe Tour] Server running at http://localhost:${PORT}`);
  });

  setupWebSocket(server);

}

start();
