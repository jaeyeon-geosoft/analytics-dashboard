import { toDateOrder, toNumber, type ColumnType } from "@/shared/lib/infer-types"

/**
 * 범주 축의 두 값을 견준다. 타입을 알면 그 타입의 순서로, 모르면 글자순으로.
 *
 * 날짜·숫자를 글자로 견주면 10월 16일이 10월 3일보다 앞에 오는 식이 된다.
 */
export function compareX(a: string, b: string, xType?: ColumnType): number {
  if (xType === "date") {
    const left = toDateOrder(a)
    const right = toDateOrder(b)
    if (left !== null && right !== null) return left - right
  }
  if (xType === "number") {
    const left = toNumber(a)
    const right = toNumber(b)
    if (left !== null && right !== null) return left - right
  }
  return a.localeCompare(b)
}

/**
 * 축 자체가 순서인가.
 *
 * 시계열(선·영역)과 날짜·숫자 축이 여기 해당한다. 그런 축에서는 사용자가 고른 정렬을
 * **보지 않는다** — 값 큰 순으로 세우면 축이 거짓말을 한다(실제로 시계열 막대가 시간
 * 역순으로 나왔다).
 */
export function axisIsOrder(orderedByX: boolean, xType?: ColumnType): boolean {
  return orderedByX || xType === "date" || xType === "number"
}
