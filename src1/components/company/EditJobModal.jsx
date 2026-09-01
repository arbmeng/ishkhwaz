import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../context/StoreContext';
import { compressImageFile } from '../../utils/image';
import { soundService } from '../../services/soundService';
import { X, Sparkles, Upload, Save, Loader2, Camera, MapPin, Search, Crosshair, CheckCircle2 } from 'lucide-react';

const GOVS = [
  { id: 'sulaymaniyah', name: 'سلێمانی', lat: 35.5565, lng: 45.4370 },
  { id: 'erbil',        name: 'هەولێر',  lat: 36.1911, lng: 44.0091 },
  { id: 'duhok',        name: 'دهۆک',    lat: 36.8679, lng: 42.9880 },
  { id: 'kirkuk',       name: 'کەرکووک', lat: 35.4681, lng: 44.3922 },
  { id: 'halabja',      name: 'هەڵەبجە', lat: 35.1778, lng: 45.9861 },
];

// ── Nominatim geocoding helper ─────────────────────────────────────
async function nominatimSearch(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=iq&accept-language=ku,ar,en`;
  const r = await fetch(url, { headers: { 'Accept-Language': 'ku,ar,en' } });
  return r.json();
}

export const EditJobModal = ({ isOpen, onClose, job }) => {
  const { categories = [], updateJob, addToast } = useStore();

  const [titleKu, setTitleKu]           = useState('');
  const [photo, setPhoto]               = useState('');
  const [category, setCategory]         = useState('');
  const [jobType, setJobType]           = useState('fullTime');
  const [workplaceType, setWorkplaceType] = useState('onSite');
  const [governorateId, setGovernorateId] = useState('sulaymaniyah');
  const [locationDetail, setLocationDetail] = useState('');
  const [salaryMin, setSalaryMin]       = useState('600000');
  const [salaryMax, setSalaryMax]       = useState('1200000');
  const [description, setDescription]   = useState('');
  const [skillsInput, setSkillsInput]   = useState('');
  const [deadline, setDeadline]         = useState('');
  const [isSaving, setIsSaving]         = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Location — precise GPS pin
  const [pinLat,       setPinLat]       = useState(null);
  const [pinLng,       setPinLng]       = useState(null);
  const [locationName, setLocationName] = useState('');
  const [mapSearchQ,   setMapSearchQ]   = useState('');
  const [mapResults,   setMapResults]   = useState([]);
  const [isSearching,  setIsSearching]  = useState(false);
  const [isLocating,   setIsLocating]   = useState(false);

  const mapRef    = useRef(null);
  const mapInst   = useRef(null);
  const pinMarker = useRef(null);

  useEffect(() => {
    if (job) {
      setTitleKu(job.title_ku || job.title || '');
      setPhoto(job.company_logo || '');
      setCategory(job.category || '');
      setJobType(job.job_type || 'fullTime');
      setWorkplaceType(job.workplace_type || 'onSite');
      setGovernorateId(job.governorate_id || 'sulaymaniyah');
      setLocationDetail(job.location_detail || '');
      setSalaryMin(String(job.salary_min || 600000));
      setSalaryMax(String(job.salary_max || 1200000));
      setDescription(job.description || '');
      setDeadline(job.deadline || '');
      setPinLat(typeof job.lat === 'number' && Math.abs(job.lat) > 0.001 ? job.lat : null);
      setPinLng(typeof job.lng === 'number' && Math.abs(job.lng) > 0.001 ? job.lng : null);
      setLocationName(job.location_name || '');

      const raw = job.required_skills;
      const skillsArr = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw || '[]'); } catch { return []; } })();
      setSkillsInput(skillsArr.join(', '));
    }
  }, [job]);

  // ── Pin drop with a soft bounce-in animation ─────────────────────
  const dropPin = (map, lat, lng, name = '') => {
    const icon = window.L.divIcon({
      className: '',
      html: `<div class="ishkhwaz-edit-pin" style="
        width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:linear-gradient(135deg,#a3e635,#65a30d);
        border:3px solid white;box-shadow:0 6px 20px rgba(0,0,0,0.5);
      "></div>`,
      iconSize: [36, 36], iconAnchor: [18, 36],
    });
    if (pinMarker.current) pinMarker.current.remove();
    pinMarker.current = window.L.marker([lat, lng], { icon }).addTo(map);
    setPinLat(lat); setPinLng(lng);
    if (name) setLocationName(name);
  };

  // ── Init Leaflet map whenever the modal opens ─────────────────────
  useEffect(() => {
    if (!isOpen || !job) return;
    let mounted = true;

    const loadMap = () => {
      if (!mounted || !mapRef.current || !window.L || mapInst.current) return;

      const govCoords = GOVS.find(g => g.id === (job.governorate_id || 'sulaymaniyah')) || GOVS[0];
      const startLat  = pinLat || govCoords.lat;
      const startLng  = pinLng || govCoords.lng;

      const map = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        fadeAnimation: true,
        markerZoomAnimation: true,
        inertia: true,
      }).setView([startLat, startLng], pinLat ? 15 : 13);

      window.L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      ).addTo(map);

      window.L.control.zoom({ position: 'bottomleft' }).addTo(map);

      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        dropPin(map, lat, lng);
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ku,ar,en`
          );
          const d = await r.json();
          if (d.display_name) {
            const parts = d.display_name.split(',').slice(0, 3).join(', ');
            setLocationName(parts);
          }
        } catch {}
      });

      if (pinLat && pinLng) dropPin(map, pinLat, pinLng, locationName);

      mapInst.current = map;
      setTimeout(() => map.invalidateSize(), 80);
    };

    if (!document.getElementById('leaflet-css')) {
      const l = document.createElement('link');
      l.id = 'leaflet-css'; l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }

    if (window.L) { loadMap(); }
    else if (!document.getElementById('leaflet-js')) {
      const s = document.createElement('script');
      s.id = 'leaflet-js';
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = loadMap;
      document.head.appendChild(s);
    } else {
      document.getElementById('leaflet-js').addEventListener('load', loadMap, { once: true });
    }

    return () => {
      mounted = false;
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
      pinMarker.current = null;
    };
  }, [isOpen, job?.id]);

  // ── GPS locate ─────────────────────────────────────────────────
  const locateMe = () => {
    setIsLocating(true);
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (mapInst.current) {
          mapInst.current.flyTo([lat, lng], 16, { duration: 1.2 });
          dropPin(mapInst.current, lat, lng);
        } else {
          setPinLat(lat); setPinLng(lng);
        }
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const d = await r.json();
          if (d.display_name) setLocationName(d.display_name.split(',').slice(0,3).join(', '));
        } catch {}
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  };

  // ── Geocode search ─────────────────────────────────────────────
  const geocodeSearch = async () => {
    if (!mapSearchQ.trim()) return;
    setIsSearching(true);
    try {
      const results = await nominatimSearch(mapSearchQ + ', كردستان');
      setMapResults(results);
    } catch {}
    setIsSearching(false);
  };

  const selectGeocodeResult = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const name = r.display_name.split(',').slice(0, 3).join(', ');
    setLocationName(name);
    if (mapInst.current) {
      mapInst.current.flyTo([lat, lng], 16, { duration: 1.2 });
      dropPin(mapInst.current, lat, lng, name);
    } else {
      setPinLat(lat); setPinLng(lng);
    }
    setMapResults([]);
    setMapSearchQ('');
  };

  if (!isOpen || !job) return null;

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const compressed = await compressImageFile(file, 700, 0.8);
      setPhoto(compressed);
    } catch {
      addToast?.({ title: 'کێشە', message: 'وێنە بار نەکرا', type: 'error' });
    }
    setIsUploadingPhoto(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    soundService.playTick();

    if (!titleKu.trim()) {
      addToast?.({ title: 'زانیاری نەکافی', message: 'تکایە نازناوی کارەکە بنووسە.', type: 'warning' });
      return;
    }
    if (!description.trim()) {
      addToast?.({ title: 'زانیاری نەکافی', message: 'تکایە وەسفی کارەکە بنووسە.', type: 'warning' });
      return;
    }

    setIsSaving(true);
    const skillsArray = skillsInput.split(',').map(s => s.trim()).filter(Boolean);

    const ok = await updateJob(job.id, {
      title_ku: titleKu.trim(),
      company_logo: photo,
      category,
      job_type: jobType,
      workplace_type: workplaceType,
      governorate_id: governorateId,
      location_detail: locationDetail.trim(),
      lat: pinLat,
      lng: pinLng,
      location_name: locationName,
      salary_min: Number(salaryMin) || 0,
      salary_max: Number(salaryMax) || 0,
      description: description.trim(),
      required_skills: skillsArray,
      deadline: deadline || null,
    });
    setIsSaving(false);
    if (ok) onClose();
  };

  const inputCls = "w-full bg-white border border-slate-200 focus:border-lime-500 focus:ring-2 focus:ring-lime-100 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all";
  const labelCls = "block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto font-vazirmatn">

      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white border border-slate-200 rounded-3xl shadow-2xl my-auto text-right overflow-hidden select-none">

        <button
          onClick={() => { soundService.playTick(); onClose(); }}
          className="absolute top-4 left-4 text-slate-500 hover:text-slate-900 p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-6 pb-4 border-b border-slate-200 relative z-10 shrink-0 bg-white">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-50 border border-lime-200 text-lime-800 text-xs font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-lime-600" />
            <span>دەستکاریکردنی ڕاگەیاندنی کار</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">گۆڕانکاری لە هەلی کار (Edit Job)</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 relative z-10">

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Job Photo */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
              {photo ? (
                <img src={photo} alt="Job" className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <Camera className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="space-y-1">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition">
                  {isUploadingPhoto ? <Loader2 className="w-4 h-4 text-lime-600 animate-spin" /> : <Upload className="w-4 h-4 text-lime-600" />}
                  <span>{photo ? 'گۆڕینی وێنە' : 'زیادکردنی وێنەی کار'}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" disabled={isUploadingPhoto} />
                </label>
              </div>
            </div>

            {/* Job Title */}
            <div>
              <label className={labelCls}>نازناوی کار *</label>
              <input
                type="text"
                required
                value={titleKu}
                onChange={(e) => setTitleKu(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Category & Job type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>بوار / پۆلێن</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputCls}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name_ku}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>جۆری دەوام</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className={inputCls}
                >
                  <option value="fullTime">دەوامی تەواو</option>
                  <option value="partTime">دەوامی پارچە</option>
                  <option value="contract">قەرارداد</option>
                  <option value="internship">ستاژ</option>
                  <option value="remote">کاتی ئازاد</option>
                </select>
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>پارێزگا</label>
                <select
                  value={governorateId}
                  onChange={(e) => setGovernorateId(e.target.value)}
                  className={inputCls}
                >
                  {GOVS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>شێوەی شوێنی کارکردن</label>
                <select
                  value={workplaceType}
                  onChange={(e) => setWorkplaceType(e.target.value)}
                  className={inputCls}
                >
                  <option value="onSite">لەسەر شوێن</option>
                  <option value="remote">کاتی ئازاد</option>
                  <option value="hybrid">تێکەڵ</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>وردەکاری ناونیشان</label>
              <input
                type="text"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Precise location picker — pin drop / search / GPS */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-lime-600" />شوێنی وردی کارەکە لەسەر نەخشە
                </label>
                {pinLat && pinLng && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-lime-700">
                    <CheckCircle2 className="w-3 h-3" />وردبینانە
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={mapSearchQ}
                  onChange={(e) => setMapSearchQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); geocodeSearch(); } }}
                  placeholder="گەڕان بۆ ناونیشان..."
                  className="flex-1 bg-white border border-slate-200 focus:border-lime-500 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none"
                />
                <button type="button" onClick={geocodeSearch} disabled={isSearching}
                  className="px-3.5 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-black shrink-0 hover:bg-sky-400 transition-all disabled:opacity-50">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              {mapResults.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  {mapResults.map((r, i) => (
                    <button key={i} type="button" onClick={() => selectGeocodeResult(r)}
                      className="w-full text-right px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-lime-50 hover:text-lime-800 border-b border-slate-100 last:border-0 transition-colors flex items-start gap-2 bg-white">
                      <MapPin className="w-3.5 h-3.5 text-lime-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}

              <button type="button" onClick={locateMe} disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-lime-50 border border-lime-200 text-lime-800 text-xs font-bold hover:bg-lime-100 transition-all disabled:opacity-50">
                {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                {isLocating ? 'ئەدۆزێتەوە...' : 'بەکارهێنانی شوێنی ئێستام (GPS)'}
              </button>

              <style>{`
                @keyframes ishkhwazEditPinDrop { 0% { transform: rotate(-45deg) scale(0) translateY(-14px); opacity: 0; } 60% { transform: rotate(-45deg) scale(1.15) translateY(0); opacity: 1; } 100% { transform: rotate(-45deg) scale(1) translateY(0); } }
                .ishkhwaz-edit-pin { animation: ishkhwazEditPinDrop 0.45s cubic-bezier(.34,1.56,.64,1); }
              `}</style>
              <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 220 }} />

              {pinLat && pinLng ? (
                <div className="flex items-center gap-2 text-[11px] text-lime-700 font-bold bg-lime-50 border border-lime-200 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-lime-600" />
                  <span className="font-mono">{pinLat.toFixed(5)}, {pinLng.toFixed(5)}</span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">کلیک لەسەر نەخشە بکە بۆ دانانی پێنی وردی شوێنی کارەکە — بەبێ ئەمە، ئیشەکە لەسەر نەخشە بە شوێنی نزیک نیشان دەدرێت.</p>
              )}
            </div>

            {/* Salary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>کەمترین مووچە (IQD)</label>
                <input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className={inputCls + ' font-mono'}
                />
              </div>

              <div>
                <label className={labelCls}>زیاترین مووچە (IQD)</label>
                <input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className={inputCls + ' font-mono'}
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className={labelCls}>دوا وادەی پێشکەشکردن</label>
              <input
                type="date"
                value={deadline || ''}
                onChange={(e) => setDeadline(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Skills & Description */}
            <div>
              <label className={labelCls}>بەهرەکان (کۆما بۆ جیاکردنەوە)</label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>وەسفی کار *</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls + ' resize-none'}
              />
            </div>

            {/* Footer Submit */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
              >
                داخستن
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #a3e635, #65a30d)' }}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'پاشەکەوتکردن...' : 'پاشەکەوتکردنی گۆڕانکارییەکان'}</span>
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>,
    document.body
  );
};
