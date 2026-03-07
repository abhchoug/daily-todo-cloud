export function pad(number) {
  return String(number).padStart(2, "0");
}

export function getDateKey(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function formatDayHeader(year, month, day) {
  const shortMonth = new Intl.DateTimeFormat("en", { month: "short" }).format(
    new Date(year, month)
  );
  return `${day}-${shortMonth}-${String(year).slice(-2)}`;
}

export function createPlaceholder(dateKey) {
  return { id: `placeholder-${dateKey}`, text: "", checked: false, placeholder: true };
}

export function withPlaceholder(tasks, dateKey) {
  const hasPlaceholder = tasks.some((task) => task.placeholder);
  return hasPlaceholder ? tasks : [...tasks, createPlaceholder(dateKey)];
}
