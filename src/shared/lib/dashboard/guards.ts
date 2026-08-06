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

/** 실패 문구에 값을 넣을 때. 사용자가 무엇을 고쳐야 하는지 보이게 한다. */
export function describe(value: unknown): string {
  if (value === undefined) return "없음"
  if (typeof value === "string") return `"${value}"`
  return String(value)
}

export function fail(reason: string): ParseResult {
  return { ok: false, reason }
}
