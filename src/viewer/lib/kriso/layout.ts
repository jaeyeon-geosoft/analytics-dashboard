import { GRID_COLS, type DashboardLayout } from "@/shared/lib/dashboard"

/** 한 줄에 세 장. 9장이 정확히 3×3으로 떨어진다. */
const COLUMNS_PER_ROW = 3
const CARD_W = GRID_COLS / COLUMNS_PER_ROW
/** 어드민이 새 카드에 주는 기본 높이(`admin/lib/chart-layout/constants.ts`의 `DEFAULT_H`)와 같다. */
const CARD_H = 8

/** 카드 순번 → 3×3 격자 칸. 어드민의 `syncLayout`은 카드가 1~2장씩 점진적으로 느는
 * 상황을 위한 것이라 9장을 한 번에 조립하는 여기엔 맞지 않는다. */
export function liveLayout(index: number): DashboardLayout {
  return {
    x: (index % COLUMNS_PER_ROW) * CARD_W,
    y: Math.floor(index / COLUMNS_PER_ROW) * CARD_H,
    w: CARD_W,
    h: CARD_H,
  }
}
