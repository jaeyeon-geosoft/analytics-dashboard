import { useEffect, useRef, useState } from "react"

import type { ChartFrame, PlotData, ScatterFrame } from "@/lib/aggregate"
import { cn } from "@/lib/utils"

function formatValue(value: unknown): string {
  return typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : String(value ?? "")
}

/**
 * 행 높이(px). 창 계산이 여기에 걸려 있으므로 **CSS에서 `h-7`로 못 박고** 내용이 늘어나
 * 어긋나지 않게 한다(`truncate`로 한 줄 고정, `border-separate`라 테두리가 높이 안에 든다).
 * 헤더도 같은 높이라, 스크롤 위치에서 행 번호를 낼 때 한 행만 빼면 된다.
 */
const ROW = 28
/** 창 위아래로 더 그려두는 행. 스크롤 중 빈칸이 스치지 않을 만큼만. */
const OVERSCAN = 6

/**
 * 차트가 보여주는 것과 **같은 집계 결과**를 표로 낸다. 색만으로 값을 읽게 두지 않기
 * 위한 장치이고(라이트 모드에서 `--chart-3/4/5`는 대비가 모자란다), 직접 라벨을 다
 * 붙이지 않아도 모든 값에 닿을 수 있게 해준다.
 *
 * **차트와 같은 이유로 보이는 만큼만 그린다.** 범주를 자르지 않으므로 2만 행짜리 표는
 * 행이 2만 개고, 전부 DOM으로 만들면 차트↔표를 오갈 때마다 화면이 0.6초씩 멈췄다.
 * 위아래는 빈 행 하나로 자리만 잡아 스크롤 길이와 위치를 그대로 유지한다.
 *
 * 창마다 열 폭이 다시 잡히면 스크롤할 때 열이 흔들린다. `table-fixed`로 폭을 창과
 * 무관하게 고정하고, 값 열만 폭을 준 뒤 남는 자리를 범주 열이 갖는다.
 */
export function DataTable({ plot }: { plot: PlotData }) {
  const table = plot.kind === "scatter" ? scatterToTable(plot.frame) : frameToTable(plot.frame)
  const boxRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  const [top, setTop] = useState(0)

  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const count = table.count
  // 스크롤 위치는 헤더까지 포함해서 재므로 한 행만큼 뺀다.
  const first = Math.max(0, Math.floor((top - ROW) / ROW) - OVERSCAN)
  const last = Math.min(count, Math.ceil((top + height) / ROW) + OVERSCAN)
  const visible = Array.from({ length: Math.max(0, last - first) }, (_, index) =>
    table.row(first + index)
  )

  return (
    <div
      ref={boxRef}
      onScroll={(event) => setTop(event.currentTarget.scrollTop)}
      className="absolute inset-0 overflow-auto"
    >
      <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
        <colgroup>
          <col />
          {table.headers.slice(1).map((header) => (
            <col key={header} className="w-40" />
          ))}
        </colgroup>
        <thead className="sticky top-0 bg-card">
          <tr>
            {table.headers.map((header, index) => (
              <th
                key={header}
                scope="col"
                className={cn(
                  "h-7 border-b border-border px-3 font-medium text-muted-foreground",
                  index === 0 ? "text-left" : "text-right"
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Spacer rows={first} span={table.headers.length} />
          {visible.map((row, index) => (
            <tr key={first + index}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  // 잘린 값도 마우스를 올리면 원본이 그대로 나온다.
                  title={cellIndex === 0 ? cell : undefined}
                  className={cn(
                    "h-7 truncate border-b border-border/60 px-3 font-mono",
                    cellIndex > 0 && "text-right tabular-nums"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          <Spacer rows={count - last} span={table.headers.length} />
        </tbody>
      </table>
    </div>
  )
}

/** 그리지 않은 행이 차지하던 높이. 스크롤 막대가 전체 길이를 유지한다. */
function Spacer({ rows, span }: { rows: number; span: number }) {
  if (rows <= 0) return null
  return (
    <tr aria-hidden style={{ height: rows * ROW }}>
      <td colSpan={span} className="p-0" />
    </tr>
  )
}

/**
 * 표는 행을 **미리 만들지 않고 번호로 꺼낸다.**
 *
 * 2만 행을 전부 문자열로 빚는 것만으로도 203ms가 들었다 — DOM을 창으로 줄여도 이건
 * 그대로 남는다(`toLocaleString`이 행마다 돈다). 보이는 25행만 꺼내 쓰면 사라진다.
 */
type TableView = { headers: string[]; count: number; row: (index: number) => string[] }

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
