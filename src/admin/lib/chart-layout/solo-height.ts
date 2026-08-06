import { SOLO_H } from "@/admin/lib/chart-layout/constants"
import { GRID_MARGIN, GRID_MIN_H, GRID_ROW_HEIGHT } from "@/shared/lib/dashboard"

/**
 * 잰 캔버스 높이(px)를 칸 수로. 카드가 한 장일 때 **세로도 남기지 않고 채우려고** 쓴다.
 *
 * `h`칸의 실제 높이는 `h*ROW + (h-1)*MARGIN`이라 거꾸로 풀면 `(px + MARGIN) / (ROW + MARGIN)`이다.
 * 내림해서 넘치지 않게 하고, 하한 아래로는 내려가지 않는다(그 아래는 플롯이 잘린다).
 */
export function soloHeight(px: number): number {
  if (!(px > 0)) return SOLO_H
  const rows = Math.floor((px + GRID_MARGIN) / (GRID_ROW_HEIGHT + GRID_MARGIN))
  return Math.max(GRID_MIN_H, rows)
}
