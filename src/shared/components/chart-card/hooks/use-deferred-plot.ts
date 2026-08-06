import { useEffect, useState } from "react"

import { buildPlot, type PlotData, type PlotRequest } from "@/shared/lib/aggregate"
import { MIN_YIELD_FRAMES, afterFrames } from "@/shared/lib/after-frames"

/**
 * 그릴 것을 한 프레임 뒤에 만든다.
 *
 * 입력 묶음의 정체성이 곧 "무엇을 그려야 하는지"다. 결과에 그 묶음을 붙여두면
 * `pending`을 따로 상태로 들 필요 없이 비교만으로 나온다(effect 안 동기 setState 금지).
 *
 * `order`만큼 더 미루는 것은 카드끼리 계산이 한 프레임에 몰리지 않게 하기 위한 것이다 —
 * 앞 카드부터 한 장씩 차례로 그려진다.
 */
export function useDeferredPlot(request: PlotRequest, order: number) {
  const [built, setBuilt] = useState<{ request: PlotRequest; plot: PlotData | null } | null>(null)

  useEffect(
    () =>
      afterFrames(MIN_YIELD_FRAMES + order, () =>
        setBuilt({ request, plot: buildPlot(request) })
      ),
    [request, order]
  )

  return { plot: built?.plot ?? null, pending: built?.request !== request }
}
