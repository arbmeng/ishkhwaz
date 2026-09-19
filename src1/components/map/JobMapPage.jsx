import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { soundService } from '../../services/soundService';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import {
  MapPin, Building2, X, CheckCircle2, Layers,
  ZoomIn, ZoomOut, Sparkles, Send, Briefcase, Search,
  Filter, Navigation, Signal, ChevronLeft, ChevronRight,
  Loader2, BadgeCheck, SlidersHorizontal, LocateFixed, Eye
} from 'lucide-react';

// Haversine distance in km between two lat/lng points
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const KURDISH_RE = /[؀-ۿ]/;

// ── Kurdistan precise coordinates ──────────────────────────────────
const CITY_ANCHORS = {
  'سلێمانی':   { lat: 35.5565, lng: 45.4370, zoom: 13 },
  'هەولێر':    { lat: 36.1911, lng: 44.0091, zoom: 13 },
  'دهۆک':      { lat: 36.8679, lng: 42.9880, zoom: 13 },
  'کەرکووک':   { lat: 35.4681, lng: 44.3922, zoom: 13 },
  'هەڵەبجە':   { lat: 35.1778, lng: 45.9861, zoom: 13 },
  'کەلار':     { lat: 34.6178, lng: 45.3119, zoom: 14 },
  'زاخۆ':      { lat: 37.1461, lng: 42.6847, zoom: 13 },
  'عەنکاوە':   { lat: 36.2281, lng: 43.9961, zoom: 14 },
  'بازیان':    { lat: 35.6028, lng: 45.1481, zoom: 14 },
  'چەمچەماڵ':  { lat: 35.5311, lng: 44.8322, zoom: 14 },
  'ئاکرێ':     { lat: 36.7425, lng: 43.8933, zoom: 14 },
  'کۆیە':      { lat: 36.0825, lng: 44.6278, zoom: 14 },
  'ڕانیە':     { lat: 36.2547, lng: 44.8822, zoom: 14 },
  'شەقڵاوە':   { lat: 36.4007, lng: 44.3283, zoom: 14 },
  'سوران':     { lat: 36.5419, lng: 44.5467, zoom: 14 },
  'پەنجوین':   { lat: 35.6217, lng: 45.9475, zoom: 14 },
};

const GOV_ID_TO_CITY = {
  sulaymaniyah: 'سلێمانی', erbil: 'هەولێر', duhok: 'دهۆک',
  kirkuk: 'کەرکووک', halabja: 'هەڵەبجە',
  garmian: 'سلێمانی', garmyan: 'سلێمانی', germiyan: 'سلێمانی',
};

function resolveJobCityName(job) {
  const govId = String(job.governorate_id || job.governorateId || '').toLowerCase();
  if (GOV_ID_TO_CITY[govId]) return GOV_ID_TO_CITY[govId];
  const loc = String(job.location || job.city || '');
  const direct = Object.keys(CITY_ANCHORS).find(name => loc.includes(name) || name.includes(loc.split(' ')[0]));
  return direct || null;
}

function stableJitter(id) {
  const str = String(id || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  const angle  = (hash % 360) * (Math.PI / 180);
  const radius = 0.005 + ((hash % 100) / 100) * 0.010;
  return { dLat: Math.sin(angle) * radius, dLng: Math.cos(angle) * radius };
}

const TOWN_ANCHORS = {
  'بازیان':          { lat: 35.6028, lng: 45.1481, gov: 'سلێمانی' },
  'bazyan':          { lat: 35.6028, lng: 45.1481, gov: 'سلێمانی' },
  'چەمچەماڵ':        { lat: 35.5311, lng: 44.8322, gov: 'سلێمانی' },
  'chamchamal':      { lat: 35.5311, lng: 44.8322, gov: 'سلێمانی' },
  'chemchamal':      { lat: 35.5311, lng: 44.8322, gov: 'سلێمانی' },
  'ڕانیە':           { lat: 36.2547, lng: 44.8822, gov: 'سلێمانی' },
  'ranya':           { lat: 36.2547, lng: 44.8822, gov: 'سلێمانی' },
  'raniye':          { lat: 36.2547, lng: 44.8822, gov: 'سلێمانی' },
  'کۆیە':            { lat: 36.0825, lng: 44.6278, gov: 'سلێمانی' },
  'koya':            { lat: 36.0825, lng: 44.6278, gov: 'سلێمانی' },
  'koi sanjaq':      { lat: 36.0825, lng: 44.6278, gov: 'سلێمانی' },
  'پەنجوین':         { lat: 35.6217, lng: 45.9475, gov: 'سلێمانی' },
  'penjween':        { lat: 35.6217, lng: 45.9475, gov: 'سلێمانی' },
  'penjwin':         { lat: 35.6217, lng: 45.9475, gov: 'سلێمانی' },
  'شەقڵاوە':         { lat: 36.4007, lng: 44.3283, gov: 'هەولێر' },
  'shaqlawa':        { lat: 36.4007, lng: 44.3283, gov: 'هەولێر' },
  'ئەنکاوە':         { lat: 36.2281, lng: 43.9961, gov: 'هەولێر' },
  'ankawa':          { lat: 36.2281, lng: 43.9961, gov: 'هەولێر' },
  'ainkawa':         { lat: 36.2281, lng: 43.9961, gov: 'هەولێر' },
  'سوران':           { lat: 36.5419, lng: 44.5467, gov: 'هەولێر' },
  'soran':           { lat: 36.5419, lng: 44.5467, gov: 'هەولێر' },
  'ئاکرێ':           { lat: 36.7425, lng: 43.8933, gov: 'هەولێر' },
  'akre':            { lat: 36.7425, lng: 43.8933, gov: 'هەولێر' },
  'زاخۆ':            { lat: 37.1461, lng: 42.6847, gov: 'دهۆک' },
  'zakho':           { lat: 37.1461, lng: 42.6847, gov: 'دهۆک' },
};

const TOWN_PROXIMITY_DEG = 0.12;

function resolveJobTownName(job) {
  const haystack = [
    String(job.location_name  || '').toLowerCase(),
    String(job.location_detail|| '').toLowerCase(),
    String(job.subDistrict    || job.sub_district || '').toLowerCase(),
    String(job.location       || '').toLowerCase(),
  ].join(' ');

  const allKeys = Object.keys(TOWN_ANCHORS);
  const kurdishKeys = allKeys.filter(k => KURDISH_RE.test(k));

  for (const key of kurdishKeys) if (haystack.includes(key.toLowerCase())) return key;
  for (const key of allKeys)     if (haystack.includes(key.toLowerCase())) return key;

  if (typeof job.lat === 'number' && typeof job.lng === 'number' &&
      Math.abs(job.lat) > 0.001 && Math.abs(job.lng) > 0.001) {
    let nearest = null, minDist = Infinity;
    for (const key of kurdishKeys) {
      const c = TOWN_ANCHORS[key];
      const d = Math.hypot(job.lat - c.lat, job.lng - c.lng);
      if (d < minDist && d < TOWN_PROXIMITY_DEG) { minDist = d; nearest = key; }
    }
    if (nearest) return nearest;
  }
  return null;
}

function resolveJobDisplayLabel(job) {
  const townName = resolveJobTownName(job);
  if (townName) return townName;

  const raw = String(job.location_name || job.location_detail || '').trim();
  if (raw) {
    const segments = raw.split(',').map(s => s.trim()).filter(Boolean);
    const pick = segments.find(s => KURDISH_RE.test(s)) || segments[0];
    if (pick) return pick.length > 22 ? pick.slice(0, 22) + '…' : pick;
  }
  return resolveJobCityName(job) || 'کوردستان';
}

function resolveJobCoords(job) {
  if (typeof job.lat === 'number' && typeof job.lng === 'number' &&
      Math.abs(job.lat) > 0.001 && Math.abs(job.lng) > 0.001) {
    return { lat: job.lat, lng: job.lng, precise: true };
  }

  const townName = resolveJobTownName(job);
  if (townName && TOWN_ANCHORS[townName]) {
    const coords = TOWN_ANCHORS[townName];
    const { dLat, dLng } = stableJitter(job.id);
    return { lat: coords.lat + dLat * 0.3, lng: coords.lng + dLng * 0.3, precise: false };
  }

  const cityName = resolveJobCityName(job);
  const base = (cityName && CITY_ANCHORS[cityName]) || CITY_ANCHORS['سلێمانی'];
  const { dLat, dLng } = stableJitter(job.id);
  return { lat: base.lat + dLat, lng: base.lng + dLng, precise: false };
}

const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
    label: 'تاریک',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    label: 'ستالایت',
  },
  streets: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB Voyager',
    label: 'شەقام',
  },
};

// ── SVG marker Generators ─────────────────────────────────────────
function cityMarkerHtml(name, count, isSelected) {
  const border = isSelected ? '#a3e635' : '#a3e635';
  const bg     = isSelected ? '#1a2e05' : '#0f172a';
  return `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 8px 20px rgba(0,0,0,0.6));">
      <div style="background:${bg};border:2px solid ${border};border-radius:20px;padding:5px 12px;display:flex;align-items:center;gap:7px;white-space:nowrap;font-family:Vazirmatn,sans-serif;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#a3e635"/>
        </svg>
        <span style="color:white;font-size:12px;font-weight:900;">${name}</span>
        <span style="background:#a3e635;color:#0f172a;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:900;">${count}</span>
      </div>
      <svg width="14" height="8" viewBox="0 0 14 8" style="margin-top:-1px">
        <polygon points="7,8 0,0 14,0" fill="${border}"/>
      </svg>
    </div>`;
}

function jobMarkerHtml(company, title, salary, precise, logo) {
  const shortCompany = company.length > 18 ? company.slice(0, 18) + '…' : company;
  const shortTitle   = title.length   > 22 ? title.slice(0, 22)   + '…' : title;
  const borderColor  = precise ? '#a3e635' : 'rgba(251,191,36,0.55)';
  const borderStyle  = precise ? 'solid' : 'dashed';
  const avatar = logo
    ? `<img src="${logo}" style="width:28px;height:28px;border-radius:8px;object-fit:cover;border:1px solid rgba(163,230,53,0.3);flex-shrink:0;" />`
    : `<div style="width:28px;height:28px;border-radius:8px;background:rgba(163,230,53,0.12);border:1px solid rgba(163,230,53,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/></svg>
      </div>`;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.7));transition:transform 0.2s ease;">
      <div style="position:relative;background:#0f172a;border:1.5px ${borderStyle} ${borderColor};border-radius:14px;padding:6px 12px 6px 8px;display:flex;align-items:center;gap:8px;white-space:nowrap;font-family:Vazirmatn,sans-serif;max-width:240px;">
        ${precise ? `<div style="position:absolute;top:-5px;left:-5px;width:11px;height:11px;border-radius:50%;background:#a3e635;border:2px solid #0f172a;box-shadow:0 0 6px rgba(163,230,53,0.8);"></div>` : ''}
        ${avatar}
        <div style="display:flex;flex-direction:column;gap:1px;min-width:0;">
          <div style="color:#a3e635;font-size:9px;font-weight:900;letter-spacing:0.5px;">${shortCompany}</div>
          <div style="color:white;font-size:11px;font-weight:900;">${shortTitle}</div>
          ${salary ? `<div style="color:#94a3b8;font-size:9px;font-weight:700;">${salary}</div>` : ''}
        </div>
      </div>
      <svg width="14" height="8" viewBox="0 0 14 8" style="margin-top:-1px">
        <polygon points="7,8 0,0 14,0" fill="${borderColor === '#a3e635' ? '#a3e635' : '#fbbf24'}"/>
      </svg>
    </div>`;
}

function compactJobMarkerHtml(locName, precise) {
  const borderColor = precise ? '#a3e635' : 'rgba(251,191,36,0.55)';
  const borderStyle = precise ? 'solid' : 'dashed';
  return `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 6px 16px rgba(0,0,0,0.6));">
      <div style="background:#0f172a;border:1.5px ${borderStyle} ${borderColor};border-radius:20px;padding:5px 12px;display:flex;align-items:center;gap:6px;white-space:nowrap;font-family:Vazirmatn,sans-serif;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${borderColor === '#a3e635' ? '#a3e635' : '#fbbf24'}"/>
        </svg>
        <span style="color:white;font-size:11px;font-weight:800;">${locName}</span>
      </div>
      <svg width="12" height="7" viewBox="0 0 12 7" style="margin-top:-1px">
        <polygon points="6,7 0,0 12,0" fill="${borderColor === '#a3e635' ? '#a3e635' : '#fbbf24'}"/>
      </svg>
    </div>`;
}

function buildJobIcon(zoom, { company, title, salary, precise, logo, loc }) {
  if (zoom >= 14) {
    return window.L.divIcon({
      className: '', html: jobMarkerHtml(company, title, salary, precise, logo),
      iconSize: [200, 60], iconAnchor: [100, 60],
    });
  }
  return window.L.divIcon({
    className: '', html: compactJobMarkerHtml(loc, precise),
    iconSize: [140, 40], iconAnchor: [70, 40],
  });
}

function userMarkerHtml() {
  return `
    <div style="position:relative;width:60px;height:60px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:60px;height:60px;border-radius:50%;background:rgba(163,230,53,0.12);border:1.5px solid rgba(163,230,53,0.35);animation:ping 2s infinite ease-out;"></div>
      <div style="position:absolute;width:54px;height:54px;border-radius:50%;background:rgba(163,230,53,0.05);"></div>
      <div style="width:18px;height:18px;border-radius:50%;background:#a3e635;border:3px solid white;box-shadow:0 0 16px rgba(163,230,53,0.9);z-index:10;"></div>
    </div>`;
}

// ──────────────────────────────────────────────────────────────────
export const JobMapPage = () => {
  const { jobs = [], applications = [], submitCVApplication } = useStore();
  const { openAuthModal, user } = useAuth();

  const mapContainerRef   = useRef(null);
  const mapInstanceRef    = useRef(null);
  const clusterGroupRef   = useRef(null);
  const userMarkerRef     = useRef(null);
  const accuracyCircleRef = useRef(null);
  const tileLayerRef      = useRef(null);

  const [selectedCity, setSelectedCity]         = useState(null);
  const [activeJob, setActiveJob]               = useState(null);
  const [zoomLevel, setZoomLevel]               = useState(9);
  const [mapLayer, setMapLayer]                 = useState('dark');
  const [isLocating, setIsLocating]             = useState(false);
  const [gpsAccuracy, setGpsAccuracy]           = useState(null);
  const [searchQuery, setSearchQuery]           = useState('');
  const [isMapReady, setIsMapReady]             = useState(false);
  const [userLatLng, setUserLatLng]             = useState(null);
  const [confirmApplyJob, setConfirmApplyJob]   = useState(null);
  const [isSendingCv, setIsSendingCv]           = useState(false);
  const [appliedJobIds, setAppliedJobIds]       = useState([]);
  
  // Advanced Filter Options
  const [onlyPrecise, setOnlyPrecise]           = useState(false);
  const [maxDistanceKm, setMaxDistanceKm]       = useState(100);
  const [showFilterPanel, setShowFilterPanel]   = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const validJobs = useMemo(() => Array.isArray(jobs) ? jobs.filter(Boolean) : [], [jobs]);

  // City list with job count computation
  const citiesWithJobs = useMemo(() => {
    return Object.entries(CITY_ANCHORS).map(([name, coords]) => ({
      name,
      ...coords,
      count: validJobs.filter(j => resolveJobCityName(j) === name).length,
    })).filter(c => c.count > 0);
  }, [validJobs]);

  // Filter jobs based on User Criteria
  const filteredJobs = useMemo(() => {
    return validJobs.filter((job) => {
      // Precise location filter
      if (onlyPrecise) {
        const { precise } = resolveJobCoords(job);
        if (!precise) return false;
      }

      // Text Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = String(job.title_ku || job.title || '').toLowerCase();
        const company = String(job.company_name || job.company || '').toLowerCase();
        const loc = String(job.location_name || job.location_detail || '').toLowerCase();
        if (!title.includes(q) && !company.includes(q) && !loc.includes(q)) return false;
      }

      // Distance Filter
      if (userLatLng && maxDistanceKm < 100) {
        const coords = resolveJobCoords(job);
        const dist = distanceKm(userLatLng.lat, userLatLng.lng, coords.lat, coords.lng);
        if (dist > maxDistanceKm) return false;
      }

      return true;
    });
  }, [validJobs, onlyPrecise, searchQuery, userLatLng, maxDistanceKm]);

  // ── GPS locate ────────────────────────────────────────────────
  const locateUser = useCallback(() => {
    soundService.playTick?.();
    setIsLocating(true);
    if (!('geolocation' in navigator)) {
      setIsLocating(false);
      alert('جی پی ئێس لەلایەن وێبگەڕەکەتەوە پشتیوانی ناکرێت');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));
        setUserLatLng({ lat, lng });
        if (!mapInstanceRef.current || !window.L) { setIsLocating(false); return; }

        mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.8 });

        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng([lat, lng]).setRadius(accuracy);
        } else {
          accuracyCircleRef.current = window.L.circle([lat, lng], {
            radius: accuracy, color: '#a3e635', fillColor: '#a3e635',
            fillOpacity: 0.08, weight: 1.5,
          }).addTo(mapInstanceRef.current);
        }

        const icon = window.L.divIcon({ className: '', html: userMarkerHtml(), iconSize: [60, 60], iconAnchor: [30, 30] });
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
        } else {
          userMarkerRef.current = window.L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
        }
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation Error:', err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // ── Rebuild markers ───────────────────────────────────────────
  const rebuildMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.L || !clusterGroupRef.current) return;
    const map  = mapInstanceRef.current;
    const zoom = map.getZoom();

    clusterGroupRef.current.clearLayers();

    filteredJobs.forEach((job) => {
      const { lat, lng, precise } = resolveJobCoords(job);
      const loc = resolveJobDisplayLabel(job);

      const company = String(job.company_name || job.companyName || job.company || 'کۆمپانیا');
      const title   = String(job.title_ku || job.title || job.name || 'هەڵی کار');
      const salary  = job.salary_min ? `${Number(job.salary_min).toLocaleString()} IQD` : '';
      const logo    = job.company_logo || '';
      const jobMeta = { company, title, salary, precise, logo, loc };

      const marker = window.L.marker([lat, lng], { icon: buildJobIcon(zoom, jobMeta) });
      marker.locLabel = loc;
      marker._jobMeta = jobMeta;
      marker.on('click', () => {
        soundService.playTick?.();
        setActiveJob({ ...job, _lat: lat, _lng: lng, _company: company, _title: title, _salary: salary, _loc: loc, _precise: precise });
        map.flyTo([lat, lng], 16, { duration: 1.0 });
      });
      clusterGroupRef.current.addLayer(marker);
    });
  }, [filteredJobs]);

  const refreshJobIcons = useCallback(() => {
    if (!mapInstanceRef.current || !window.L || !clusterGroupRef.current) return;
    const zoom = mapInstanceRef.current.getZoom();
    clusterGroupRef.current.eachLayer((marker) => {
      if (!marker._jobMeta) return;
      marker.setIcon(buildJobIcon(zoom, marker._jobMeta));
    });
  }, []);

  // ── Init Leaflet ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('markercluster-css')) {
      const link = document.createElement('link');
      link.id = 'markercluster-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
      document.head.appendChild(link);
    }

    const init = () => {
      if (!mounted || !window.L || !window.L.markerClusterGroup || !mapContainerRef.current) return;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); }

      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        minZoom: 7,
        maxZoom: 19,
        maxBounds: window.L.latLngBounds([33.5, 41.5], [38.5, 47.0]),
        maxBoundsViscosity: 0.85,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 90,
        fadeAnimation: true,
        markerZoomAnimation: true,
        inertia: true,
      }).setView([36.0, 44.2], 9);

      mapInstanceRef.current = map;
      const tile = TILE_LAYERS.dark;
      tileLayerRef.current = window.L.tileLayer(tile.url, { maxZoom: 19, attribution: tile.attribution }).addTo(map);

      window.L.control.attribution({ prefix: '🗺️ Ishkhwaz Maps' }).addTo(map);

      const clusterGroup = window.L.markerClusterGroup({
        maxClusterRadius: 70,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (cluster) => {
          const children = cluster.getAllChildMarkers();
          const freq = {};
          children.forEach(m => { const l = m.locLabel || 'کوردستان'; freq[l] = (freq[l] || 0) + 1; });
          const label = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
          return window.L.divIcon({
            className: '',
            html: cityMarkerHtml(label, children.length, false),
            iconSize: [160, 52], iconAnchor: [80, 52],
          });
        },
      });
      clusterGroup.on('clusterclick', () => soundService.playTick?.());
      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;

      map.on('zoomend', () => { setZoomLevel(map.getZoom()); refreshJobIcons(); });
      map.on('load', () => setIsMapReady(true));
      setTimeout(() => { setIsMapReady(true); rebuildMarkers(); }, 500);
    };

    if (window.L && window.L.markerClusterGroup) {
      init();
    } else {
      const loadMarkerCluster = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
        s2.onload = init;
        document.head.appendChild(s2);
      };
      if (window.L) {
        loadMarkerCluster();
      } else {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = loadMarkerCluster;
        document.head.appendChild(s);
      }
    }

    return () => {
      mounted = false;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, []);

  useEffect(() => { if (isMapReady) rebuildMarkers(); }, [filteredJobs, isMapReady, rebuildMarkers]);

  const switchLayer = (key) => {
    if (!mapInstanceRef.current || !window.L) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();
    const t = TILE_LAYERS[key];
    tileLayerRef.current = window.L.tileLayer(t.url, { maxZoom: 19, attribution: t.attribution }).addTo(mapInstanceRef.current);
    setMapLayer(key);
    soundService.playTick?.();
  };

  const flyToCity = (name) => {
    soundService.playTick?.();
    setSelectedCity(name === selectedCity ? null : name);
    const c = CITY_ANCHORS[name];
    if (c && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([c.lat, c.lng], c.zoom, { duration: 1.3 });
    }
  };

  const cityJobs = useMemo(() => {
    if (!selectedCity) return filteredJobs;
    return filteredJobs.filter(j => resolveJobCityName(j) === selectedCity);
  }, [filteredJobs, selectedCity]);

  return (
    <div dir="rtl" className="w-full h-full relative overflow-hidden bg-slate-950 font-vazirmatn select-none pb-[72px] md:pb-0">

      {/* ── TOP CONTROL BAR ── */}
      <div className="absolute top-3 right-3 left-3 z-[500] flex flex-wrap items-center gap-2 pointer-events-auto">

        {/* Location Button */}
        <button onClick={locateUser} disabled={isLocating}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border shadow-lg transition-all ${
            isLocating
              ? 'bg-lime-500/20 border-lime-500/40 text-lime-400 cursor-wait'
              : 'bg-lime-400 border-lime-300 text-slate-950 hover:bg-lime-300 active:scale-95'
          }`}>
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'ئەدۆزێتەوە...' : 'شوێنم'}</span>
          {gpsAccuracy && !isLocating && <span className="text-[9px] opacity-60">±{gpsAccuracy}m</span>}
        </button>

        {/* Filter Toggle Button */}
        <button onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border backdrop-blur-md transition-all ${
            showFilterPanel || onlyPrecise || maxDistanceKm < 100
              ? 'bg-lime-400/20 border-lime-400/50 text-lime-400'
              : 'bg-black/60 border-white/10 text-white/70 hover:text-white'
          }`}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>فلتەرەکان</span>
        </button>

        {/* Search input field */}
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="گەڕان بۆ کار یان کۆمپانیا..."
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-lime-400/50 backdrop-blur-md pl-8"
          />
          {searchQuery ? (
            <X onClick={() => setSearchQuery('')} className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 cursor-pointer hover:text-white" />
          ) : (
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          )}
        </div>

        {/* City Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 py-0.5">
          {citiesWithJobs.map(city => (
            <button key={city.name} onClick={() => flyToCity(city.name)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold shrink-0 border transition-all ${
                selectedCity === city.name
                  ? 'bg-lime-400/15 border-lime-400/40 text-lime-400 shadow-lg shadow-lime-500/10'
                  : 'bg-black/50 border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/80 backdrop-blur-md'
              }`}>
              <MapPin className="w-3 h-3 shrink-0" />
              {city.name}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${selectedCity === city.name ? 'bg-lime-400/20 text-lime-400' : 'bg-white/5 text-white/30'}`}>
                {city.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ADVANCED FILTER EXPANDABLE POPUP ── */}
      {showFilterPanel && (
        <div className="absolute top-16 right-3 left-3 sm:left-auto sm:w-80 z-[501] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-lime-400" /> فلتەرکردنی پێشکەوتوو
            </span>
            <X className="w-4 h-4 text-white/40 cursor-pointer hover:text-white" onClick={() => setShowFilterPanel(false)} />
          </div>

          {/* Toggle Precise Location Only */}
          <label className="flex items-center justify-between cursor-pointer text-xs text-white/80">
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5 text-lime-400" /> تەنها شوێنی بێ هەڵە (وردبین)
            </span>
            <input
              type="checkbox"
              checked={onlyPrecise}
              onChange={(e) => setOnlyPrecise(e.target.checked)}
              className="accent-lime-400 rounded cursor-pointer"
            />
          </label>

          {/* Distance Filter Slider (if GPS active) */}
          {userLatLng && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-white/70">
                <span>دووری (ڕادیۆس):</span>
                <span className="font-mono text-lime-400">{maxDistanceKm === 100 ? 'هەمووی' : `${maxDistanceKm} کم`}</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="w-full accent-lime-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
              />
            </div>
          )}
        </div>
      )}

      {/* ── LAYER SWITCHER (top left) ── */}
      <div className="absolute left-3 z-[500] flex flex-col gap-1 pointer-events-auto" style={{ top: 'calc(0.75rem + 52px)' }}>
        <div className="bg-black/70 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
          {Object.entries(TILE_LAYERS).map(([key, layer]) => (
            <button key={key} onClick={() => switchLayer(key)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-[11px] font-bold transition-all ${
                mapLayer === key ? 'bg-lime-400/15 text-lime-400' : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
              }`}>
              <Layers className="w-3.5 h-3.5" />
              {layer.label}
            </button>
          ))}
        </div>

        <div className="bg-black/70 backdrop-blur-xl border border-white/[0.08] rounded-xl px-3 py-2 shadow-xl space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lime-400 shrink-0" style={{ boxShadow: '0 0 4px rgba(163,230,53,0.8)' }} />
            <span className="text-[10px] font-bold text-white/60">شوێنی وردبن</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-dashed border-amber-400/70 shrink-0" />
            <span className="text-[10px] font-bold text-white/40">نزیکەی ناوچە</span>
          </div>
        </div>
      </div>

      {/* ── MAP CANVAS ── */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* ── CUSTOM ZOOM CONTROLS ── */}
      <div className="absolute bottom-24 left-3 z-[500] flex flex-col gap-1 pointer-events-auto">
        <button onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-9 h-9 rounded-xl bg-black/70 border border-white/[0.08] text-white/50 hover:text-white flex items-center justify-center backdrop-blur-md transition-colors shadow-lg">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-9 h-9 rounded-xl bg-black/70 border border-white/[0.08] text-white/50 hover:text-white flex items-center justify-center backdrop-blur-md transition-colors shadow-lg">
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* ── SIDEBAR LIST PANEL (desktop/tablet) ── */}
      <div className={`absolute top-20 right-3 bottom-6 z-[500] w-80 transition-all duration-300 pointer-events-auto ${sidebarCollapsed ? 'translate-x-[340px]' : 'translate-x-0'}`}>
        <div className="bg-black/85 backdrop-blur-2xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
            <div>
              <div className="text-xs font-black text-white/80">{selectedCity ? selectedCity : 'هەموو کارەکان'}</div>
              <div className="text-[10px] text-lime-400/80 font-mono">{cityJobs.length} هەلی کار دۆزرایەوە</div>
            </div>
            <button onClick={() => setSidebarCollapsed(true)} className="text-white/30 hover:text-white p-1 rounded-lg bg-white/5">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-2 scrollbar-none">
            {cityJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/30">هیچ کارێک بەم فلتەرانە نەدۆزرایەوە</div>
            ) : (
              cityJobs.map(job => (
                <button key={job.id}
                  onClick={() => {
                    soundService.playTick?.();
                    const { lat: jLat, lng: jLng, precise } = resolveJobCoords(job);
                    setActiveJob({
                      ...job,
                      _company: job.company_name || 'کۆمپانیا',
                      _title: job.title_ku || job.title || 'کار',
                      _salary: job.salary_min ? `${Number(job.salary_min).toLocaleString()} IQD` : '',
                      _loc: resolveJobDisplayLabel(job),
                      _precise: precise,
                      _lat: jLat, _lng: jLng,
                    });
                    mapInstanceRef.current?.flyTo([jLat, jLng], 16, { duration: 1.2 });
                  }}
                  className={`w-full text-right border rounded-xl p-3 transition-all ${
                    activeJob?.id === job.id
                      ? 'bg-lime-400/10 border-lime-400/40 shadow-lg'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05]'
                  }`}>
                  <div className="text-xs font-black text-white/80 truncate">{job.title_ku || job.title || 'کار'}</div>
                  <div className="text-[10px] text-white/40 truncate mt-0.5">{job.company_name || 'کۆمپانیا'}</div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
                    <span className="text-[9px] text-white/30 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-lime-400/60" /> {resolveJobDisplayLabel(job)}
                    </span>
                    {job.salary_min && (
                      <span className="text-[9px] font-mono text-lime-400 font-bold">{Number(job.salary_min).toLocaleString()} IQD</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toggle Open Sidebar Handle */}
      {sidebarCollapsed && (
        <button onClick={() => setSidebarCollapsed(false)} className="absolute top-20 right-3 z-[500] p-2.5 rounded-xl bg-black/80 border border-white/10 text-lime-400 backdrop-blur-md shadow-2xl pointer-events-auto">
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* ── JOB DETAIL BOTTOM SHEET ── */}
      {activeJob && (
        <div className="absolute bottom-4 right-3 left-3 sm:left-auto sm:right-4 sm:max-w-sm z-[600] pointer-events-auto animate-in slide-in-from-bottom-5">
          <div className="bg-[#0d1117]/95 backdrop-blur-2xl border border-lime-400/15 rounded-2xl shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(163,230,53,0.08)' }}>

            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.05] flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {activeJob.company_logo ? (
                  <img src={activeJob.company_logo} alt="" className="w-9 h-9 rounded-xl object-cover border border-lime-400/20 shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-lime-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[10px] text-lime-400/70 font-bold truncate">{activeJob._company}</div>
                  <div className="text-sm font-black text-white/80 truncate">{activeJob._title}</div>
                </div>
              </div>
              <button onClick={() => setActiveJob(null)} className="text-white/20 hover:text-white/60 transition-colors shrink-0 mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Details */}
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] font-bold bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-white/45">
                  <MapPin className="w-3 h-3 text-lime-400/50" />{activeJob._loc}
                </span>
                {activeJob._salary && (
                  <span className="flex items-center gap-1 text-[10px] font-black bg-lime-400/8 border border-lime-400/15 rounded-lg px-2.5 py-1.5 text-lime-400">
                    {activeJob._salary} / مانگ
                  </span>
                )}
                {activeJob._precise ? (
                  <span className="flex items-center gap-1 text-[10px] font-black bg-lime-400/8 border border-lime-400/15 rounded-lg px-2.5 py-1.5 text-lime-400">
                    <BadgeCheck className="w-3 h-3" />شوێنی وردبن
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-400/8 border border-amber-400/15 rounded-lg px-2.5 py-1.5 text-amber-400/80">
                    نزیکەی ئەم ناوچەیە
                  </span>
                )}
                {userLatLng && (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-sky-400/8 border border-sky-400/15 rounded-lg px-2.5 py-1.5 text-sky-400">
                    <Navigation className="w-3 h-3" />
                    {distanceKm(userLatLng.lat, userLatLng.lng, activeJob._lat, activeJob._lng).toFixed(1)} کم دوورە
                  </span>
                )}
              </div>

              {activeJob.description && (
                <p className="text-[11px] text-white/35 leading-relaxed line-clamp-2">{activeJob.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex gap-2">
              <button onClick={() => setActiveJob(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/40 text-xs font-bold hover:bg-white/[0.07] transition-all">
                داخستن
              </button>
              {(() => {
                const alreadyApplied = appliedJobIds.includes(activeJob.id) ||
                  applications.some(a => String(a.job_id) === String(activeJob.id));
                return (
                  <button
                    disabled={alreadyApplied || isSendingCv}
                    onClick={() => {
                      if (!user) { openAuthModal?.('freelancer', 'login'); return; }
                      soundService.playTick?.();
                      setConfirmApplyJob(activeJob);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-60"
                    style={{ background: alreadyApplied ? 'rgba(163,230,53,0.12)' : 'linear-gradient(135deg, #a3e635, #65a30d)', color: alreadyApplied ? '#a3e635' : '#0d1117' }}>
                    {isSendingCv
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : alreadyApplied
                        ? <><CheckCircle2 className="w-3.5 h-3.5" />نێردراوە</>
                        : <><Send className="w-3.5 h-3.5" />ناردنی سیڤی</>}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Send-CV Confirmation Modal ── */}
      <ConfirmationModal
        isOpen={!!confirmApplyJob}
        title="ناردنی سیڤی"
        message={confirmApplyJob ? `سیڤیەکەت ڕاستەوخۆ دەچێتە بەردەست کۆمپانیای "${confirmApplyJob._company}" بۆ هەلی "${confirmApplyJob._title}".` : ''}
        confirmText="بینێرە"
        cancelText="پاشگەزبوونەوە"
        onCancel={() => setConfirmApplyJob(null)}
        onConfirm={async () => {
          const job = confirmApplyJob;
          setConfirmApplyJob(null);
          setIsSendingCv(true);
          const ok = await submitCVApplication({
            job_id: job.id,
            job_title: job._title,
            company_name: job._company,
          });
          if (ok) {
            soundService.playSuccess?.();
            setAppliedJobIds(prev => [...prev, job.id]);
          }
          setIsSendingCv(false);
        }}
      />

      {/* ── GPS Accuracy Indicator Footer ── */}
      {gpsAccuracy && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 border border-lime-400/20 backdrop-blur-md pointer-events-none">
          <Signal className="w-3 h-3 text-lime-400" />
          <span className="text-[10px] font-mono text-lime-400/80">GPS ±{gpsAccuracy}m</span>
        </div>
      )}
    </div>
  );
};