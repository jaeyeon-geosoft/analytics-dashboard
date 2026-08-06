import {
  DATE_PATTERNS,
  LEADING_ZERO_INTEGER,
  MAX_YEAR,
  MIN_YEAR,
  MISSING,
  NUMERIC_NOISE,
} from "@/shared/lib/infer-types/constants"

/**
 * 값 하나를 읽는 규칙. **추론과 집계가 같은 함수를 쓴다** — 규칙이 두 벌이면 추론은
 * 숫자라고 한 컬럼을 집계가 못 읽는 일이 생긴다.
 */

export function isMissing(value: string): boolean {
  return MISSING.has(value.trim().toLowerCase())
}

/** 숫자로 읽히면 그 값, 아니면 null. */
export function toNumber(value: string): number | null {
  const stripped = value.trim().replace(NUMERIC_NOISE, "")
  if (stripped === "") return null
  const parsed = Number(stripped)
  return Number.isFinite(parsed) ? parsed : null
}

export function isNumber(value: string): boolean {
  // 선행 0이 붙은 **정수**는 우편번호·사번·전화번호일 가능성이 높다. 숫자로 보면
  // 0이 날아가서 원본을 잃는다. 소수점이 있으면 그런 식별자가 아니므로
  // `03.1`까지 범주로 몰면 안 된다.
  if (LEADING_ZERO_INTEGER.test(value.trim())) return false
  return toNumber(value) !== null
}

/** 날짜로 읽히면 정렬에 쓸 수 있는 수, 아니면 null. */
export function toDateOrder(value: string): number | null {
  const trimmed = value.trim()
  for (const pattern of DATE_PATTERNS) {
    const match = pattern.exec(trimmed)
    if (!match) continue
    const year = Number(match[1])
    const month = Number(match[2])
    const day = match[3] === undefined ? 1 : Number(match[3])
    if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1 || day > 31) {
      return null
    }
    return year * 10000 + month * 100 + day
  }
  return null
}

export function isDate(value: string): boolean {
  return toDateOrder(value) !== null
}
