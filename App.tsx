
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { RadioMode, ConnectionStatus, RadioState } from './types';
import { createBlob, decode, decodeAudioData } from './utils/audio';
import RadioDisplay from './components/RadioDisplay';
import Controls from './components/Controls';

const FREQUENCIES = [144.100, 144.200, 144.300, 144.400, 144.500];

const App: React.FC = () => {
  const [state, setState] = useState<RadioState>({
    frequency: 144.100,
    mode: RadioMode.PTT,
    isTransmitting: false,
    isReceiving: false,
    status: ConnectionStatus.DISCONNECTED,
    volume: 85,
    squelch: 15
  });

  const [transcription, setTranscription] = useState<string[]>([]);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isButtonDownRef = useRef<boolean>(false);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const initSession = useCallback(async () => {
    if (sessionRef.current) return;

    setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTING }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioCtxRef.current = audioCtx;
      outputCtxRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioCtx.createMediaStreamSource(stream);
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTED }));
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const shouldTransmit = isButtonDownRef.current || (state.mode === RadioMode.OPEN);
              
              if (shouldTransmit && sessionRef.current) {
                const pcmBlob = createBlob(inputData);
                sessionRef.current.sendRealtimeInput({ media: pcmBlob });
                if (!state.isTransmitting) setState(prev => ({ ...prev, isTransmitting: true }));
              } else {
                if (state.isTransmitting) setState(prev => ({ ...prev, isTransmitting: false }));
              }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setState(prev => ({ ...prev, isReceiving: true }));
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const sourceNode = outputCtx.createBufferSource();
              sourceNode.buffer = buffer;
              
              const gainNode = outputCtx.createGain();
              gainNode.gain.value = state.volume / 100;
              sourceNode.connect(gainNode);
              gainNode.connect(outputCtx.destination);

              sourceNode.onended = () => {
                sourcesRef.current.delete(sourceNode);
                if (sourcesRef.current.size === 0) {
                  setState(prev => ({ ...prev, isReceiving: false }));
                }
              };

              sourceNode.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(sourceNode);
            }

            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscription(prev => [...prev.slice(-3), `RECV: ${text}`]);
            }
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscription(prev => [...prev.slice(-3), `SENT: ${text}`]);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setState(prev => ({ ...prev, isReceiving: false }));
            }
          },
          onerror: (e) => {
            console.error('Radio Error:', e);
            setState(prev => ({ ...prev, status: ConnectionStatus.ERROR }));
          },
          onclose: () => {
            setState(prev => ({ ...prev, status: ConnectionStatus.DISCONNECTED }));
            sessionRef.current = null;
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a radio dispatcher on frequency ${state.frequency} MHz. 
          Keep your responses brief, professional, and use radio terminology (Over, Roger, Copy, Wilco).`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, status: ConnectionStatus.ERROR }));
    }
  }, [state.frequency, state.mode, state.volume, state.isTransmitting]);

  const handlePttDown = () => {
    isButtonDownRef.current = true;
    if (state.mode === RadioMode.PTT && state.status === ConnectionStatus.CONNECTED) {
      setState(prev => ({ ...prev, isTransmitting: true }));
    }
  };

  const handlePttUp = () => {
    isButtonDownRef.current = false;
    if (state.mode === RadioMode.PTT) {
      setState(prev => ({ ...prev, isTransmitting: false }));
    }
  };

  const cycleFrequency = () => {
    const currentIndex = FREQUENCIES.indexOf(state.frequency);
    const nextIndex = (currentIndex + 1) % FREQUENCIES.length;
    setState(prev => ({ ...prev, frequency: FREQUENCIES[nextIndex] }));
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
      setTimeout(initSession, 300);
    }
  };

  const handlePowerToggle = () => {
    if (state.status === ConnectionStatus.DISCONNECTED || state.status === ConnectionStatus.ERROR) {
      initSession();
    } else {
      sessionRef.current?.close();
      sessionRef.current = null;
      setState(prev => ({ ...prev, status: ConnectionStatus.DISCONNECTED, isTransmitting: false, isReceiving: false }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] p-4 select-none">
      {/* Radio Housing */}
      <div className="relative bg-zinc-800 border-[6px] border-zinc-900 rounded-[3.5rem] p-8 w-full max-w-lg shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-visible">
        
        {/* Antenna */}
        <div className="absolute top-0 right-16 w-5 h-32 bg-zinc-900 -translate-y-24 rounded-t-xl border-t-4 border-zinc-700 shadow-xl" />

        <div className="flex flex-col gap-8">
          {/* Top Plate */}
          <div className="flex justify-between items-center px-4 border-b border-zinc-700 pb-4">
            <div className="flex flex-col">
              <h1 className="text-zinc-400 font-bold tracking-widest text-sm uppercase leading-none">VoxWave</h1>
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter">AI-POWERED FREQUENCY HOPS</span>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-zinc-500 font-bold mb-1">TX</span>
                <div className={`w-3 h-3 rounded-full shadow-[0_0_8px] transition-all duration-200 ${state.isTransmitting ? 'bg-red-500 shadow-red-500/50 scale-110' : 'bg-red-950 shadow-transparent'}`} />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-zinc-500 font-bold mb-1">RX</span>
                <div className={`w-3 h-3 rounded-full shadow-[0_0_8px] transition-all duration-200 ${state.isReceiving ? 'bg-green-500 shadow-green-500/50 scale-110' : 'bg-green-950 shadow-transparent'}`} />
              </div>
            </div>
          </div>

          {/* Main LCD Display */}
          <RadioDisplay state={state} transcription={transcription} />

          {/* Controls Plate */}
          <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-zinc-700/50 shadow-inner">
            <Controls 
              state={state} 
              onPttDown={handlePttDown}
              onPttUp={handlePttUp}
              onModeToggle={() => setState(prev => ({ ...prev, mode: prev.mode === RadioMode.PTT ? RadioMode.OPEN : RadioMode.PTT }))}
              onFreqChange={cycleFrequency}
              onVolumeChange={(v) => setState(prev => ({ ...prev, volume: v }))}
              onPowerToggle={handlePowerToggle}
            />
          </div>
          
          <div className="flex justify-center items-center gap-2 opacity-30">
             <div className="h-1 w-12 bg-zinc-600 rounded-full" />
             <span className="text-[8px] text-zinc-400 font-bold uppercase">Field Unit #0412</span>
             <div className="h-1 w-12 bg-zinc-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
