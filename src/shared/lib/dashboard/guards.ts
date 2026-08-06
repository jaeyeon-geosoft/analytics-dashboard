import type { ParseResult } from "@/shared/lib/dashboard/types"

/** 검증에서 되풀이되는 물음들. 규칙이 아니라 도구라 따로 둔다. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isLayout(value: unknown): boolean {
  return (
    isRecord(value) &&
    ["x", "y", "w", "h"].every((key) => typeof value[key] === "number" && Number.isFinite(value[key]))
  )
}

/**
 * 슬롯 → 컬럼 이름. `값`만 컬럼을 여럿 들 수 있어 배열도 받는다.
 *
 * 어느 이름이 실제로 있는 컬럼인지까지는 보지 않는다 — 없는 컬럼은 렌더러가 스스로
 * 빈 차트 대신 이유를 띄운다. 여기서 보는 것은 **모양**뿐이다.
 */
export function isMapping(value: unknown): boolean {
  if (!isRecord(value)) return false
  return Object.values(value).every(
    (picked) =>
      typeof picked === "string" ||
      (Array.isArray(picked) && picked.every((name) => typeof name === "string"))
  )
}

/** 실패 문구에 값을 넣을 때. 사용자가 무엇을 고쳐야 하는지 보이게 한다. */
export function describe(value: unknown): string {
  if (value === undefined) return "없음"
  if (typeof value === "string") return `"${value}"`
  return String(value)
}

export function fail(reason: string): ParseResult {
  return { ok: false, reason }
}
