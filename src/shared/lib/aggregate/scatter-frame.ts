import { toNumber } from "@/shared/lib/infer-types"
import type { Mapping } from "@/shared/lib/mapping-slots"
import { activeMapping } from "@/shared/lib/aggregate/active-mapping"
import { EMPTY_SERIES_LABEL, MAX_SCATTER_POINTS } from "@/shared/lib/aggregate/constants"
import type { ScatterFrame } from "@/shared/lib/aggregate/types"

/** 시리즈 이름이 비었을 때 쓰는 필드 이름. 프레임의 `key`는 비어 있으면 안 된다. */
const SINGLE_SERIES_KEY = "points"

/**
 * 행 하나를 점 하나로 만든다. 묶지 않으므로 집계가 없고, 상한을 넘는 행은 **버린다**
 * (몇 개를 버렸는지는 `omitted`로 나가 카드가 화면에 밝힌다).
 */
export function buildScatterFrame(
  rawMapping: Mapping,
  rows: Record<string, string>[]
): ScatterFrame | null {
  const { x: xColumn, y: yColumn, series: seriesColumn } = activeMapping("scatter", rawMapping)
  if (!xColumn || !yColumn) return null

  const grouped = new Map<string, { x: number; y: number }[]>()
  let kept = 0
  let omitted = 0

  for (const row of rows) {
    const x = toNumber(row[xColumn] ?? "")
    const y = toNumber(row[yColumn] ?? "")
    if (x === null || y === null) continue
    if (kept >= MAX_SCATTER_POINTS) {
      omitted += 1
      continue
    }
    const name = seriesColumn ? row[seriesColumn]?.trim() || EMPTY_SERIES_LABEL : ""
    const points = grouped.get(name) ?? []
    points.push({ x, y })
    grouped.set(name, points)
    kept += 1
  }

  if (kept === 0) return null

  return {
    series: [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, points]) => ({ key: name || SINGLE_SERIES_KEY, label: name || yColumn, points })),
    xLabel: xColumn,
    yLabel: yColumn,
    omitted,
  }
}
