// "How many freelancers this job needs" as a short Kurdish label for job cards.
export const positionsInfo = (job) => {
  const positions = Math.max(1, Number(job?.positions) || 1);
  const hired = Math.max(0, Number(job?.hired_count) || 0);
  const full = hired >= positions;
  const label = full ? 'ژمارەی پێویست تەواو بوو' : hired > 0 ? `${hired}/${positions} کارخواز وەرگیراوە` : `${positions} کارخواز پێویستە`;
  return { positions, hired, full, label };
};
