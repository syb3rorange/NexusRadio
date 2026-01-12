
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
    volume: 80,
    squelch: 20
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
            console.log('Radio connection established');
            setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTED }));
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Only transmit if we are in Open Mic OR if PTT button is down
              const shouldTransmit = state.mode === RadioMode.OPEN || isButtonDownRef.current;
              
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
            // Handle Audio output
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

            // Handle Transcriptions
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscription(prev => [...prev.slice(-4), `RECV: ${text}`]);
            }
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscription(prev => [...prev.slice(-4), `SENT: ${text}`]);
            }

            // Interruptions
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
            console.log('Radio offline');
            setState(prev => ({ ...prev, status: ConnectionStatus.DISCONNECTED }));
            sessionRef.current = null;
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a radio dispatcher on frequency ${state.frequency} MHz. 
          Keep your responses brief, professional, and use radio terminology (Over, Roger, Copy, Wilco).
          You are talking to various operators in the field.`,
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

  // Clean up
  useEffect(() => {
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (outputCtxRef.current) outputCtxRef.current.close();
    };
  }, []);

  const handlePttDown = () => {
    isButtonDownRef.current = true;
    if (state.mode === RadioMode.PTT) {
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
    // Force reconnect with new frequency/instruction
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
      setTimeout(initSession, 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 select-none">
      <div className="relative bg-zinc-900 border-4 border-zinc-800 rounded-[3rem] p-8 w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Antenna Aesthetic */}
        <div className="absolute top-0 right-12 w-4 h-24 bg-zinc-800 -translate-y-16 rounded-full border-t-2 border-zinc-700" />

        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex justify-between items-center px-4">
            <h1 className="text-zinc-500 font-bold tracking-widest text-xs uppercase">VoxWave 2.5 Digital</h1>
            <div className="flex gap-2">
              <div className={`w-3 h-3 rounded-full shadow-lg ${state.isTransmitting ? 'bg-red-500 animate-pulse' : 'bg-red-900'}`} title="TX" />
              <div className={`w-3 h-3 rounded-full shadow-lg ${state.isReceiving ? 'bg-green-500 animate-pulse' : 'bg-green-900'}`} title="RX" />
            </div>
          </div>

          {/* Main LCD */}
          <RadioDisplay state={state} transcription={transcription} />

          {/* Controls Section */}
          <div className="bg-zinc-800/50 p-6 rounded-3xl border border-zinc-700 shadow-inner flex flex-col gap-6">
            <Controls 
              state={state} 
              onPttDown={handlePttDown}
              onPttUp={handlePttUp}
              onModeToggle={() => setState(prev => ({ ...prev, mode: prev.mode === RadioMode.PTT ? RadioMode.OPEN : RadioMode.PTT }))}
              onFreqChange={cycleFrequency}
              onVolumeChange={(v) => setState(prev => ({ ...prev, volume: v }))}
              onPowerToggle={state.status === ConnectionStatus.DISCONNECTED ? initSession : () => { sessionRef.current?.close(); sessionRef.current = null; }}
            />
          </div>
          
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-tighter">Secure AI Frequency Hopping Tech</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
