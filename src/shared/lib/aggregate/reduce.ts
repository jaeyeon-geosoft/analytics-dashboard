import type { Aggregation } from "@/shared/lib/chart-options"

/** 한 칸에 모인 값들을 하나로 접는다. 집계는 개수만 값 컬럼 없이도 성립한다. */
export function reduce(values: number[], aggregation: Aggregation, count: number): number {
  if (aggregation === "count") return count
  if (values.length === 0) return 0
  const total = values.reduce((sum, value) => sum + value, 0)
  return aggregation === "avg" ? total / values.length : total
}
