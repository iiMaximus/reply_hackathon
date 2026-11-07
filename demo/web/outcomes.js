export function accuracy(items) {
  let correct = 0,
    assessed = 0;
  for (const item of items) {
    if (item?.verdict === "correct") correct++;
    if (item?.verdict === "correct" || item?.verdict === "incorrect")
      assessed++;
  }
  return {
    correct,
    assessed,
    percent: assessed ? Math.round((100 * correct) / assessed) : null,
  };
}
