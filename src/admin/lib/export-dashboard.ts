import type { Layout } from "react-grid-layout"

import { describeMapping, type ChartSpec } from "@/shared/lib/chart-spec"
import { slotFor } from "@/admin/lib/chart-layout"
import { DASHBOARD_FORMAT, type Dashboard } from "@/shared/lib/dashboard"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import type { Dataset } from "@/admin/lib/canvas-state"
import type { ParsedFile } from "@/admin/lib/parse-file"

/**
 * 지금 어드민에 있는 것을 그대로 `Dashboard`로 만든다.
 *
 * 어드민이 아직 파일 하나만 다루므로 `datasets`는 항상 1개다. 뷰어는 처음부터
 * 여러 개를 읽게 만들어 두므로, 어드민이 다중 파일을 지원해도 계약은 안 바뀐다.
 */
export function buildDashboard(
  dataset: Dataset,
  data: ParsedFile,
  columns: ColumnInfo[],
  charts: ChartSpec[],
  layout: Layout
): Dashboard {
  const placed = new Map(layout.map((item) => [item.i, item]))
  const datasetId = "ds-1"

  return {
    format: DASHBOARD_FORMAT,
    id: crypto.randomUUID(),
    title: dataset.name,
    datasets: [
      {
        id: datasetId,
        name: dataset.name,
        // 파싱 메타(인코딩·시트·헤더 행)는 담지 않는다. 그리는 데 안 쓰이고,
        // 뷰어는 파일을 다시 읽지 않으니 알 필요가 없다.
        columns,
        data: { columns: data.columns, rows: data.rows },
      },
    ],
    charts: charts.map((spec, index) => ({
      id: spec.id,
      title: titleOf(spec, index),
      datasetId,
      spec,
      // 화면에서 끌어 놓은 그대로 나간다. 자리를 못 찾으면 기본 칸으로 떨어진다.
      layout: pick(placed.get(spec.id) ?? slotFor(index)),
    })),
  }
}

/** 계약에는 x·y·w·h만 있다. rgl이 붙이는 i·minW 같은 것은 넘기지 않는다. */
function pick({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return { x, y, w, h }
}

/**
 * 제목 입력란이 아직 없어서 매핑 요약을 제목으로 쓴다 — 카드 머리에 뜨는 그 문장이다.
 * 매핑이 비어 있으면 그것도 못 만드니 번호로 떨어진다.
 */
function titleOf(spec: ChartSpec, index: number): string {
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
