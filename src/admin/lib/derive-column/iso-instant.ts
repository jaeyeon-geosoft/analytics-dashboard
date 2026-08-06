/**
 * ISO 8601 순간(instant). 날짜만 있고 시각이 없는 형식은 일부러 뺐다 — 하루 단위
 * 값으로 초 시차를 내면 0 아니면 86400만 나와서 아무것도 못 읽는다.
 *
 * `new Date(문자열)`에 아무 값이나 넘기지 않는다(CLAUDE.md). 패턴을 먼저 확인하고
 * 통과한 것만 `Date.parse`에 넘긴다 — ISO 형식만큼은 명세가 파싱을 보장한다.
 */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/

export function toInstant(value: string): number | null {
  const trimmed = value.trim()
  if (!ISO_INSTANT.test(trimmed)) return null
  // 공백 구분자는 명세 밖이라 T로 맞춰준다. 마이크로초 자리는 Date.parse가 잘라낸다.
  const ms = Date.parse(trimmed.replace(" ", "T"))
  return Number.isFinite(ms) ? ms : null
}
