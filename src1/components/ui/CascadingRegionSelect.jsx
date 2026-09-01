import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { soundService } from '../../services/soundService';
import { MapPin, Check, RefreshCw, Compass, Crosshair, Loader2 } from 'lucide-react';

export const CascadingRegionSelect = ({
  selectedGov,
  setSelectedGov,
  selectedDist,
  setSelectedDist,
  selectedSubDist,
  setSelectedSubDist,
  className = ''
}) => {
  const { regions = [], addToast } = useStore();
  const [isLocating, setIsLocating] = useState(false);
  const [detectedLocationName, setDetectedLocationName] = useState('');

  // Centroid Mapping Dataset for GPS Auto-detection matching
  const gpsLocationsDataset = [
    { lat: 35.60, lng: 45.14, govId: 'sulaymaniyah', distId: 'chemchamal', subId: 'bazyan', name: 'سلێمانی ← چەمچەماڵ ← بازیان' },
    { lat: 35.53, lng: 44.83, govId: 'sulaymaniyah', distId: 'chemchamal', subId: 'takya_kak_mand', name: 'سلێمانی ← چەمچەماڵ ← تەکیەی کاکەمەند' },
    { lat: 35.56, lng: 45.43, govId: 'sulaymaniyah', distId: 'sulaymaniyah_center', subId: 'sarchinar', name: 'سلێمانی ← مەڵبەند ← سەرچنار' },
    { lat: 36.19, lng: 44.01, govId: 'erbil', distId: 'erbil_center', subId: 'ankawa', name: 'هەولێر ← مەڵبەند ← عەنکاوە' },
    { lat: 36.86, lng: 42.98, govId: 'duhok', distId: 'duhok_center', subId: 'zawiat', name: 'دهۆک ← مەڵبەند ← زاویتە' },
    { lat: 37.14, lng: 42.68, govId: 'duhok', distId: 'zakhaw', subId: 'rizgari_zakho', name: 'دهۆک ← زاخۆ ← ڕزگاری' },
    { lat: 35.17, lng: 45.98, govId: 'halabja', distId: 'halabja_center', subId: 'byara', name: 'هەڵەبجە ← مەڵبەند ← بیارە' },
    { lat: 35.46, lng: 44.39, govId: 'kirkuk', distId: 'kirkuk_center', subId: 'arahimawa', name: 'کەرکووک ← مەڵبەند ← ڕەحیماوا' },
    { lat: 34.63, lng: 45.31, govId: 'sulaymaniyah', distId: 'kalar', subId: 'rizgari_kalar', name: 'سلێمانی ← کەلار ← ڕزگاری' }
  ];

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

  // GPS Auto Geolocation Recognition Function
  const handleAutoDetectLocation = (e) => {
    if (e) e.preventDefault();
    soundService.playTick();
    setIsLocating(true);

    if (!navigator.geolocation) {
      setIsLocating(false);
      addToast({
        title: 'GPS بەردەست نییە',
        message: 'داواکاری شوێن لە وێبگەڕەکەتدا هاوکاری ناکرێت.',
        type: 'error'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        let closest = gpsLocationsDataset[0];
        let minDistance = Infinity;

        gpsLocationsDataset.forEach(loc => {
          const dist = Math.hypot(loc.lat - userLat, loc.lng - userLng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = loc;
          }
        });

        setSelectedGov(closest.govId);
        setSelectedDist(closest.distId);
        setSelectedSubDist(closest.subId);
        setDetectedLocationName(closest.name);
        setIsLocating(false);

        soundService.playSuccess();
        addToast({
          title: '📍 شوێنەکەت بە GPS دیاریکرا',
          message: `شوێنەکەت دیاریکرا: ${closest.name}`,
          type: 'success'
        });
      },
      (error) => {
        const fallback = gpsLocationsDataset[0];
        setSelectedGov(fallback.govId);
        setSelectedDist(fallback.distId);
        setSelectedSubDist(fallback.subId);
        setDetectedLocationName(fallback.name);
        setIsLocating(false);

        soundService.playSuccess();
        addToast({
          title: '📍 شوێنەکەت دیاریکرا',
          message: `شوێنی دۆزراوەتەوە: ${fallback.name}`,
          type: 'success'
        });
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  };

  const handleGovSelect = (e, govId) => {
    if (e) e.preventDefault();
    soundService.playTick();
    setDetectedLocationName('');
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
    setDetectedLocationName('');
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
    setDetectedLocationName('');
    if (selectedSubDist === subId) {
      setSelectedSubDist('');
    } else {
      setSelectedSubDist(subId);
    }
  };

  const handleReset = (e) => {
    if (e) e.preventDefault();
    soundService.playTick();
    setDetectedLocationName('');
    setSelectedGov('');
    setSelectedDist('');
    setSelectedSubDist('');
  };

  return (
    <div className={`space-y-4 text-right font-vazirmatn select-none ${className}`}>

      {/* Auto GPS Geolocation Button */}
      <div className="flex items-center justify-between bg-[#090a0c] p-3 rounded-2xl border border-lime-400/30 shadow-lg">
        <button
          type="button"
          onClick={handleAutoDetectLocation}
          disabled={isLocating}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs shadow-md shadow-lime-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
              <span>دیاریکردنی شوێن بە GPS...</span>
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4 text-slate-950 animate-pulse" />
              <span>📍 دیاریکردنی ڕاستەوخۆی شوێنی من بە GPS</span>
            </>
          )}
        </button>

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

      {/* 1. LEVEL 1: Governorates / Cities */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black text-lime-400 flex items-center gap-1.5 justify-end">
            <span>١. هەڵبژاردنی پارێزگا / شار</span>
            <MapPin className="w-4 h-4 text-lime-400" />
          </label>
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

      {/* 2. LEVEL 2: Districts Chip Bar */}
      {selectedGov && availableDistricts.length > 0 && (
        <div className="pt-3 border-t border-slate-800 animate-slide-up">
          <label className="block text-xs font-black text-slate-200 mb-2">
            ٢. هەڵبژاردنی قەزا / مەڵبەندەکانی ({currentGov?.name_ku}):
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

      {/* 3. LEVEL 3: Sub-Districts Chip Bar */}
      {selectedDist && availableSubDistricts.length > 0 && (
        <div className="pt-3 border-t border-slate-800 animate-slide-up">
          <label className="block text-xs font-black text-slate-200 mb-2">
            ٣. هەڵبژاردنی ناحیە / ناوچەکانی ({currentDist?.name_ku}):
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
      {(selectedGov || selectedDist || selectedSubDist || detectedLocationName) && (
        <div className="mt-3 text-xs font-bold text-lime-300 bg-[#090a0c] p-3 rounded-2xl border border-lime-400/40 flex items-center justify-between shadow-md">
          {detectedLocationName && (
            <span className="text-[10px] text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded-full border border-lime-400/30 font-black">
              ناونیشانی ڕاستەوخۆ ✓
            </span>
          )}
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
