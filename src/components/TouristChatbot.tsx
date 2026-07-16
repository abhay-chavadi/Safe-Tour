import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Mic, Send, MapPin, StopCircle, Bot } from 'lucide-react';

export default function TouristChatbot({ onPlacesSuggested }: { onPlacesSuggested?: (places: any[]) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; content: string; places?: {title: string, uri: string}[] }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Audio state
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages })
      });
      const data = await res.json();
      if (data.text) {
        setMessages(prev => [...prev, { role: 'model', content: data.text, places: data.places }]);
        if (onPlacesSuggested && data.places) {
          onPlacesSuggested(data.places);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const pcmToBase64 = (float32Array: Float32Array) => {
    let pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const buffer = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return window.btoa(binary);
  };

  const playAudioChunk = (ctx: AudioContext, base64: string) => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }
    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
  };

  const toggleLiveMode = async () => {
    if (isLiveMode) {
      // Stop
      setIsLiveMode(false);
      processorRef.current?.disconnect();
      streamRef.current?.getTracks().forEach(t => t.stop());
      wsRef.current?.close();
      inputAudioCtxRef.current?.close();
      outputAudioCtxRef.current?.close();
    } else {
      // Start
      try {
        setIsLiveMode(true);
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${wsProtocol}//${window.location.host}/live`);
        wsRef.current = ws;

        const inputCtx = new window.AudioContext({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputCtx;
        const outputCtx = new window.AudioContext({ sampleRate: 24000 });
        outputAudioCtxRef.current = outputCtx;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        
        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
             playAudioChunk(outputCtx, msg.audio);
          }
        };
      } catch (err) {
        console.error("Live mode error:", err);
        setIsLiveMode(false);
      }
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform z-40"
      >
        <MessageSquare className="w-6 h-6 text-black" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 font-mono text-xs">
          <div className="bg-emerald-500/10 p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-white uppercase tracking-wider">AI Tour Guide</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 my-8">
                <p>Hello! I can help you find places to visit, check weather, or guide you safely around Meghalaya.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-xl max-w-[85%] ${m.role === 'user' ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30' : 'bg-black/40 text-slate-200 border border-white/5'}`}>
                  {m.content}
                </div>
                {m.places && m.places.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.places.map((place, idx) => (
                      <a key={idx} href={place.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] text-emerald-400 hover:underline bg-emerald-950/40 p-1.5 rounded border border-emerald-500/20">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{place.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-black/40 border-t border-white/10 relative">
            {isLiveMode && (
              <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none">
                <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider animate-pulse backdrop-blur-md">
                  <Mic className="w-3.5 h-3.5" /> Live Voice Active
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLiveMode}
                className={`p-2 rounded-full transition-colors ${isLiveMode ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                title={isLiveMode ? "Stop Voice Mode" : "Start Voice Mode"}
              >
                {isLiveMode ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask for suggestions..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-white/30"
                disabled={isLiveMode}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || isLiveMode}
                className="p-2 bg-emerald-500 text-black rounded-lg disabled:opacity-50 hover:bg-emerald-400 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
