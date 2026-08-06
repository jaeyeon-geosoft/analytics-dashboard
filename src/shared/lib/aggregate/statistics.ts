import { REFERENCE_LABELS } from "@/shared/lib/chart-option-labels"
import type { Reference } from "@/shared/lib/chart-options"

/** 오름차순으로 정렬된 값에서 기준선 값을 낸다. 고르지 않았거나 값이 없으면 `null`. */
export function statistic(sorted: number[], reference: Reference): number | null {
  if (reference === "none" || sorted.length === 0) return null
  if (reference === "median") {
    const middle = sorted.length >> 1
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
  }
  return sorted.reduce((sum, value) => sum + value, 0) / sorted.length
}

/** 축 이름에 붙는 글자. 선 위에 적으면 최대값 직접 라벨과 자리를 다툰다. */
export function referenceLabel(reference: Reference, value: number): string {
  return `${REFERENCE_LABELS[reference]} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`
}
