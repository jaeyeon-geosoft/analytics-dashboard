import { AGGREGATION_LABELS } from "@/shared/lib/chart-option-labels"
import type { Aggregation, CategoryOrder, Reference } from "@/shared/lib/chart-options"
import type { ChartType } from "@/shared/lib/chart-types"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import {
  activeMapping,
  isTimeline,
  pickedColumns,
  rightValueColumn,
  valueColumns,
  type Mapping,
} from "@/shared/lib/mapping-slots"
import { collectBuckets } from "@/shared/lib/aggregate/collect-buckets"
import { COUNT_LABEL } from "@/shared/lib/aggregate/constants"
import { downsample } from "@/shared/lib/aggregate/downsample"
import { foldSlices, type CategoryEntry } from "@/shared/lib/aggregate/fold-slices"
import { axisIsOrder, compareX } from "@/shared/lib/aggregate/order-rows"
import { reduce } from "@/shared/lib/aggregate/reduce"
import { resolveSeries, toChartSeries } from "@/shared/lib/aggregate/resolve-series"
import { referenceLabel, statistic } from "@/shared/lib/aggregate/statistics"
import type { ChartFrame } from "@/shared/lib/aggregate/types"

/**
 * 범주(또는 X축)로 묶어 값을 집계한다. 분할 컬럼이 있으면 시리즈로 나눈다.
 *
 * 날짜·숫자 축과 시계열은 축 자체가 순서라 그 순서대로 세운다. 순서 없는 범주만
 * `order`를 따른다(기본은 파일 순서). 순서를 뒤섞으면 추이가 거짓말이 된다.
 */
export function buildChartFrame(
  chartType: ChartType,
  rawMapping: Mapping,
  aggregation: Aggregation,
  columns: ColumnInfo[],
  rows: Record<string, string>[],
  reference: Reference = "none",
  order: CategoryOrder = "file"
): ChartFrame | null {
  const mapping = activeMapping(chartType, rawMapping)
  const orderedByX = isTimeline(chartType)
  const xColumn = orderedByX ? mapping.x : mapping.category
  /*
    값 컬럼이 여럿이면 그 컬럼 하나하나가 시리즈가 된다. 분할과는 함께 쓰지 않으므로
    (사이드바에서도 잠긴다) 시리즈가 늘어나는 길은 언제나 한 갈래다.

    누적 막대의 `값`은 층이 컬럼으로 펼쳐진 wide 모양을 그대로 받는 자리다 — 엑셀에서
    표를 통째로 잡아 누적 막대를 만드는 것과 같다. 선의 `Y축(우)`도 컬럼 둘을 시리즈로
    만들지만 그쪽은 축이 갈린다(`dual`).
  */
  const picked = orderedByX ? pickedColumns(mapping.y) : valueColumns(mapping)
  const valueColumn = picked[0]
  if (!xColumn) return null
  if (aggregation !== "count" && !valueColumn) return null

  const rightColumn = rightValueColumn(chartType, mapping, aggregation === "count")
  const columnList = valueColumn ? [...picked, ...(rightColumn ? [rightColumn] : [])] : []
  const dual = Boolean(rightColumn)

  const { buckets, seriesNames } = collectBuckets(rows, xColumn, columnList, mapping.series)
  if (buckets.size === 0) return null

  const resolved = resolveSeries(columnList, seriesNames, valueColumn, dual)
  const series = toChartSeries(resolved)

  let entries: CategoryEntry[] = [...buckets.entries()].map(([x, bucket]) => {
    const row: Record<string, string | number> = { x }
    let total = 0
    for (const { key, name, slot } of resolved) {
      const cell = bucket.get(name)
      const value = cell ? reduce(cell.values[slot], aggregation, cell.count) : 0
      row[key] = value
      total += value
    }
    return { row, total }
  })

  /*
    정렬.

    **날짜·숫자 축과 시계열은 축 자체가 순서다.** 값 큰 순으로 세우면 10월 16일이
    10월 3일보다 앞에 오는 식이 되어 축이 거짓말을 한다(실제로 시계열 막대가 시간
    역순으로 나왔다). 여기서는 고른 정렬을 보지 않는다.

    나머지 범주 축만 `order`를 따른다. 기본은 파일 순서 — `entries`가 이미 처음
    나온 순서이므로 **아무것도 하지 않는 것**이 파일 순서다.
  */
  const xType = columns.find((column) => column.name === xColumn)?.type
  if (axisIsOrder(orderedByX, xType)) {
    entries.sort((a, b) => compareX(String(a.row.x), String(b.row.x), xType))
  } else if (order === "value") {
    entries.sort((a, b) => b.total - a.total)
  } else if (order === "name") {
    entries.sort((a, b) => String(a.row.x).localeCompare(String(b.row.x)))
  }

  // 범주는 자르지 않는다. 몇 개든 전부 그린다 — 잘라내면 분석가가 찾는 값이
  // 조용히 빠질 수 있다. 많으면 읽기 어려워지는 건 화면에서 알린다.
  // 원형만은 합을 지키려고 나머지를 "기타"로 접는다.
  let folded = 0
  if (chartType === "pie") {
    const collapsed = foldSlices(entries, series)
    entries = collapsed.entries
    folded = collapsed.folded
  }

  // 기준선은 집계된 값 전체의 통계다. 줄이기 전에 낸다 — 줄인 뒤로 미루면 구간마다
  // 최소·최대만 남은 표본이라 평균이 실제와 달라진다. 축이 둘이면 어느 축의 선인지
  // 말할 수 없어서 걸지 않는다.
  const values = dual
    ? []
    : entries.flatMap((entry) =>
        series.map((column) => Number(entry.row[column.key] ?? 0)).filter(Number.isFinite)
      )
  const stat = statistic([...values].sort((a, b) => a - b), reference)

  const full = entries.map((entry) => entry.row)
  const plotted = orderedByX ? downsample(full, series) : full

  return {
    rows: plotted,
    sampledFrom: plotted.length < full.length ? full.length : undefined,
    series,
    xLabel: xColumn,
    /*
      값 컬럼이 여럿이면 축 이름은 집계 방식만 적는다. 컬럼 이름을 이어 붙이면 축
      이름이 한 줄을 넘기는데, 어느 층이 무엇인지는 이미 범례가 컬럼 이름 그대로
      말하고 있다. 집계 방식은 그래도 밝힌다 — 100만 행을 어떻게 줄였는지가 빠지면
      조용히 오독한다(CLAUDE.md).
    */
    yLabel: !valueColumn
      ? COUNT_LABEL
      : picked.length > 1
        ? AGGREGATION_LABELS[aggregation]
        : `${valueColumn} ${AGGREGATION_LABELS[aggregation]}`,
    y2Label: rightColumn ? `${rightColumn} ${AGGREGATION_LABELS[aggregation]}` : undefined,
    folded,
    reference: stat === null ? undefined : { value: stat, label: referenceLabel(reference, stat) },
  }
}
