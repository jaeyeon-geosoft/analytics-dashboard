import { MAX_SLICES, OTHER_LABEL } from "@/shared/lib/aggregate/constants"
import type { ChartSeries } from "@/shared/lib/aggregate/types"

/** 집계가 끝난 범주 한 줄. `total`은 정렬과 접기에만 쓰는 값이라 프레임에 나가지 않는다. */
export type CategoryEntry = {
  row: Record<string, string | number>
  total: number
}

/**
 * 원형의 조각을 상한까지 줄이고 나머지를 "기타"로 접는다.
 *
 * 조각을 **잘라내지 않는다** — 잘라내면 합이 100%가 아니게 된다. 조각이 많으면 각도로
 * 순위를 가릴 수 없어 애초에 원형으로 볼 수 없는 데이터이기도 하다.
 *
 * **접는 기준은 언제나 값이다.** 정렬이 파일 순서면 뒤에 있다는 이유로 큰 조각이 접힐 수
 * 있는데, 그러면 "기타"가 제일 큰 조각이 되어 원형을 볼 이유가 사라진다. 남길 것만 값으로
 * 고르고, 세우는 순서는 앞에서 정한 그대로 둔다.
 */
export function foldSlices(
  entries: CategoryEntry[],
  series: ChartSeries[]
): { entries: CategoryEntry[]; folded: number } {
  if (entries.length <= MAX_SLICES) return { entries, folded: 0 }

  const small = new Set(
    [...entries]
      .sort((a, b) => b.total - a.total)
      .slice(MAX_SLICES - 1)
      .map((entry) => entry.row.x)
  )
  const kept = entries.filter((entry) => !small.has(entry.row.x))
  const rest = entries.filter((entry) => small.has(entry.row.x))

  const otherRow: Record<string, string | number> = { x: OTHER_LABEL }
  for (const { key } of series) {
    otherRow[key] = rest.reduce((sum, entry) => sum + Number(entry.row[key] ?? 0), 0)
  }

  return { entries: [...kept, { row: otherRow, total: 0 }], folded: rest.length }
}
