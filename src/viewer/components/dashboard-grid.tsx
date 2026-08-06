import type { Layout } from "react-grid-layout"

import { ChartCard } from "@/shared/components/chart-card"
import { ChartGrid } from "@/shared/components/chart-grid"
import { GRID_MARGIN, type Dashboard } from "@/shared/lib/dashboard"

/**
 * 저장된 배치대로 차트를 그린다. 격자는 어드민과 **같은 컴포넌트**라 칸 규격이
 * 어긋날 수 없다(절대 원칙 1).
 *
 * 잠금이 풀리면 보는 사람이 카드를 옮기고 늘릴 수 있지만 그 배치는 **어디에도 남지
 * 않는다** — 진실의 원천은 어드민이 저장한 대시보드이고, 여기에 캐시를 두면 어긋난
 * 상태가 생긴다(절대 원칙 4).
 */
export function DashboardGrid({
  dashboard,
  layout,
  onLayoutChange,
  locked,
}: {
  dashboard: Dashboard
  layout: Layout
  onLayoutChange: (next: Layout) => void
  locked: boolean
}) {
  const byId = new Map(dashboard.datasets.map((dataset) => [dataset.id, dataset]))
  // parseDashboard가 이미 막았지만, 타입을 좁히려면 한 번 걸러야 한다. 걸러진 채로
  // 넘겨야 rgl이 자식 없는 자리를 만나지 않는다.
  const cards = dashboard.charts.flatMap((chart) => {
    const dataset = byId.get(chart.datasetId)
    return dataset ? [{ chart, dataset }] : []
  })

  return (
    // 격자의 바깥 여백. 칸 사이 간격과 같은 값이라 카드가 가장자리에도 고르게 선다.
    <div style={{ padding: `${GRID_MARGIN}px` }}>
      <ChartGrid layout={layout} onLayoutChange={onLayoutChange} locked={locked}>
        {cards.map(({ chart, dataset }, index) => (
          // `grid`라 안의 카드가 rgl이 정해준 칸을 그대로 채운다. `h-full`을 쓰면
          // 부모 높이가 해석되지 않는 자리에서 플롯이 콘텐츠 높이로 무너진다(CLAUDE.md).
          <div key={chart.id} className="grid">
            <ChartCard
              spec={chart.spec}
              title={chart.title}
              // 어드민과 같은 이유로 한 장씩 미룬다 — 여러 장의 집계가 한 프레임에 몰리면
              // 화면이 통째로 멈춘다.
              order={index}
              data={dataset.data}
              columns={dataset.columns}
            />
          </div>
        ))}
      </ChartGrid>
    </div>
  )
}
