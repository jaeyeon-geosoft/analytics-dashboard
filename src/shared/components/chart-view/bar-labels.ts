import type { ChartFrame } from "@/shared/lib/aggregate"
import { TEXT } from "@/shared/lib/chart-colors"
import { labelNumber } from "@/shared/lib/number-format"

/** 직접 라벨이 붙을 자리를 담는 필드. 나머지 행은 빈 문자열이라 아무것도 안 그려진다. */
export const SPOT = "__spot"

/** 값·라벨 글자는 시리즈 색이 아니라 텍스트 색을 입는다(CLAUDE.md). */
export const SPOT_LABEL = {
  dataKey: SPOT,
  fill: TEXT,
  fontSize: 11,
  fontWeight: 600,
} as const

/** 라벨과 막대 끝 사이의 간격(px). */
export const SPOT_OFFSET = 8

/**
 * 11px 숫자 한 글자의 대략적인 폭(px)과 라벨 양옆 여유. **재지 않고 어림잡는다** —
 * 이 값이 가르는 것은 "라벨이 칸에 들어가는가" 하나뿐이라 정확할 필요가 없다.
 */
const DIGIT_W = 6.6
const LABEL_PAD = 8

/** 값 축과 좌우 여백이 먹는 폭. 막대 한 칸의 폭을 어림할 때 뺀다. */
export const VALUE_AXIS_W = 72

/** 가장 긴 값 라벨의 어림 폭(px). 칸에 들어가는지 재는 쪽과 자리를 비우는 쪽이 함께 쓴다. */
export function valueLabelWidth(frame: ChartFrame): number {
  const key = frame.series[0]?.key
  if (!key) return 0
  const longest = frame.rows.reduce(
    (most, row) => Math.max(most, labelNumber(row[key]).length),
    0
  )
  return longest * DIGIT_W + LABEL_PAD
}

/**
 * 막대 끝에 값을 적어 넣는다. 라벨을 render prop으로 그리는 대신 데이터에 얹으면
 * Recharts의 `LabelList`가 알아서 위치를 잡는다.
 *
 * `everyBar`면 보이는 막대 전부에, 아니면 **최대값 한 곳에만** 적는다. 값을 읽는
 * 도구라 전부 적는 쪽이 기본이지만, 칸이 글자보다 좁으면 숫자끼리 겹쳐 아무것도
 * 못 읽는다 — 그때는 최대값 하나로 물러난다(판단은 `BarView`가 한다).
 *
 * **창으로 자르기 전에** 붙인다 — 그래야 최대값이 창 안의 최대가 아니라 진짜 최대다.
 */
export function withSpotLabel(frame: ChartFrame, everyBar: boolean) {
  const key = frame.series[0]?.key
  if (!key || frame.rows.length === 0) return frame.rows

  if (everyBar) {
    return frame.rows.map((row) => ({ ...row, [SPOT]: labelNumber(row[key]) }))
  }

  const spot = frame.rows.reduce(
    (best, row, index) => (Number(row[key]) > Number(frame.rows[best][key]) ? index : best),
    0
  )

  return frame.rows.map((row, index) => ({
    ...row,
    [SPOT]: index === spot ? labelNumber(row[key]) : "",
  }))
}
