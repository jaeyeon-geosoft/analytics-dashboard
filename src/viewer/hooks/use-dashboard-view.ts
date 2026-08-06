import { useState } from "react"
import type { Layout } from "react-grid-layout"

import type { Dashboard } from "@/shared/lib/dashboard"
import { isMoved } from "@/viewer/lib/is-moved"
import { layoutFrom } from "@/viewer/lib/layout-from"
import { loadDashboardFile } from "@/viewer/lib/load-dashboard"

/**
 * 뷰어가 들고 있는 것.
 *
 * **옮긴 배치는 어디에도 저장하지 않는다** — 진실의 원천은 어드민이 저장한 대시보드이고,
 * 여기에 캐시를 두면 어긋난 상태가 생긴다(절대 원칙 4). 새로고침하면 저장된 배치로
 * 돌아오는 것이 그 결과다.
 */
export function useDashboardView() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  /** 지금 화면의 배치. 열 때 저장된 값으로 채우고, 그 뒤로는 보는 사람이 옮긴 것을 담는다. */
  const [layout, setLayout] = useState<Layout>([])
  /** 뷰어는 잠긴 채로 열린다 — 기본은 "설정한 그대로"다(절대 원칙 1). */
  const [locked, setLocked] = useState(true)

  async function open(file: File) {
    const result = await loadDashboardFile(file)
    if (result.ok) {
      setDashboard(result.dashboard)
      setLayout(layoutFrom(result.dashboard))
      // 다른 대시보드는 그 대시보드가 저장한 배치로 다시 시작한다.
      setLocked(true)
      setProblem(null)
    } else {
      // 무엇이 잘못됐는지 보여준다. 빈 화면을 그리지 않는다(절대 원칙 3).
      setProblem(result.reason)
    }
  }

  return {
    dashboard,
    problem,
    layout,
    setLayout,
    locked,
    toggleLock: () => setLocked((was) => !was),
    moved: dashboard ? isMoved(layout, dashboard) : false,
    resetLayout: () => dashboard && setLayout(layoutFrom(dashboard)),
    open,
  }
}
