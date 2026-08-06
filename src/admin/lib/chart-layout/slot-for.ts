import type { LayoutItem } from "react-grid-layout"

import {
  DEFAULT_H,
  DEFAULT_W,
  PER_ROW,
  SOLO_H,
  SOLO_W,
} from "@/admin/lib/chart-layout/constants"
import { GRID_MIN_H, GRID_MIN_W } from "@/shared/lib/dashboard"

/** 카드 하나가 놓일 기본 칸. `i`는 부르는 쪽이 채운다. */
export function slotFor(index: number, count = PER_ROW, soloH = SOLO_H): LayoutItem {
  if (count === 1) {
    return { i: "", x: 0, y: 0, w: SOLO_W, h: soloH, minW: GRID_MIN_W, minH: GRID_MIN_H }
  }
  return {
    i: "",
    x: (index % PER_ROW) * DEFAULT_W,
    y: Math.floor(index / PER_ROW) * DEFAULT_H,
    w: DEFAULT_W,
    h: DEFAULT_H,
    minW: GRID_MIN_W,
    minH: GRID_MIN_H,
  }
}
