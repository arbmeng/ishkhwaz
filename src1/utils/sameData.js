// State setters for polled data: keep the previous object when the new payload is
// identical, so a background sync that found nothing new doesn't re-render (and
// remount things under) every page that reads that state.
export const keepIfSame = (prev, next) => {
  try { return JSON.stringify(prev) === JSON.stringify(next) ? prev : next; }
  catch { return next; }
};
