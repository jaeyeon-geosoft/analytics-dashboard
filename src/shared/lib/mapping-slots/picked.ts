import type { Mapping } from "@/shared/lib/mapping-slots/types"

/**
 * 슬롯 하나가 들고 있는 컬럼들.
 *
 * 슬롯 대부분은 컬럼 하나지만 `값`은 여럿을 받는다(누적 막대의 층). 읽는 쪽마다
 * `typeof === "string"`을 다시 묻게 두면 한 군데만 빠뜨려도 배열이 문자열처럼
 * 취급되어 조용히 틀린다 — 여기 한 번만 둔다.
 */
export function pickedColumns(picked: string | string[] | undefined): string[] {
  if (picked === undefined) return []
  return typeof picked === "string" ? [picked] : picked
}

/** 값 슬롯의 컬럼들. 안 골랐으면 빈 배열이고, 하나만 골랐으면 길이 1이다. */
export function valueColumns(mapping: Mapping): string[] {
  return pickedColumns(mapping.value)
}
