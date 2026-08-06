import type { Layout, LayoutItem } from "react-grid-layout"

import { DEFAULT_W } from "@/admin/lib/chart-layout/constants"
import { slotFor } from "@/admin/lib/chart-layout/slot-for"
import { GRID_COLS, GRID_MIN_H, GRID_MIN_W } from "@/shared/lib/dashboard"

/**
 * 카드 목록과 배치를 맞춘다.
 *
 * 배치는 rgl이 들고 고치는데 카드는 App이 들고 고쳐서, 파일을 새로 열거나 카드를
 * 지우면 둘이 어긋난다. 어긋난 채로 rgl에 넘기면 없는 카드의 자리가 남거나 새 카드가
 * 자리를 못 받는다. **한 곳에서 맞춰 두고 넘긴다.**
 */
export function syncLayout(ids: string[], layout: Layout, soloH?: number): Layout {
  const known = new Map(layout.map((item) => [item.i, item]))

  /*
    **폭을 다 쓰던 한 장짜리 카드는 두 번째가 들어올 때 반으로 갈라 옆에 붙인다.**

    아래로 붙이면 새 카드를 보려고 스크롤해야 하는데, 차트를 추가하는 이유는 대개
    둘을 나란히 놓고 비교하려는 것이다. 높이는 갈라진 카드의 것을 그대로 물려줘서
    두 장이 여전히 캔버스를 채우고 아랫변이 맞는다.

    **가르는 것은 이 순간뿐이다**(1장 → 2장). 그 뒤로는 사용자가 잡은 크기를 건드리지
    않는다 — 손댄 배치를 도구가 되돌리면 그게 더 놀랍다.
  */
  const solo = ids.length === 2 && known.size === 1 ? [...known.values()][0] : undefined
  const split = solo && solo.w === GRID_COLS ? solo : undefined

  /*
    새 카드가 갈 열은 **지금까지 놓인 반폭 카드 수**로 정한다. 목록 인덱스로 세면 폭을
    다 쓰는 카드(1장일 때)가 한 자리를 먹은 것으로 계산돼 다음 카드가 오른쪽 절반에
    놓이고 왼쪽이 빈 채 남는다 — 실제로 그렇게 나왔다.
  */
  let halves = 0
  return ids.map((id) => {
    const found = known.get(id)
    // 최소 크기는 여기서 다시 박는다 — 예전에 저장된 배치에는 없을 수 있다.
    const item: LayoutItem = found
      ? split && found.i === split.i
        ? { ...found, x: 0, w: DEFAULT_W, minW: GRID_MIN_W, minH: GRID_MIN_H }
        : { ...found, minW: GRID_MIN_W, minH: GRID_MIN_H }
      : split
        ? {
            i: id,
            x: DEFAULT_W,
            y: split.y,
            w: DEFAULT_W,
            h: split.h,
            minW: GRID_MIN_W,
            minH: GRID_MIN_H,
          }
        : { ...slotFor(halves, ids.length, soloH), i: id }
    if (item.w <= DEFAULT_W) halves += 1
    return item
  })
}
