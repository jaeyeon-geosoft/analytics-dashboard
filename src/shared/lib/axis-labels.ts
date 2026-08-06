import type { ChartFrame } from "@/shared/lib/aggregate"

/** 앞부분을 뗄 때 여기서 끊는다. 한복판에서 자르면 시(hour)가 반토막 난다. */
const PREFIX_BOUNDARY = /[-_/:.T ]/
/** 이보다 짧은 공통부는 떼봐야 얻는 게 없다. */
const MIN_PREFIX = 4
/** 이보다 짧은 라벨은 애초에 안 잘린다. 뗄 이유가 없고, 떼면 맥락만 잃는다. */
const MIN_LABEL = 12

/** 이름이 길면 축에서 잘라 보여준다. 전체 이름은 툴팁과 표에 남는다. */
export function truncate(value: string, max = 12): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

/**
 * 모든 범주 라벨이 공유하는 앞부분.
 *
 * 축은 앞에서부터 잘라 보여주는데, 타임스탬프처럼 **구분되는 정보가 뒤에 있는** 값은
 * 그러면 눈금이 전부 `2024-10-16…`으로 같아진다. 공통부를 떼어 뒤를 보여주고, 뗀
 * 부분은 축 이름에 한 번만 적는다.
 *
 * 보이는 창이 아니라 **전체**에서 구한다 — 창마다 다시 구하면 스크롤할 때 같은 눈금이
 * 딴 뜻이 된다.
 */
export function sharedPrefix(rows: Record<string, string | number>[]): string {
  if (rows.length < 2) return ""

  let prefix = String(rows[0].x ?? "")
  let shortest = prefix.length
  for (const row of rows) {
    const value = String(row.x ?? "")
    if (value.length < shortest) shortest = value.length
    let index = 0
    while (index < prefix.length && index < value.length && prefix[index] === value[index]) {
      index += 1
    }
    prefix = prefix.slice(0, index)
    // 공통부가 없는 데이터(서울/부산/대구)가 대부분이라 여기서 일찍 빠져나온다.
    if (prefix.length < MIN_PREFIX) return ""
  }

  if (shortest <= MIN_LABEL) return ""

  let boundary = -1
  for (let index = prefix.length - 1; index >= 0; index -= 1) {
    if (PREFIX_BOUNDARY.test(prefix[index])) {
      boundary = index
      break
    }
  }
  const trimmed = boundary >= 0 ? prefix.slice(0, boundary + 1) : prefix

  // 가장 짧은 라벨을 통째로 먹으면 눈금이 빈 문자열이 된다.
  return trimmed.length >= MIN_PREFIX && trimmed.length < shortest ? trimmed : ""
}

/**
 * 값 축의 이름. 기준선을 골랐으면 그 값을 여기에 적는다 — 선 위에 붙이면 최대값
 * 직접 라벨과 같은 자리를 다툰다. 집계 방식을 적는 자리와 같다.
 */
export function valueAxisName(frame: ChartFrame): string {
  return frame.reference ? `${frame.yLabel} · ┄ ${frame.reference.label}` : frame.yLabel
}

/**
 * 축이 0에서 시작하지 않으면 이름에 적는다.
 *
 * 자동으로 좁히되 **숨기지는 않는다.** 원래 "축은 0에서 시작" 규칙이 걱정한 것은
 * 잘린 축 자체가 아니라 잘린 줄 모르고 읽는 것이다. 기준선 값도 선이 아니라 축
 * 이름에 적는 것과 같은 자리다.
 */
export function withOffsetNote(label: string, offset: boolean): string {
  return offset ? `${label} (0부터 아님)` : label
}

/** 공통부를 뗐다는 것을 축 이름에 한 번만 적는다. */
export function withPrefixNote(label: string, prefix: string): string {
  return prefix ? `${label} (앞 "${prefix}" 공통)` : label
}
