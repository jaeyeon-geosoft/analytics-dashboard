import { DISTINCT_CAP } from "@/shared/lib/infer-types/constants"
import { isMissing } from "@/shared/lib/infer-types/parse-value"

/** 세다 멈췄으면 `distinctCapped`가 서고, 그때 `distinctCount`는 "그 이상"이라는 뜻이다. */
export type DistinctCount = {
  distinctCount: number
  distinctCapped: boolean
}

/** 고유값을 **전수로** 센다. 샘플로 세면 값이 드문드문 있는 컬럼에서 0이 나온다. */
export function countDistinct(name: string, rows: Record<string, string>[]): DistinctCount {
  const seen = new Set<string>()
  for (const row of rows) {
    const value = row[name]
    if (typeof value !== "string" || isMissing(value)) continue
    seen.add(value)
    // 고유값이 많은 컬럼일수록 여기서 일찍 빠져나온다.
    if (seen.size > DISTINCT_CAP) return { distinctCount: DISTINCT_CAP, distinctCapped: true }
  }
  return { distinctCount: seen.size, distinctCapped: false }
}
