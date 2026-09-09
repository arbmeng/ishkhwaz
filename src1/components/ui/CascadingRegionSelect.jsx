import React, { useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { MapPin, Check, RefreshCw, Compass } from 'lucide-react';

export const CascadingRegionSelect = ({
  selectedGov,
  setSelectedGov,
  selectedDist,
  setSelectedDist,
  selectedSubDist,
  setSelectedSubDist,
  className = ''
}) => {
  const { regions = [] } = useStore();

  const currentGov = useMemo(() => {
    return (regions || []).find(g => g.id === selectedGov) || null;
  }, [regions, selectedGov]);

  const availableDistricts = useMemo(() => {
    return currentGov ? (currentGov.districts || []) : [];
  }, [currentGov]);

  const currentDist = useMemo(() => {
    return availableDistricts.find(d => d.id === selectedDist) || null;
  }, [availableDistricts, selectedDist]);

  const availableSubDistricts = useMemo(() => {
    return currentDist ? (currentDist.subDistricts || []) : [];
  }, [currentDist]);

  const handleGovSelect = (e, govId) => {
    if (e) e.preventDefault();
    soundService.playTick();
    if (selectedGov === govId) {
      setSelectedGov('');
      setSelectedDist('');
      setSelectedSubDist('');
    } else {
      setSelectedGov(govId);
      setSelectedDist('');
      setSelectedSubDist('');
    }
  };

  const handleDistSelect = (e, distId) => {
    if (e) e.preventDefault();
    soundService.playTick();
    if (selectedDist === distId) {
      setSelectedDist('');
      setSelectedSubDist('');
    } else {
      setSelectedDist(distId);
      setSelectedSubDist('');
    }
  };

  const handleSubDistSelect = (e, subId) => {
    if (e) e.preventDefault();
    soundService.playTick();
    if (selectedSubDist === subId) {
      setSelectedSubDist('');
    } else {
      setSelectedSubDist(subId);
    }
  };

  const handleReset = (e) => {
    if (e) e.preventDefault();
    soundService.playTick();
    setSelectedGov('');
    setSelectedDist('');
    setSelectedSubDist('');
  };

  return (
    <div className={`space-y-4 text-right font-vazirmatn select-none ${className}`}>

      {/* 1. LEVEL 1: شار (City / Governorate) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black text-lime-400 flex items-center gap-1.5 justify-end">
            <span>١. هەڵبژاردنی شار</span>
            <MapPin className="w-4 h-4 text-lime-400" />
          </label>
          {selectedGov && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-lime-400 hover:underline font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>سڕینەوەی فلتەری شوێن</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={(e) => handleGovSelect(e, '')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 ${!selectedGov
                ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-lg shadow-lime-500/20 font-black'
                : 'bg-[#090a0c] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
          >
            هەموو کوردستان
          </button>

          {(regions || []).map(gov => {
            const isSelected = selectedGov === gov.id;
            return (
              <button
                key={gov.id}
                type="button"
                onClick={(e) => handleGovSelect(e, gov.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${isSelected
                    ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-lg shadow-lime-500/20 font-black'
                    : 'bg-[#090a0c] border-slate-800 text-slate-300 hover:border-lime-400/40'
                  }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-slate-950" />}
                <span>{gov.name_ku}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. LEVEL 2: قەزا (District) */}
      {selectedGov && availableDistricts.length > 0 && (
        <div className="pt-3 border-t border-slate-800 animate-slide-up">
          <label className="block text-xs font-black text-slate-200 mb-2">
            ٢. هەڵبژاردنی قەزا ({currentGov?.name_ku}):
          </label>
          <div className="flex flex-wrap gap-2 justify-end">
            {availableDistricts.map(dist => {
              const isSelected = selectedDist === dist.id;
              return (
                <button
                  key={dist.id}
                  type="button"
                  onClick={(e) => handleDistSelect(e, dist.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${isSelected
                      ? 'bg-lime-400/20 border-lime-400 text-lime-300 shadow-md font-black'
                      : 'bg-[#090a0c] border-slate-800 text-slate-300 hover:text-white'
                    }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-lime-400" />}
                  <span>{dist.name_ku}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. LEVEL 3: ناحیە (Sub-district) */}
      {selectedDist && availableSubDistricts.length > 0 && (
        <div className="pt-3 border-t border-slate-800 animate-slide-up">
          <label className="block text-xs font-black text-slate-200 mb-2">
            ٣. هەڵبژاردنی ناحیە ({currentDist?.name_ku}):
          </label>
          <div className="flex flex-wrap gap-2 justify-end">
            {availableSubDistricts.map(sub => {
              const isSelected = selectedSubDist === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={(e) => handleSubDistSelect(e, sub.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${isSelected
                      ? 'bg-lime-400/20 border-lime-400 text-lime-300 shadow-md font-black'
                      : 'bg-[#090a0c] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-lime-400" />}
                  <span>{sub.name_ku}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Location Summary Badge */}
      {(selectedGov || selectedDist || selectedSubDist) && (
        <div className="mt-3 text-xs font-bold text-lime-300 bg-[#090a0c] p-3 rounded-2xl border border-lime-400/40 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span>
              فلتەری چالاك: <strong className="text-white">{currentGov?.name_ku || ''}</strong> {currentDist ? `← ${currentDist.name_ku}` : ''} {selectedSubDist ? `← ${availableSubDistricts.find(s => s.id === selectedSubDist)?.name_ku}` : ''}
            </span>
            <Compass className="w-4 h-4 text-lime-400" />
          </div>
        </div>
      )}

    </div>
  );
};
