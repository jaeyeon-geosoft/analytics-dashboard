import type { Layout } from "react-grid-layout"

import type { Dashboard } from "@/shared/lib/dashboard"

/** 지금 배치가 저장된 것과 다른가. 다를 때만 되돌리기를 내놓는다. */
export function isMoved(layout: Layout, dashboard: Dashboard): boolean {
  const saved = new Map(dashboard.charts.map((chart) => [chart.id, chart.layout]))
  return layout.some((item) => {
    const from = saved.get(item.i)
    return !from || from.x !== item.x || from.y !== item.y || from.w !== item.w || from.h !== item.h
  })
}
