import { allowsReference, isPointChart } from "@/shared/lib/mapping-slots"
import { buildChartFrame } from "@/shared/lib/aggregate/chart-frame"
import { buildScatterFrame } from "@/shared/lib/aggregate/scatter-frame"
import type { PlotData, PlotRequest } from "@/shared/lib/aggregate/types"

/**
 * 차트 종류를 보고 어느 프레임을 만들지 정하는 **유일한 자리**.
 *
 * 기준선을 못 다는 종류에서 고른 값이 남아 있어도 계산에 새어 들어가지 않게 여기서
 * 막는다 — 매핑과 같은 이유로 값을 지우지는 않기 때문에(종류를 되돌리면 살아난다)
 * 읽는 쪽에서 한 번 걸러야 한다.
 */
export function buildPlot(request: PlotRequest): PlotData | null {
  const { chartType, mapping, aggregation, reference, order, columns, rows } = request

  if (isPointChart(chartType)) {
    const frame = buildScatterFrame(mapping, rows)
    return frame && { kind: "scatter", frame }
  }

  const wanted = allowsReference(chartType) ? reference : "none"
  const frame = buildChartFrame(chartType, mapping, aggregation, columns, rows, wanted, order)
  return frame && { kind: "cartesian", frame }
}
