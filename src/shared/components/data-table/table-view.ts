import type { ChartFrame, PlotData, ScatterFrame } from "@/shared/lib/aggregate"

/**
 * 표는 행을 **미리 만들지 않고 번호로 꺼낸다.**
 *
 * 2만 행을 전부 문자열로 빚는 것만으로도 203ms가 들었다 — DOM을 창으로 줄여도 이건
 * 그대로 남는다(`toLocaleString`이 행마다 돈다). 보이는 25행만 꺼내 쓰면 사라진다.
 */
export type TableView = {
  headers: string[]
  count: number
  row: (index: number) => string[]
}

function formatValue(value: unknown): string {
  return typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : String(value ?? "")
}

/** 시리즈가 하나뿐이면 열 이름은 시리즈 이름이 아니라 값 축 이름이다. */
function frameToTable(frame: ChartFrame): TableView {
  const single = frame.series.length === 1
  return {
    headers: [frame.xLabel, ...frame.series.map((entry) => (single ? frame.yLabel : entry.label))],
    count: frame.rows.length,
    row: (index) => {
      const row = frame.rows[index]
      return [String(row.x), ...frame.series.map((entry) => formatValue(row[entry.key]))]
    },
  }
}

function scatterToTable(frame: ScatterFrame): TableView {
  const multi = frame.series.length > 1
  // 시리즈별 점을 한 줄로 이어 세는 자리. 시리즈는 많아야 몇 개라 훑어도 싸다.
  const starts: number[] = []
  let count = 0
  for (const entry of frame.series) {
    starts.push(count)
    count += entry.points.length
  }

  return {
    headers: multi ? ["시리즈", frame.xLabel, frame.yLabel] : [frame.xLabel, frame.yLabel],
    count,
    row: (index) => {
      let at = frame.series.length - 1
      while (at > 0 && starts[at] > index) at--
      const entry = frame.series[at]
      const point = entry.points[index - starts[at]]
      return multi
        ? [entry.label, formatValue(point.x), formatValue(point.y)]
        : [formatValue(point.x), formatValue(point.y)]
    },
  }
}

/** 어느 프레임이든 같은 모양의 표로. 표를 그리는 쪽은 종류를 다시 묻지 않는다. */
export function toTableView(plot: PlotData): TableView {
  return plot.kind === "scatter" ? scatterToTable(plot.frame) : frameToTable(plot.frame)
}
