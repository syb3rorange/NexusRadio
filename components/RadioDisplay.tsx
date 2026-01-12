
import React from 'react';
import { RadioState, ConnectionStatus } from '../types';

interface Props {
  state: RadioState;
  transcription: string[];
}

const RadioDisplay: React.FC<Props> = ({ state, transcription }) => {
  const isPowered = state.status !== ConnectionStatus.DISCONNECTED;

  return (
    <div className={`relative rounded-3xl p-6 h-64 border-4 border-zinc-950 shadow-inner overflow-hidden transition-all duration-700 ${isPowered ? 'lcd-glow-active' : 'lcd-glow-off'}`}>
      {/* LCD Surface Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px]" />
      
      <div className={`relative z-10 flex flex-col h-full font-mono transition-colors duration-500 ${isPowered ? 'text-green-400' : 'text-zinc-600'}`}>
        {/* Status Line */}
        <div className="flex justify-between items-start text-[10px] font-bold tracking-widest uppercase">
          <div className="flex gap-2">
            <span>SIG {isPowered ? '●●●●○' : '○○○○○'}</span>
          </div>
          <div className={`${isPowered ? 'animate-pulse' : ''}`}>
            {state.status}
          </div>
        </div>

        {/* Main Frequency Display */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-2">
          <div className={`text-5xl font-black tracking-widest leading-none mb-1 transition-all duration-500 ${isPowered ? 'opacity-100 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'opacity-40'}`}>
            {state.frequency.toFixed(3)}
          </div>
          <div className="flex gap-3 text-[10px] font-bold opacity-70">
            <span className="border-r border-current pr-3">VHF DIGITAL</span>
            <span>{state.mode}</span>
          </div>
        </div>

        {/* Transcript Area */}
        <div className="h-16 border-t border-current/20 mt-4 pt-2 overflow-hidden">
          <div className="text-[9px] uppercase leading-tight">
            {isPowered ? (
              transcription.length > 0 ? (
                transcription.map((line, i) => (
                  <div key={i} className="truncate whitespace-nowrap opacity-80">
                    <span className="mr-2">{'>'}</span>{line}
                  </div>
                ))
              ) : (
                <div className="animate-pulse opacity-50">READY ON CHANNEL...</div>
              )
            ) : (
              <div className="opacity-20 italic">DISPLAY OFFLINE</div>
            )}
          </div>
        </div>

        {/* Bottom Signal Bars */}
        <div className="h-4 flex items-end justify-center gap-[3px] mt-2 opacity-30">
          {Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={i} 
              className={`w-1 rounded-t transition-all duration-200 ${isPowered ? 'bg-green-400' : 'bg-zinc-700'}`}
              style={{ 
                height: isPowered ? `${Math.random() * 80 + (state.isReceiving || state.isTransmitting ? 20 : 5)}%` : '10%'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RadioDisplay;
