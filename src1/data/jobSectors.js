// What kind of employer a job is posted under. Stored on jobs.sector (ids must match JOB_SECTORS in index.php).
export const JOB_SECTORS = [
  { id: 'government', label: 'حکوومی' },
  { id: 'private', label: 'تایبەت' },
  { id: 'commercial', label: 'بازرگانی' },
  { id: 'ngo', label: 'ڕێکخراو' },
  { id: 'mixed', label: 'تێکەڵ' },
];

export const sectorLabel = (id) => JOB_SECTORS.find(s => s.id === id)?.label || '';
