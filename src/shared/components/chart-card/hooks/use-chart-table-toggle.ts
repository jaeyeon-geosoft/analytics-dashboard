import { useEffect, useState } from "react"

import type { View } from "@/shared/components/chart-card/constants"
import { MIN_YIELD_FRAMES, afterFrames } from "@/shared/lib/after-frames"

/**
 * 차트↔표 전환.
 *
 * 보기를 바꾸는 것도 무거운 계산과 같은 자리다. 표와 막대·선·영역은 창으로 줄어서
 * 오가는 값이 거의 없는데, 산점도는 점을 그대로 그려서 **차트로 돌아가는 쪽**만
 * commit 하나가 통째로 프레임을 넘긴다(점 3,000개 383ms, 걷어내는 쪽은 40ms).
 * 그래서 표로 가는 전환에는 표시를 띄우지 않는다 — 재봤을 때 72ms였고, 그 정도로
 * 스쳐 지나가는 스피너는 한 바퀴를 못 돌아 오히려 고장 난 것처럼 보인다.
 */
export function useChartTableToggle(slow: boolean) {
  const [view, setView] = useState<View>("chart")
  /** 표에서 차트로 돌아가는 중. 표시를 먼저 찍으려고 한 프레임 미뤄둔 상태다. */
  const [swapping, setSwapping] = useState(false)

  useEffect(() => {
    if (!swapping) return
    return afterFrames(MIN_YIELD_FRAMES, () => {
      setView("chart")
      setSwapping(false)
    })
  }, [swapping])

  return {
    view,
    swapping,
    // 누른 쪽은 곧바로 눌린 것으로 보여야 한다. 그리는 것만 다음 프레임으로 미룬다.
    pressed: swapping ? ("chart" as const) : view,
    select(next: View) {
      if (next === view) return
      if (next === "chart" && slow) setSwapping(true)
      else setView(next)
    },
  }
}
