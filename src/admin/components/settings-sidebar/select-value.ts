/**
 * Radix SelectItem은 빈 문자열 value를 못 받아서 "없음"에 별도 값이 필요하다.
 * 컬럼 쪽에 접두사를 붙여두면 `없음`이라는 이름의 컬럼이 있어도 겹치지 않는다.
 */
export const NONE_VALUE = "none"

const COLUMN_PREFIX = "col:"

export function toSelectValue(column: string): string {
  return `${COLUMN_PREFIX}${column}`
}

/** 고른 값에서 컬럼 이름을 되꺼낸다. "없음"이면 `undefined`. */
export function fromSelectValue(value: string): string | undefined {
  return value === NONE_VALUE ? undefined : value.slice(COLUMN_PREFIX.length)
}
