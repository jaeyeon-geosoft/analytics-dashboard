import type { Layout } from "react-grid-layout"

import { ChartCard } from "@/shared/components/chart-card"
import { ChartGrid } from "@/shared/components/chart-grid"
import { syncLayout } from "@/admin/lib/chart-layout"
import type { AdminChart, AdminDataset } from "@/admin/lib/canvas-state"

/**
 * 캔버스에 놓이는 카드들. 격자 자체는 shared의 `ChartGrid`가 맡고(뷰어와 같은 것),
 * 여기서는 카드와 배치를 맞춰 넘기는 일만 한다.
 */
export function CanvasGrid({
  charts,
  datasets,
  layout,
  onLayoutChange,
  activeId,
  single,
  soloH,
  onSelectChart,
  onRemoveChart,
}: {
  charts: AdminChart[]
  datasets: AdminDataset[]
  layout: Layout
  onLayoutChange: (next: Layout) => void
  activeId: string
  single: boolean
  /** 카드가 한 장일 때 쓸 높이(칸). 캔버스를 재서 나온 값이다. */
  soloH: number
  onSelectChart: (id: string) => void
  onRemoveChart: (id: string) => void
}) {
  const byId = new Map(datasets.map((dataset) => [dataset.id, dataset]))
  // 파일을 지우면 그 파일을 보던 카드도 함께 지워지므로 짝은 항상 있다. 타입을 좁히려고
  // 한 번 거르고, 거른 결과로 배치를 맞춘다 — 둘이 어긋나면 rgl이 빈 자리를 남긴다.
  const cards = charts.flatMap((chart) => {
    const dataset = byId.get(chart.datasetId)
    return dataset ? [{ chart, dataset }] : []
  })
  // 카드가 늘거나 줄면 배치가 어긋난다. 넘기기 직전에 한 번 맞춘다.
  const settled = syncLayout(
    cards.map(({ chart }) => chart.spec.id),
    layout,
    soloH
  )

  return (
    <ChartGrid layout={settled} onLayoutChange={onLayoutChange}>
      {cards.map(({ chart, dataset }, index) => (
        // `grid`라 안의 카드가 rgl이 정해준 칸을 그대로 채운다.
        <div key={chart.spec.id} className="grid">
          <ChartCard
            spec={chart.spec}
            number={index + 1}
            order={index}
            data={dataset.data}
            columns={dataset.columns}
            selected={chart.spec.id === activeId}
            onSelect={() => onSelectChart(chart.spec.id)}
            onRemove={single ? undefined : () => onRemoveChart(chart.spec.id)}
          />
        </div>
      ))}
    </ChartGrid>
  )
}
