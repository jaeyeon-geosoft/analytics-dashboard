import { seriesKey } from "@/shared/lib/aggregate/constants"
import type { ChartSeries } from "@/shared/lib/aggregate/types"

/** 시리즈가 어느 값 컬럼에서 나왔는지(`slot`)와 어느 분할 값의 것인지(`name`)까지 아는 시리즈. */
export type ResolvedSeries = ChartSeries & {
  /** 분할 컬럼의 값. 값 컬럼이 시리즈가 되는 경우에는 빈 문자열이다. */
  name: string
  /** `valueColumns`에서의 자리. 단일 값 컬럼이면 언제나 0이다. */
  slot: number
}

/** 값 컬럼이 없을 때(개수 집계) 단일 시리즈의 이름. */
const COUNT_SERIES_LABEL = "개수"

/**
 * 무엇이 시리즈가 되는지 정한다.
 *
 * **시리즈가 늘어나는 길은 언제나 한 갈래다.** 값 컬럼이 여럿이면 그 컬럼들이 곧
 * 시리즈이고, 아니면 분할 컬럼의 값들이 시리즈다. 둘은 함께 쓰지 않는다 — 사이드바에서도
 * 서로를 잠근다.
 *
 * 컬럼이 여럿이 되는 길은 둘인데 **뜻이 다르다.** 선의 `Y축(우)`는 스케일이 다른 지표를
 * 나란히 보려고 축을 가르는 것이고(`dual`), 누적 막대의 `값`은 같은 축 위에 쌓이는
 * 층이다. 축을 가르는지만 여기서 갈린다.
 */
export function resolveSeries(
  valueColumns: string[],
  seriesNames: Set<string>,
  valueColumn: string | undefined,
  dual: boolean
): ResolvedSeries[] {
  if (valueColumns.length > 1) {
    return valueColumns.map((column, index) => ({
      key: seriesKey(index),
      label: column,
      axis: dual ? (index === 0 ? ("left" as const) : ("right" as const)) : undefined,
      name: "",
      slot: index,
    }))
  }

  return [...seriesNames]
    .sort((a, b) => a.localeCompare(b))
    .map((name, index) => ({
      key: seriesKey(index),
      label: name || valueColumn || COUNT_SERIES_LABEL,
      name,
      slot: 0,
    }))
}

/** 프레임에 나가는 모양. 계산에만 쓰는 `name`·`slot`은 여기서 떨어진다. */
export function toChartSeries(resolved: ResolvedSeries[]): ChartSeries[] {
  return resolved.map(({ key, label, axis }) => ({ key, label, axis }))
}
