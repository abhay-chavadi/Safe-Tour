const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const imports = `import express from 'express';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
`;

code = code.replace(/import express from 'express';/, imports);

const genAIInit = `
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on("connection", async (clientWs) => {
    try {
      const session = await ai.live.connect({
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
`;

// Insert genAIInit before async function start()
code = code.replace(/async function start\(\) \{/, `${genAIInit}\nasync function start() {`);

// Add chat route
const chatRoute = `
// Gemini Chat API
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: "You are a helpful tour guide assistant for tourists in Meghalaya. Keep answers concise. Provide map coordinates or locations when suggesting places. You have access to Google Maps grounding.",
        tools: [{ googleMaps: {} }],
      }
    });

    if (history && history.length > 0) {
      // For simplicity, we just send a single prompt with history context if we can't restore chat history object easily.
      // But we can also just use ai.models.generateContent with a constructed contents array.
    }

    // Since chat API maintains history if we keep the instance, for stateless API we should use generateContent
    // Let's use generateContent for stateless
    
    // Convert history to contents format:
    const contents = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: "You are a helpful tour guide assistant for tourists in Meghalaya. Provide short, concise answers. Provide map coordinates or locations when suggesting places. You have access to Google Maps grounding.",
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: 25.5788,
              longitude: 91.8933
            }
          }
        }
      }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const places = [];
    if (chunks) {
      chunks.forEach(c => {
         if (c.maps && c.maps.title) {
            places.push({ title: c.maps.title, uri: c.maps.uri });
         }
      });
    }

    res.json({ text: response.text, places });
  } catch (err: any) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  }
});
`;

code = code.replace(/app\.use\(express\.json\(\)\);/, `app.use(express.json());\n${chatRoute}`);

fs.writeFileSync('server.ts', code);
