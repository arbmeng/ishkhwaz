export const formatMonthYear = (isoString) => {
  if (!isoString) return '';
  const [year, month] = isoString.split('-');
  if (!month) return isoString;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(month) - 1] || month} ${year}`;
};
