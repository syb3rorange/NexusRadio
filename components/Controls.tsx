
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
  return (
    <div className="grid grid-cols-2 gap-8 items-center">
      
      {/* Left Column: Knobs & Toggles */}
      <div className="flex flex-col gap-6">
        {/* Mode & Freq Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={onFreqChange}
            className="flex-1 bg-zinc-900 border-b-4 border-black hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0 p-3 rounded-xl transition-all shadow-lg group"
          >
            <span className="text-[10px] text-zinc-500 font-bold group-active:text-green-500">CHAN</span>
          </button>
          <button 
            onClick={onModeToggle}
            className="flex-1 bg-zinc-900 border-b-4 border-black hover:translate-y-[2px] hover:border-b-2 active:translate-y-[4px] active:border-b-0 p-3 rounded-xl transition-all shadow-lg group"
          >
            <span className="text-[10px] text-zinc-500 font-bold group-active:text-green-500">MODE</span>
          </button>
        </div>

        {/* Volume Slider Knob Representation */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold px-1">
            <span>VOL</span>
            <span>{state.volume}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={state.volume} 
            onChange={(e) => onVolumeChange(parseInt(e.target.value))}
            className="w-full accent-green-600 bg-zinc-900 rounded-lg cursor-pointer"
          />
        </div>

        {/* Power Button */}
        <button 
          onClick={onPowerToggle}
          className={`p-4 rounded-2xl border-4 transition-all shadow-xl font-bold flex flex-col items-center justify-center gap-1 ${
            state.status === ConnectionStatus.DISCONNECTED 
            ? 'bg-zinc-900 border-zinc-800 text-zinc-600' 
            : 'bg-green-600/10 border-green-500/50 text-green-500'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[8px] uppercase tracking-tighter">{state.status === ConnectionStatus.DISCONNECTED ? 'Power On' : 'Online'}</span>
        </button>
      </div>

      {/* Right Column: Large PTT Button */}
      <div className="flex flex-col items-center">
        <button
          onMouseDown={onPttDown}
          onMouseUp={onPttUp}
          onMouseLeave={onPttUp}
          onTouchStart={(e) => { e.preventDefault(); onPttDown(); }}
          onTouchEnd={(e) => { e.preventDefault(); onPttUp(); }}
          className={`w-32 h-32 rounded-full border-8 transition-all flex flex-col items-center justify-center shadow-2xl ${
            state.isTransmitting 
            ? 'bg-red-600 border-red-500 scale-95 shadow-red-500/20' 
            : 'bg-zinc-900 border-zinc-800 hover:scale-105 active:scale-95'
          }`}
        >
          <div className="text-zinc-600 font-black text-xl uppercase tracking-tighter">
            {state.isTransmitting ? 'LIVE' : 'TALK'}
          </div>
          <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">
            {state.mode === RadioMode.PTT ? 'Push' : 'Open'}
          </div>
        </button>
        <div className="mt-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Transmit Control</div>
      </div>
    </div>
  );
};

export default Controls;
