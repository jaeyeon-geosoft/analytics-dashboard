import { useEffect, useRef, useState } from "react"

import { OVERSCAN, ROW_HEIGHT } from "@/shared/components/data-table/constants"
import { RowSpacer } from "@/shared/components/data-table/row-spacer"
import { toTableView } from "@/shared/components/data-table/table-view"
import type { PlotData } from "@/shared/lib/aggregate"
import { cn } from "@/shared/lib/utils"

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
  const table = toTableView(plot)
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
  const first = Math.max(0, Math.floor((top - ROW_HEIGHT) / ROW_HEIGHT) - OVERSCAN)
  const last = Math.min(count, Math.ceil((top + height) / ROW_HEIGHT) + OVERSCAN)
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
        {/*
          key는 헤더 문자열이 아니라 **자리 번호**다. 이름은 겹칠 수 있다 —
          이중 축에서 Y축(좌)와 Y축(우)에 같은 컬럼을 고르면 두 열의 이름이
          똑같아진다. 열은 순서가 곧 정체성이라 번호가 맞는 key다.
        */}
        <colgroup>
          <col />
          {table.headers.slice(1).map((_, index) => (
            <col key={index} className="w-40" />
          ))}
        </colgroup>
        <thead className="sticky top-0 bg-card">
          <tr>
            {table.headers.map((header, index) => (
              <th
                key={index}
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
          <RowSpacer rows={first} span={table.headers.length} />
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
          <RowSpacer rows={count - last} span={table.headers.length} />
        </tbody>
      </table>
    </div>
  )
}
