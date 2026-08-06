import { BarView } from "@/shared/components/chart-view/bar-view"
import { PieView } from "@/shared/components/chart-view/pie-view"
import { ScatterView } from "@/shared/components/chart-view/scatter-view"
import { TimelineView } from "@/shared/components/chart-view/timeline-view"
import type { PlotData } from "@/shared/lib/aggregate"
import type { ChartType } from "@/shared/lib/chart-types"
import { isTimeline } from "@/shared/lib/mapping-slots"

/**
 * 그릴 것을 종류에 맞는 렌더러로 넘긴다.
 *
 * 네 갈래는 축 구성부터 다르다 — 시계열은 점을 전부 그리고 이중 축이 있을 수 있고,
 * 막대는 창으로 잘라 그리며 최대값에 라벨을 붙이고, 원형과 산점도는 범주 축이 아예
 * 없다. 한 함수에 모아두면 어느 변수가 어느 갈래의 것인지 읽어낼 수 없다.
 */
export function ChartView({
  chartType,
  plot,
  onLabelsFolded,
}: {
  chartType: ChartType
  plot: PlotData
  /**
   * 막대 값 라벨이 최대값 하나로 접혔는지 알린다. 접힐지는 **폭을 재봐야** 알 수 있어서
   * 카드가 스스로 못 낸다 — 여기서 알려주고 카드가 머리줄에 적는다.
   */
  onLabelsFolded?: (folded: boolean) => void
}) {
  if (plot.kind === "scatter") {
    return <ScatterView frame={plot.frame} connected={chartType === "path"} />
  }
  if (chartType === "pie") return <PieView frame={plot.frame} />
  if (isTimeline(chartType)) return <TimelineView frame={plot.frame} chartType={chartType} />
  return <BarView frame={plot.frame} chartType={chartType} onLabelsFolded={onLabelsFolded} />
}
