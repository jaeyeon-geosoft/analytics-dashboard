import { EMPTY_SERIES_LABEL } from "@/shared/lib/aggregate/constants"
// 추론과 집계가 같은 규칙으로 숫자를 읽어야 한다. 여기서 한 번 더 정의하지 않는다.
import { toNumber } from "@/shared/lib/infer-types"

/** 범주 × 시리즈 한 칸. `values[i]`가 `valueColumns[i]`의 값들이다. */
export type Cell = {
  values: number[][]
  count: number
}

/** 범주 → (시리즈 이름 → 칸). 삽입 순서가 곧 파일 순서다. */
export type Buckets = Map<string, Map<string, Cell>>

export type Collected = {
  buckets: Buckets
  /** 실제로 나타난 분할 값들. 분할 컬럼이 없으면 빈 이름 하나만 들어 있다. */
  seriesNames: Set<string>
}

/**
 * 행을 범주(또는 X축)와 분할로 묶는다. **한 번만 훑는다** — 집계 방식과 무관하게 값과
 * 행 수를 함께 모아두면 합계·평균·개수가 같은 통과에서 나온다.
 *
 * 범주가 비어 있는 행은 버린다. 축에 세울 자리가 없어서 그린다면 이름 없는 마크가 된다.
 */
export function collectBuckets(
  rows: Record<string, string>[],
  xColumn: string,
  valueColumns: string[],
  seriesColumn: string | undefined
): Collected {
  const buckets: Buckets = new Map()
  const seriesNames = new Set<string>()

  for (const row of rows) {
    const x = row[xColumn]
    if (typeof x !== "string" || x.trim() === "") continue

    const seriesName = seriesColumn ? row[seriesColumn]?.trim() || EMPTY_SERIES_LABEL : ""
    seriesNames.add(seriesName)

    let bucket = buckets.get(x)
    if (!bucket) {
      bucket = new Map()
      buckets.set(x, bucket)
    }
    let cell = bucket.get(seriesName)
    if (!cell) {
      cell = { values: valueColumns.map(() => []), count: 0 }
      bucket.set(seriesName, cell)
    }
    cell.count += 1
    for (let index = 0; index < valueColumns.length; index += 1) {
      const value = toNumber(row[valueColumns[index]] ?? "")
      if (value !== null) cell.values[index].push(value)
    }
  }

  return { buckets, seriesNames }
}
