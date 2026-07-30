import type { ChartFrame, ScatterFrame } from "@/lib/aggregate"

function formatValue(value: unknown): string {
  return typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : String(value ?? "")
}

/**
 * 차트가 보여주는 것과 **같은 집계 결과**를 표로 낸다. 색만으로 값을 읽게 두지 않기
 * 위한 장치이고(라이트 모드에서 `--chart-3/4/5`는 대비가 모자란다), 직접 라벨을 다
 * 붙이지 않아도 모든 값에 닿을 수 있게 해준다.
 */
export function DataTable({
  frame,
  scatter,
}: {
  frame: ChartFrame | null
  scatter: ScatterFrame | null
}) {
  const table = scatter ? scatterToTable(scatter) : frame ? frameToTable(frame) : null
  if (!table) return null

  return (
    <div className="absolute inset-0 overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border">
            {table.headers.map((header, index) => (
              <th
                key={header}
                scope="col"
                className={`px-3 py-2 font-medium text-muted-foreground ${
                  index === 0 ? "text-left" : "text-right"
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/60 last:border-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={
                    cellIndex === 0
                      ? "px-3 py-1.5 font-mono"
                      : "px-3 py-1.5 text-right font-mono tabular-nums"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function frameToTable(frame: ChartFrame) {
  const single = frame.series.length === 1
  return {
    headers: [frame.xLabel, ...frame.series.map((entry) => (single ? frame.yLabel : entry.label))],
    rows: frame.rows.map((row) => [
      String(row.x),
      ...frame.series.map((entry) => formatValue(row[entry.key])),
    ]),
  }
}

function scatterToTable(frame: ScatterFrame) {
  const multi = frame.series.length > 1
  const rows: string[][] = []
  for (const entry of frame.series) {
    for (const point of entry.points) {
      rows.push(
        multi
          ? [entry.label, formatValue(point.x), formatValue(point.y)]
          : [formatValue(point.x), formatValue(point.y)]
      )
    }
  }
  return {
    headers: multi
      ? ["시리즈", frame.xLabel, frame.yLabel]
      : [frame.xLabel, frame.yLabel],
    rows,
  }
}
