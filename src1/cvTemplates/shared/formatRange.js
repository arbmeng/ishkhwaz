import { formatMonthYear } from '../../utils/dates.js';

export const formatRange = (startDate, endDate, current, presentLabel) => {
  const start = formatMonthYear(startDate);
  const end = current ? presentLabel : formatMonthYear(endDate);
  if (!start && !end) return '';
  if (!end) return start;
  return `${start} — ${end}`;
};
