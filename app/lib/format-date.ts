export function formatTodayLabel(date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
