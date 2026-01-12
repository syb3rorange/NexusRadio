
import React from 'react';
import { RadioState, ConnectionStatus } from '../types';

interface Props {
  state: RadioState;
  transcription: string[];
}

const RadioDisplay: React.FC<Props> = ({ state, transcription }) => {
  return (
    <div className="bg-green-900/10 border-4 border-zinc-800 rounded-2xl p-6 h-64 shadow-inner relative overflow-hidden">
      {/* Scan Lines Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%]" />
      
      <div className="relative z-10 flex flex-col h-full font-mono text-green-500">
        {/* Top Status Bar */}
        <div className="flex justify-between items-start mb-2 text-[10px] font-bold">
          <div className="flex gap-1">
            <span className={state.status === ConnectionStatus.CONNECTED ? 'text-green-400' : 'text-zinc-600'}>SIG: {state.status === ConnectionStatus.CONNECTED ? '|||||' : '.....'}</span>
          </div>
          <div className="uppercase lcd-glow">
            {state.status}
          </div>
        </div>

        {/* Frequency Display */}
        <div className="flex flex-col items-center justify-center my-2">
          <div className="text-4xl font-black lcd-glow tracking-widest leading-none">
            {state.frequency.toFixed(3)}
          </div>
          <div className="text-xs mt-1 text-green-700/80 font-bold uppercase">
            {state.mode} • MHZ
          </div>
        </div>

        {/* Console Logs */}
        <div className="flex-1 mt-4 overflow-hidden border-t border-green-900/30 pt-2">
          <div className="text-[9px] uppercase space-y-1 opacity-80">
            {transcription.length === 0 ? (
              <p className="animate-pulse italic">Scanning for signals...</p>
            ) : (
              transcription.map((line, i) => (
                <div key={i} className="truncate whitespace-nowrap">
                  <span className="opacity-50 mr-1">{'>'}</span>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Signal Visualizer Simulation */}
        <div className="h-6 flex items-end gap-[2px] opacity-40 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div 
              key={i} 
              className="bg-green-500 w-1 rounded-t"
              style={{ 
                height: `${state.status === ConnectionStatus.CONNECTED ? (Math.random() * 80 + (state.isReceiving || state.isTransmitting ? 20 : 5)) : 5}%`,
                transition: 'height 0.1s ease'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RadioDisplay;
