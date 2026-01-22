export const CHART_COLORS = {
  top1: '#FF6B6B',    // Red
  top2: '#4ECDC4',    // Turquoise
  top3: '#45B7D1',    // Blue
  top4: '#96CEB4',    // Green
  top5: '#FFEAA7',    // Yellow
  others: '#B0B0B0',  // Gray
  custom: '#9B59B6'   // Purple (Custom wallet)
} as const;

export function getWalletColor(rank: number, isCustom: boolean = false): string {
  if (isCustom) return CHART_COLORS.custom;

  switch (rank) {
    case 1: return CHART_COLORS.top1;
    case 2: return CHART_COLORS.top2;
    case 3: return CHART_COLORS.top3;
    case 4: return CHART_COLORS.top4;
    case 5: return CHART_COLORS.top5;
    default: return CHART_COLORS.others;
  }
}
