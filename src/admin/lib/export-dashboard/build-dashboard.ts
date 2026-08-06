import type { Layout } from "react-grid-layout"

import type { AdminChart, AdminDataset } from "@/admin/lib/canvas-state"
import { slotFor } from "@/admin/lib/chart-layout"
import { chartTitle, dashboardTitle } from "@/admin/lib/export-dashboard/titles"
import { DASHBOARD_FORMAT, type Dashboard, type DashboardLayout } from "@/shared/lib/dashboard"

/** 계약에는 x·y·w·h만 있다. rgl이 붙이는 i·minW 같은 것은 넘기지 않는다. */
function pick({ x, y, w, h }: DashboardLayout): DashboardLayout {
  return { x, y, w, h }
}

/** 지금 어드민에 있는 것을 그대로 `Dashboard`로 만든다. */
export function buildDashboard(
  datasets: AdminDataset[],
  charts: AdminChart[],
  layout: Layout
): Dashboard {
  const placed = new Map(layout.map((item) => [item.i, item]))
  // 어느 카드도 보지 않는 파일은 담지 않는다. 뷰어가 그릴 일이 없는데 10만 행이
  // 페이로드에 그대로 실린다.
  const used = datasets.filter((dataset) =>
    charts.some((chart) => chart.datasetId === dataset.id)
  )

  return {
    format: DASHBOARD_FORMAT,
    id: crypto.randomUUID(),
    title: dashboardTitle(used),
    datasets: used.map((dataset) => ({
      id: dataset.id,
      name: dataset.name,
      // 파싱 메타(인코딩·시트·헤더 행)는 담지 않는다. 그리는 데 안 쓰이고,
      // 뷰어는 파일을 다시 읽지 않으니 알 필요가 없다.
      columns: dataset.columns,
      data: { columns: dataset.data.columns, rows: dataset.data.rows },
    })),
    charts: charts.map(({ spec, datasetId }, index) => ({
      id: spec.id,
      title: chartTitle(spec, index),
      datasetId,
      spec,
      // 화면에서 끌어 놓은 그대로 나간다. 자리를 못 찾으면 기본 칸으로 떨어진다.
      layout: pick(placed.get(spec.id) ?? slotFor(index)),
    })),
  }
}
