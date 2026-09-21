import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Crosshair, Loader2, CheckCircle2 } from 'lucide-react';
import { GOVERNORATE_COORDS } from '../../data/governorateCoords';

// Real pin-drop location picker — search an address (Nominatim/OpenStreetMap),
// click the map, or use GPS. Same technique EditJobModal.jsx already uses
// live for editing a job's location; extracted here (teal-themed to match
// PostJobPage) so creating a NEW job gets the identical precise-location
// feature instead of only governorate/district dropdowns.
export default function JobLocationPicker({ lat, lng, locationName, governorateId, onChange, height = 220 }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const pinMarker = useRef(null);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [ready, setReady] = useState(false);

  const dropPin = (map, latVal, lngVal, name) => {
    const icon = window.L.divIcon({
      className: '',
      html: `<div style="
        width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:linear-gradient(135deg,#aa80ec,#641bd9);
        border:3px solid white;box-shadow:0 6px 16px rgba(0,0,0,0.35);
      "></div>`,
      iconSize: [34, 34], iconAnchor: [17, 34],
    });
    if (pinMarker.current) pinMarker.current.remove();
    pinMarker.current = window.L.marker([latVal, lngVal], { icon }).addTo(map);
    onChange?.({ lat: latVal, lng: lngVal, locationName: name });
  };

  const reverseGeocode = async (latVal, lngVal) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latVal}&lon=${lngVal}&format=json&accept-language=ku,ar,en`);
      const d = await r.json();
      if (d.display_name) return d.display_name.split(',').slice(0, 3).join('، ');
    } catch { /* keep whatever name we already had */ }
    return undefined;
  };

  useEffect(() => {
    let mounted = true;

    const init = () => {
      if (!mounted || !mapRef.current || !window.L || mapInst.current) return;
      const start = lat && lng ? { lat, lng } : (GOVERNORATE_COORDS[governorateId] || GOVERNORATE_COORDS.sulaymaniyah);

      const map = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
      }).setView([start.lat, start.lng], lat && lng ? 15 : 12);
      mapInst.current = map;

      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
      window.L.control.zoom({ position: 'bottomleft' }).addTo(map);

      map.on('click', async (e) => {
        const { lat: clat, lng: clng } = e.latlng;
        dropPin(map, clat, clng, undefined);
        const name = await reverseGeocode(clat, clng);
        if (name) onChange?.({ lat: clat, lng: clng, locationName: name });
      });

      if (lat && lng) dropPin(map, lat, lng, locationName);
      setReady(true);
      setTimeout(() => map.invalidateSize(), 80);
    };

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (window.L) {
      init();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = init;
      document.head.appendChild(script);
    }

    return () => {
      mounted = false;
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
      pinMarker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInst.current) {
          mapInst.current.flyTo([latitude, longitude], 16, { duration: 1 });
          dropPin(mapInst.current, latitude, longitude, undefined);
        }
        const name = await reverseGeocode(latitude, longitude);
        onChange?.({ lat: latitude, lng: longitude, locationName: name });
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  };

  const geocodeSearch = async () => {
    if (!searchQ.trim()) return;
    setIsSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQ + '، کوردستان')}&format=json&limit=6&countrycodes=iq&accept-language=ku,ar,en`;
      const r = await fetch(url, { headers: { 'Accept-Language': 'ku,ar,en' } });
      setResults(await r.json());
    } catch { /* leave results empty */ }
    setIsSearching(false);
  };

  const selectResult = (r) => {
    const latVal = parseFloat(r.lat);
    const lngVal = parseFloat(r.lon);
    const name = r.display_name.split(',').slice(0, 3).join('، ');
    if (mapInst.current) {
      mapInst.current.flyTo([latVal, lngVal], 16, { duration: 1 });
      dropPin(mapInst.current, latVal, lngVal, name);
    }
    setResults([]);
    setSearchQ('');
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); geocodeSearch(); } }}
          placeholder="گەڕان بۆ ناونیشان..."
          className="flex-1 bg-[#f5f4f7] border border-[#eae8ee] rounded-xl px-3 py-2.5 text-xs font-bold text-[#16111d] outline-none focus:border-[#641bd9]"
        />
        <button
          type="button"
          onClick={geocodeSearch}
          disabled={isSearching}
          className="px-3.5 py-2.5 rounded-xl bg-[#641bd9] text-white text-xs font-black shrink-0 hover:bg-[#4b13a5] transition disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {results.length > 0 && (
        <div className="rounded-xl border border-[#eae8ee] overflow-hidden shadow-sm">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectResult(r)}
              className="w-full text-right px-3 py-2.5 text-xs font-bold text-[#4a5854] hover:bg-[#eeeaf5] hover:text-[#641bd9] border-b border-[#f5f4f7] last:border-0 transition-colors flex items-start gap-2 bg-white"
            >
              <MapPin className="w-3.5 h-3.5 text-[#641bd9] shrink-0 mt-0.5" />
              <span className="line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative rounded-2xl overflow-hidden border border-[#eae8ee]" style={{ height }}>
        <div ref={mapRef} className="w-full h-full" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f4f7] text-[#7b8e88] text-[11px] font-bold">
            نەخشە بارئەکرێت...
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={locateMe}
        disabled={isLocating}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#eeeaf5] border border-[#cfbded] text-[#641bd9] text-xs font-bold hover:bg-[#e1d8f0] transition disabled:opacity-50"
      >
        {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
        {isLocating ? 'ئەدۆزرێتەوە...' : 'بەکارهێنانی شوێنی ئێستام (GPS)'}
      </button>

      {lat && lng && (
        <div className="flex items-center gap-1.5 text-[10px] text-[#641bd9] font-bold justify-end">
          <CheckCircle2 className="w-3 h-3" />
          <span>شوێن دیاریکرا{locationName ? `: ${locationName}` : ''}</span>
        </div>
      )}
    </div>
  );
}
