import { ChartCard } from "@/shared/components/chart-card"
import { GRID_COLS, GRID_MARGIN, GRID_ROW_HEIGHT, type Dashboard } from "@/shared/lib/dashboard"

/**
 * 저장된 배치를 그대로 그린다. 뷰어는 끌지도 늘리지도 않으므로 배치 라이브러리가 없다 —
 * CSS Grid로 `x/y/w/h`를 그대로 놓으면 어드민이 쓸 그리드와 기하가 같아진다.
 * (칸 폭 `1fr` × `GRID_COLS`, 행 높이 `GRID_ROW_HEIGHT`, 간격·바깥 여백 모두 `GRID_MARGIN`.)
 */
export function DashboardGrid({ dashboard }: { dashboard: Dashboard }) {
  const byId = new Map(dashboard.datasets.map((dataset) => [dataset.id, dataset]))

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        gridAutoRows: `${GRID_ROW_HEIGHT}px`,
        gap: `${GRID_MARGIN}px`,
        padding: `${GRID_MARGIN}px`,
      }}
    >
      {dashboard.charts.map((chart, index) => {
        const dataset = byId.get(chart.datasetId)
        // parseDashboard가 이미 막았지만, 타입을 좁히려면 여기서도 확인해야 한다.
        if (!dataset) return null

        return (
          <div
            key={chart.id}
            // `grid`라서 안의 카드가 이 칸을 그대로 채운다. `h-full`을 쓰면 부모 높이가
            // 해석되지 않는 자리에서 플롯이 콘텐츠 높이로 무너진다(CLAUDE.md).
            className="grid min-w-0"
            style={{
              gridColumn: `${chart.layout.x + 1} / span ${chart.layout.w}`,
              gridRow: `${chart.layout.y + 1} / span ${chart.layout.h}`,
            }}
          >
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
        )
      })}
    </div>
  )
}
