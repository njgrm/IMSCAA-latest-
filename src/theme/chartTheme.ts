export const chartTheme = (isDark: boolean) => ({
  mode: isDark ? "dark" as const : "light" as const,
  text: isDark ? "#d1d5db" : "#4b5563",
  title: isDark ? "#f3f4f6" : "#374151",
  grid: isDark ? "#374151" : "#e5e7eb",
  stroke: isDark ? "#374151" : "#ffffff",
  tooltip: isDark ? "dark" as const : "light" as const,
});
