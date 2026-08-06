import type { Layout, LayoutItem } from "react-grid-layout"

import { GRID_COLS, GRID_MARGIN, GRID_MIN_H, GRID_MIN_W, GRID_ROW_HEIGHT } from "@/shared/lib/dashboard"

/**
 * 새 카드가 놓이는 자리. 한 줄에 두 장이고, `h`는 종전 캔버스의 행 높이(26rem)에
 * 맞춘 값이다 — 8칸 = 8*40 + 7*12 = 404px.
 */
const DEFAULT_W = GRID_COLS / 2
const DEFAULT_H = 8

/**
 * 카드가 한 장뿐이면 **폭을 다 쓴다.**
 *
 * 절반짜리로 두면 파일을 처음 열었을 때 오른쪽 절반이 통째로 비고, 폭을 다 쓰는 파일
 * 바와 어긋나 화면이 덜 만들어진 것처럼 보인다. 첫 화면이 그 상태라 인상이 거기서 굳는다.
 * 세로도 종전(404px)보다 키워 캔버스를 채운다.
 *
 * **이미 놓인 카드를 다시 줄이지는 않는다.** 차트를 추가하면 새 카드가 아랫줄에 놓이고,
 * 배치를 바꾸는 것은 사용자 몫이다 — 손댄 배치를 도구가 되돌리면 그게 더 놀랍다.
 */
const SOLO_W = GRID_COLS
/** 캔버스를 아직 못 쟀을 때의 값. 종전 카드 높이(404px)보다 조금 큰 정도. */
const SOLO_H = 10

/**
 * 잰 캔버스 높이(px)를 칸 수로. 카드가 한 장일 때 **세로도 남기지 않고 채우려고** 쓴다.
 *
 * `h`칸의 실제 높이는 `h*ROW + (h-1)*MARGIN`이라 거꾸로 풀면 `(px + MARGIN) / (ROW + MARGIN)`이다.
 * 내림해서 넘치지 않게 하고, 하한 아래로는 내려가지 않는다(그 아래는 플롯이 잘린다).
 */
export function soloHeight(px: number): number {
  if (!(px > 0)) return SOLO_H
  const rows = Math.floor((px + GRID_MARGIN) / (GRID_ROW_HEIGHT + GRID_MARGIN))
  return Math.max(GRID_MIN_H, rows)
}

export function slotFor(index: number, count = 2, soloH = SOLO_H): LayoutItem {
  if (count === 1) {
    return { i: "", x: 0, y: 0, w: SOLO_W, h: soloH, minW: GRID_MIN_W, minH: GRID_MIN_H }
  }
  return {
    i: "",
    x: (index % 2) * DEFAULT_W,
    y: Math.floor(index / 2) * DEFAULT_H,
    w: DEFAULT_W,
    h: DEFAULT_H,
    minW: GRID_MIN_W,
    minH: GRID_MIN_H,
  }
}

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
    새 카드가 갈 열은 **지금까지 놓인 반폭 카드 수**로 정한다. 목록 인덱스로 세면 폭을
    다 쓰는 카드(1장일 때)가 한 자리를 먹은 것으로 계산돼 다음 카드가 오른쪽 절반에
    놓이고 왼쪽이 빈 채 남는다 — 실제로 그렇게 나왔다.
  */
  let halves = 0
  return ids.map((id) => {
    const found = known.get(id)
    // 최소 크기는 여기서 다시 박는다 — 예전에 저장된 배치에는 없을 수 있다.
    const item = found
      ? { ...found, minW: GRID_MIN_W, minH: GRID_MIN_H }
      : { ...slotFor(halves, ids.length, soloH), i: id }
    if (item.w <= DEFAULT_W) halves += 1
    return item
  })
}
