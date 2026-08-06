import type { Layout } from "react-grid-layout"

import { GRID_MIN_H, GRID_MIN_W, type Dashboard } from "@/shared/lib/dashboard"

/**
 * 저장된 배치에서 격자가 먹을 모양을 만든다. 대시보드를 열 때 한 번 부르고,
 * "원래 배치로"가 같은 것을 다시 부른다 — **저장된 값이 언제나 기준점이다.**
 */
export function layoutFrom(dashboard: Dashboard): Layout {
  return dashboard.charts.map((chart) => ({
    i: chart.id,
    ...chart.layout,
    // 하한은 저장된 값에 없다(계약은 x/y/w/h만 담는다). 어드민과 같은 수를 여기서 박는다.
    minW: GRID_MIN_W,
    minH: GRID_MIN_H,
  }))
}

/** 지금 배치가 저장된 것과 다른가. 다를 때만 되돌리기를 내놓는다. */
export function isMoved(layout: Layout, dashboard: Dashboard): boolean {
  const saved = new Map(dashboard.charts.map((chart) => [chart.id, chart.layout]))
  return layout.some((item) => {
    const from = saved.get(item.i)
    return !from || from.x !== item.x || from.y !== item.y || from.w !== item.w || from.h !== item.h
  })
}
