import React, { useState } from 'react';
import { soundService } from '../../services/soundService';
import { Volume2, VolumeX } from 'lucide-react';

export const SoundToggle = () => {
  const [enabled, setEnabled] = useState(soundService.isEnabled);

  const handleToggle = () => {
    const newState = soundService.toggleSound();
    setEnabled(newState);
    if (newState) {
      soundService.playTick();
    }
  };

  return (
    <button
      onClick={handleToggle}
      title={enabled ? 'دەنگ بەکارە (Sound ON)' : 'دەنگ ناچالاکە (Sound OFF)'}
      className={`p-2 rounded-xl border transition-all duration-200 flex items-center justify-center ${
        enabled
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
      }`}
    >
      {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
    </button>
  );
};
