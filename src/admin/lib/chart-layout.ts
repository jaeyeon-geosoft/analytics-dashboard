import type { Layout, LayoutItem } from "react-grid-layout"

import { GRID_COLS } from "@/shared/lib/dashboard"

/**
 * 새 카드가 놓이는 자리. 한 줄에 두 장이고, `h`는 종전 캔버스의 행 높이(26rem)에
 * 맞춘 값이다 — 8칸 = 8*40 + 7*12 = 404px.
 */
const DEFAULT_W = GRID_COLS / 2
const DEFAULT_H = 8

/** 카드가 이보다 작아지면 축·범례가 들어갈 자리가 없어 차트가 아니라 얼룩이 된다. */
const MIN_W = 3
const MIN_H = 5

export function slotFor(index: number): LayoutItem {
  return {
    i: "",
    x: (index % 2) * DEFAULT_W,
    y: Math.floor(index / 2) * DEFAULT_H,
    w: DEFAULT_W,
    h: DEFAULT_H,
    minW: MIN_W,
    minH: MIN_H,
  }
}

/**
 * 카드 목록과 배치를 맞춘다.
 *
 * 배치는 rgl이 들고 고치는데 카드는 App이 들고 고쳐서, 파일을 새로 열거나 카드를
 * 지우면 둘이 어긋난다. 어긋난 채로 rgl에 넘기면 없는 카드의 자리가 남거나 새 카드가
 * 자리를 못 받는다. **한 곳에서 맞춰 두고 넘긴다.**
 */
export function syncLayout(ids: string[], layout: Layout): Layout {
  const known = new Map(layout.map((item) => [item.i, item]))
  return ids.map((id, index) => {
    const found = known.get(id)
    // 최소 크기는 여기서 다시 박는다 — 예전에 저장된 배치에는 없을 수 있다.
    return found
      ? { ...found, minW: MIN_W, minH: MIN_H }
      : { ...slotFor(index), i: id }
  })
}
