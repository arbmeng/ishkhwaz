// Approximate governorate-center coordinates, reused from the same vetted
// anchors JobMapPage.jsx already uses to place job markers (CITY_ANCHORS) —
// kept as a small standalone file so a location picker can default its map
// view without importing a whole page component.
export const GOVERNORATE_COORDS = {
  sulaymaniyah: { lat: 35.5565, lng: 45.4370 },
  erbil: { lat: 36.1911, lng: 44.0091 },
  duhok: { lat: 36.8679, lng: 42.9880 },
  kirkuk: { lat: 35.4681, lng: 44.3922 },
  halabja: { lat: 35.1778, lng: 45.9861 },
};
