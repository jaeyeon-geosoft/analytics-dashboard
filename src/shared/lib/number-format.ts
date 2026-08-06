/** 축을 몇 칸으로 보고 눈금 간격을 어림할지. 자릿수를 정하는 데만 쓴다. */
const TICK_STEPS = 5

/** 소수점을 이보다 더 늘리지 않는다. 눈금이 길어지면 서로 겹친다. */
const MAX_DIGITS = 4

/**
 * 축 눈금은 자릿수를 줄여 읽히게 한다. 1234567 → 1.2M
 *
 * `span`(축 전체 폭)을 주면 **자릿수를 거기서 정한다.** 자릿수를 못 박으면 축이 좁을 때
 * 눈금이 전부 같은 글자가 된다 — 12,480~12,550 구간에서 "12.5K"가 다섯 번 찍혔다.
 * 축을 좁혀 놓고 눈금을 못 읽으면 좁힌 의미가 없다.
 */
export function compact(value: number, span = 0): string {
  const size = Math.abs(value)
  const unit = size >= 1_000_000 ? 1_000_000 : size >= 1_000 ? 1_000 : 1
  const suffix = unit === 1_000_000 ? "M" : unit === 1_000 ? "K" : ""
  const scaled = value / unit

  // 범위를 모르면 예전대로 — 산점도처럼 축을 Recharts에 맡기는 자리다.
  if (!(span > 0)) {
    if (unit === 1) return Number.isInteger(value) ? String(value) : value.toFixed(2)
    return `${scaled.toFixed(1)}${suffix}`
  }

  // 눈금 간격이 이 단위에서 몇 번째 소수 자리에 오는지.
  const step = span / TICK_STEPS / unit
  const digits = Math.min(MAX_DIGITS, Math.max(unit === 1 ? 0 : 1, Math.ceil(-Math.log10(step))))
  return `${scaled.toFixed(digits)}${suffix}`
}

/** 축 하나의 눈금 포맷터. 참조가 매 렌더 바뀌면 Recharts가 다시 재니 memo해서 쓴다. */
export function tickFormatFor(domain?: [number, number]) {
  const span = domain ? domain[1] - domain[0] : 0
  return (value: number) => compact(value, span)
}

/** 눈금이 196,323 같은 수로 끝나지 않게 한 자리 위로 올린다. */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

/** 직접 라벨에 적는 값. 소수는 한 자리까지만 — 막대 끝에 긴 수가 서면 겹친다. */
export function labelNumber(value: unknown): string {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
}
