import { useCallback, useEffect, useRef, useState } from "react"

import { MIN_SLOT } from "@/shared/components/chart-view/constants"
import { cn } from "@/shared/lib/utils"

export type PlotWindow = {
  plotRef: React.RefObject<HTMLDivElement | null>
  onWheel: (event: React.WheelEvent) => void
  bar: React.ReactNode
  vertical: boolean
  /** 지금 창의 첫 범주 인덱스 */
  start: number
  /** 창에 들어가는 범주 수 */
  size: number
  /** 잰 플롯 크기(px). 세로 막대는 폭, 가로 막대는 높이. 값 라벨이 들어갈지 가른다. */
  extent: number
}

/**
 * 보이는 범주만 그린다.
 *
 * 범주를 자르지 않으므로 만 행짜리 파일이면 마크도 만 개다 — Recharts가 SVG 노드를
 * 그만큼 만드느라 화면이 십여 초 멈췄다. 그릴 수 있는 만큼만 잘라 넘기고 나머지는
 * 스크롤바로 옮겨 본다. 마크 수가 화면 크기에 묶여서 범주가 몇 개든 비용이 같다.
 *
 * **마크 하나가 SVG 노드 하나인 종류(막대)에만 쓴다.** 선·영역은 점이 몇 개든
 * `<path>` 하나라 자를 이유가 없고, 자르면 시계열의 모양 자체를 못 본다.
 *
 * **스크롤바는 반드시 플롯 바깥에 둔다.** 플롯 자체에 `overflow`를 걸면 스크롤바가
 * 생겼다 사라지며 가용 폭이 15px씩 진동하고, ResponsiveContainer가 그때마다 다시
 * 측정해 초당 수천 번 리렌더한다(실제로 겪었다). 여기서 크기를 재는 상자는 절대
 * 스크롤하지 않으므로 그 되먹임이 없다.
 */
export function usePlotWindow(count: number, vertical: boolean): PlotWindow {
  const plotRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [extent, setExtent] = useState(0)
  const [start, setStart] = useState(0)

  useEffect(() => {
    const element = plotRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setExtent(vertical ? height : width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [vertical])

  const size = Math.max(1, Math.floor(extent / MIN_SLOT))
  const limit = Math.max(0, count - size)
  // 컬럼이나 차트 종류가 바뀌면 범주 수가 줄어든다. 렌더에는 잘라낸 값을 쓴다.
  const offset = Math.min(start, limit)

  const onScroll = useCallback(() => {
    const element = barRef.current
    if (!element) return
    const travel = vertical
      ? element.scrollHeight - element.clientHeight
      : element.scrollWidth - element.clientWidth
    const at = vertical ? element.scrollTop : element.scrollLeft
    setStart(travel > 0 ? Math.round((at / travel) * limit) : 0)
  }, [limit, vertical])

  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      const element = barRef.current
      if (!element) return
      // 가로로 넘길 때는 트랙패드의 deltaX와 휠의 deltaY를 둘 다 받는다.
      const delta = vertical
        ? event.deltaY
        : Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY
      if (delta === 0) return
      if (vertical) element.scrollTop += delta
      else element.scrollLeft += delta
    },
    [vertical]
  )

  // 트랙 대비 썸 크기가 곧 "전체 중 얼마를 보고 있는지"가 된다.
  const bar =
    limit > 0 ? (
      <div
        ref={barRef}
        onScroll={onScroll}
        className={cn(
          "shrink-0 [scrollbar-width:thin]",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
          vertical
            ? "ml-1 w-2 overflow-y-auto [&::-webkit-scrollbar]:w-2"
            : "mt-1.5 h-2 overflow-x-auto [&::-webkit-scrollbar]:h-2"
        )}
      >
        <div
          style={
            vertical
              ? { height: `${(count / size) * 100}%`, width: 1 }
              : { width: `${(count / size) * 100}%`, height: 1 }
          }
        />
      </div>
    ) : null

  return { plotRef, onWheel, bar, vertical, start: offset, size, extent }
}
