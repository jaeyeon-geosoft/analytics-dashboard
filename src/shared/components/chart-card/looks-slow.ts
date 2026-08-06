import { SLOW_POINTS } from "@/shared/components/chart-card/constants"
import type { ChartType } from "@/shared/lib/chart-types"
import { isPointChart } from "@/shared/lib/mapping-slots"

/**
 * 이 계산이 한 프레임을 넘길 것 같은가. **계산 전에** 물어야 한다 — 시작한 뒤에는
 * 메인스레드가 한 덩어리로 잡혀 판단할 수 없다.
 *
 * "직전이 느렸으면 띄운다"는 **처음 느려지는 순간**(막대→산점도)을 못 잡으니 쓰지 말 것.
 */
export function looksSlow(chartType: ChartType, rows: number): boolean {
  return isPointChart(chartType) && rows > SLOW_POINTS
}
