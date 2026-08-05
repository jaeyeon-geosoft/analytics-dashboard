import type { Layout } from "react-grid-layout"

import { describeMapping, type ChartSpec } from "@/shared/lib/chart-spec"
import { slotFor } from "@/admin/lib/chart-layout"
import { DASHBOARD_FORMAT, type Dashboard } from "@/shared/lib/dashboard"
import type { AdminChart, AdminDataset } from "@/admin/lib/canvas-state"

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

/**
 * 대시보드 이름. 파일이 여럿이면 세기만 한다 — 이름을 다 이어 붙이면 뷰어 헤더에서
 * 잘리고, 거기엔 파일 목록이 따로 나오기도 한다.
 */
function dashboardTitle(datasets: AdminDataset[]): string {
  const [first, ...rest] = datasets
  if (!first) return "대시보드"
  return rest.length > 0 ? `${first.name} 외 ${rest.length}개` : first.name
}

/** 계약에는 x·y·w·h만 있다. rgl이 붙이는 i·minW 같은 것은 넘기지 않는다. */
function pick({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return { x, y, w, h }
}

/**
 * 제목 입력란이 아직 없어서 매핑 요약을 제목으로 쓴다 — 카드 머리에 뜨는 그 문장이다.
 * 매핑이 비어 있으면 그것도 못 만드니 번호로 떨어진다.
 */
function chartTitle(spec: ChartSpec, index: number): string {
  const { axes, aside } = describeMapping(spec)
  if (!axes) return `차트 ${index + 1}`
  return aside ? `${axes} · ${aside}` : axes
}

/** 브라우저에 파일로 떨궈준다. API가 붙으면 이 자리가 POST가 된다. */
export function downloadDashboard(dashboard: Dashboard): void {
  // 보기 좋으라고 들여쓰지 않는다. 이건 곧 API 본문이 될 것이고,
  // 실제로 얼마나 큰지가 눈에 보여야 한다.
  const blob = new Blob([JSON.stringify(dashboard)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${baseName(dashboard.title)}.dashboard.json`
  link.click()
  URL.revokeObjectURL(url)
}

/** 확장자를 떼고 파일 이름에 못 쓰는 글자를 눕힌다. */
function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]/g, "-") || "dashboard"
}
