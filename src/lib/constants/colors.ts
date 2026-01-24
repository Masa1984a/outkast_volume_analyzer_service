// Dark mode colors
export const CHART_COLORS_DARK = {
  top1: '#B8FF00',    // Lime Green (Main)
  top2: '#00D9A0',    // Emerald
  top3: '#00C8FF',    // Cyan
  top4: '#A855F7',    // Purple
  top5: '#FF6B6B',    // Coral
  others: '#6B7280',  // Medium Gray
  custom: '#A855F7',  // Purple (Custom wallet)
  uniqueWallets: '#B8FF00', // Lime Green for line
  background: '#0F0F0F',    // Dark Black
  gridLines: '#2A2A2A',     // Dark Gray
} as const;

// Light mode colors
export const CHART_COLORS_LIGHT = {
  top1: '#84CC16',    // Dark Lime
  top2: '#14B8A6',    // Teal
  top3: '#0EA5E9',    // Sky Blue
  top4: '#8B5CF6',    // Violet
  top5: '#F43F5E',    // Rose
  others: '#9CA3AF',  // Gray
  custom: '#8B5CF6',  // Violet (Custom wallet)
  uniqueWallets: '#65A30D', // Dark Green for line
  background: '#FAFAFA',    // Off White
  gridLines: '#E5E7EB',     // Light Gray
} as const;

export function getWalletColor(
  rank: number,
  isCustom: boolean = false,
  isDark: boolean = true
): string {
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;

  if (isCustom) return colors.custom;

  switch (rank) {
    case 1: return colors.top1;
    case 2: return colors.top2;
    case 3: return colors.top3;
    case 4: return colors.top4;
    case 5: return colors.top5;
    default: return colors.others;
  }
}

export function getChartColors(isDark: boolean = true) {
  return isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
}
