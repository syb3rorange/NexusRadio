
import React from 'react';
import { RadioState, RadioMode, ConnectionStatus } from '../types';

interface Props {
  state: RadioState;
  onPttDown: () => void;
  onPttUp: () => void;
  onModeToggle: () => void;
  onFreqChange: () => void;
  onVolumeChange: (v: number) => void;
  onPowerToggle: () => void;
}

const Controls: React.FC<Props> = ({ state, onPttDown, onPttUp, onModeToggle, onFreqChange, onVolumeChange, onPowerToggle }) => {
  const isOnline = state.status !== ConnectionStatus.DISCONNECTED;

  return (
    <div className="grid grid-cols-2 gap-10 items-center">
      
      {/* Secondary Controls (Left) */}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onFreqChange}
            className="btn-tactical py-4 rounded-2xl border border-zinc-700/30 flex flex-col items-center gap-1 group"
          >
            <span className="text-[9px] text-zinc-500 font-black group-active:text-zinc-300">CHANNEL</span>
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-active:bg-green-500" />
          </button>
          <button 
            onClick={onModeToggle}
            className="btn-tactical py-4 rounded-2xl border border-zinc-700/30 flex flex-col items-center gap-1 group"
          >
            <span className="text-[9px] text-zinc-500 font-black group-active:text-zinc-300">PTT/OPEN</span>
            <div className={`w-1.5 h-1.5 rounded-full ${state.mode === RadioMode.OPEN ? 'bg-orange-500' : 'bg-zinc-700'}`} />
          </button>
        </div>

        {/* Volume Potentiometer Visualization */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-black px-1 uppercase tracking-tighter">
            <span>Audio Gain</span>
            <span className={isOnline ? 'text-green-500' : ''}>{state.volume}</span>
          </div>
          <div className="relative h-2 bg-black rounded-full overflow-hidden border border-zinc-800 shadow-inner">
             <input 
              type="range" 
              min="0" 
              max="100" 
              value={state.volume} 
              onChange={(e) => onVolumeChange(parseInt(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className={`h-full transition-all duration-300 ${isOnline ? 'bg-green-600' : 'bg-zinc-800'}`}
              style={{ width: `${state.volume}%` }}
            />
          </div>
        </div>

        {/* Power / System Switch */}
        <button 
          onClick={onPowerToggle}
          className={`btn-tactical py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
            isOnline ? 'border-green-500/30 text-green-500' : 'border-zinc-800 text-zinc-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest">{isOnline ? 'ONLINE' : 'POWER'}</span>
        </button>
      </div>

      {/* Main PTT Button (Right) */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* External Guard Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-zinc-950 -m-3 shadow-2xl" />
          
          <button
            onMouseDown={onPttDown}
            onMouseUp={onPttUp}
            onMouseLeave={onPttUp}
            onTouchStart={(e) => { e.preventDefault(); onPttDown(); }}
            onTouchEnd={(e) => { e.preventDefault(); onPttUp(); }}
            disabled={!isOnline}
            className={`w-36 h-36 rounded-full border-[10px] border-zinc-900 flex flex-col items-center justify-center transition-all duration-75 relative z-10 ${
              state.isTransmitting 
              ? 'ptt-active scale-95 border-red-900' 
              : 'bg-[#1a1c20] hover:bg-[#202226] active:scale-95 shadow-[8px_8px_16px_#000,-4px_-4px_8px_#333] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <div className={`font-black text-2xl tracking-tighter transition-colors ${state.isTransmitting ? 'text-white' : 'text-zinc-600'}`}>
              {state.isTransmitting ? 'LIVE' : 'TALK'}
            </div>
            <div className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${state.isTransmitting ? 'text-red-200' : 'text-zinc-700'}`}>
              Push To Transmit
            </div>
            
            {/* Textured Surface Indicator */}
            <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />
          </button>
        </div>
        <div className="mt-8 text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] opacity-40">COMM-LINK MODULE</div>
      </div>
    </div>
  );
};

export default Controls;
