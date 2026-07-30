import type { ChartType } from "@/components/chart-type-picker"
import { toDateOrder, toNumber, type ColumnInfo } from "@/lib/infer-types"
import { MAPPING_SLOTS, type Mapping, type MappingKey } from "@/lib/mapping-slots"

export type Aggregation = "sum" | "avg" | "count"

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
  sum: "합계",
  avg: "평균",
  count: "개수",
}

/** 막대가 1px가 되면 아무것도 못 읽는다. 상위 N개만 그리고 나머지는 잘렸다고 알린다. */
const MAX_CATEGORIES = 30

/** dataviz: 원형은 한눈에 보는 용도라 조각 6개까지. 나머지는 "기타"로 접는다. */
const MAX_SLICES = 6

export const OTHER_LABEL = "기타"

export type ChartSeries = { key: string; label: string }

export type ChartFrame = {
  /** `{ x: 범주/축값, [series.key]: 집계값 }` */
  rows: Record<string, string | number>[]
  series: ChartSeries[]
  xLabel: string
  yLabel: string
  /** 상한에 걸려 빠진 범주 수 */
  omitted: number
}

export type ScatterFrame = {
  series: { key: string; label: string; points: { x: number; y: number }[] }[]
  xLabel: string
  yLabel: string
  /** 점 상한에 걸려 빠진 행 수 */
  omitted: number
}

/** 산점도는 점이 많아지면 렌더링도 판독도 무너진다. */
const MAX_POINTS = 3000

/**
 * 매핑은 지금 종류에 없는 슬롯의 값도 들고 있다("같은 key면 유지"의 대가). 그대로 읽으면
 * 분할 슬롯이 없는 원형이 시리즈로 쪼개지는 식으로 틀어진다.
 */
function activeMapping(chartType: ChartType, mapping: Mapping): Mapping {
  const keys = new Set(MAPPING_SLOTS[chartType].map((slot) => slot.key))
  const active: Mapping = {}
  for (const [key, value] of Object.entries(mapping) as [MappingKey, string][]) {
    if (keys.has(key)) active[key] = value
  }
  return active
}

/** 집계는 개수만 값 컬럼 없이도 성립한다. */
function reduce(values: number[], aggregation: Aggregation, count: number): number {
  if (aggregation === "count") return count
  if (values.length === 0) return 0
  const total = values.reduce((sum, value) => sum + value, 0)
  return aggregation === "avg" ? total / values.length : total
}

/**
 * 범주(또는 X축)로 묶어 값을 집계한다. 분할 컬럼이 있으면 시리즈로 나눈다.
 *
 * 정렬은 차트가 무엇을 말하는지에 따라 다르다 — 막대·원형은 큰 것부터, 선·영역은
 * X축 순서대로. 순서를 뒤섞으면 추이가 거짓말이 된다.
 */
export function buildChartFrame(
  chartType: ChartType,
  rawMapping: Mapping,
  aggregation: Aggregation,
  columns: ColumnInfo[],
  rows: Record<string, string>[]
): ChartFrame | null {
  const mapping = activeMapping(chartType, rawMapping)
  const orderedByX = chartType === "line" || chartType === "area"
  const xColumn = orderedByX ? mapping.x : mapping.category
  const valueColumn = orderedByX ? mapping.y : mapping.value
  if (!xColumn) return null
  if (aggregation !== "count" && !valueColumn) return null

  const seriesColumn = mapping.series
  // 범주 → (시리즈 이름 → 값들)
  const buckets = new Map<string, Map<string, { values: number[]; count: number }>>()
  const seriesNames = new Set<string>()

  for (const row of rows) {
    const x = row[xColumn]
    if (typeof x !== "string" || x.trim() === "") continue

    const seriesName = seriesColumn ? (row[seriesColumn]?.trim() || "(없음)") : ""
    seriesNames.add(seriesName)

    let bucket = buckets.get(x)
    if (!bucket) {
      bucket = new Map()
      buckets.set(x, bucket)
    }
    let cell = bucket.get(seriesName)
    if (!cell) {
      cell = { values: [], count: 0 }
      bucket.set(seriesName, cell)
    }
    cell.count += 1
    if (valueColumn) {
      const value = toNumber(row[valueColumn] ?? "")
      if (value !== null) cell.values.push(value)
    }
  }

  if (buckets.size === 0) return null

  // key는 s0, s1… 로 만든다. 시리즈 이름을 그대로 쓰면 "x"라는 이름의 시리즈가
  // 범주 필드를 덮어쓴다.
  const resolved = [...seriesNames]
    .sort((a, b) => a.localeCompare(b))
    .map((name, index) => ({
      key: `s${index}`,
      label: name || (valueColumn ?? "개수"),
      name,
    }))
  const series: ChartSeries[] = resolved.map(({ key, label }) => ({ key, label }))

  let entries = [...buckets.entries()].map(([x, bucket]) => {
    const row: Record<string, string | number> = { x }
    let total = 0
    for (const { key, name } of resolved) {
      const cell = bucket.get(name)
      const value = cell ? reduce(cell.values, aggregation, cell.count) : 0
      row[key] = value
      total += value
    }
    return { row, total }
  })

  if (orderedByX) {
    const xType = columns.find((column) => column.name === xColumn)?.type
    entries.sort((a, b) => compareX(String(a.row.x), String(b.row.x), xType))
  } else {
    entries.sort((a, b) => b.total - a.total)
  }

  const limit = chartType === "pie" ? MAX_SLICES : MAX_CATEGORIES
  let omitted = 0
  if (entries.length > limit) {
    if (chartType === "pie") {
      // 원형은 잘라내면 전체가 안 맞는다. 나머지를 "기타"로 접어야 합이 유지된다.
      const kept = entries.slice(0, limit - 1)
      const rest = entries.slice(limit - 1)
      const otherRow: Record<string, string | number> = { x: OTHER_LABEL }
      for (const { key } of series) {
        otherRow[key] = rest.reduce((sum, entry) => sum + Number(entry.row[key] ?? 0), 0)
      }
      omitted = rest.length
      entries = [...kept, { row: otherRow, total: 0 }]
    } else {
      omitted = entries.length - limit
      entries = entries.slice(0, limit)
    }
  }

  return {
    rows: entries.map((entry) => entry.row),
    series,
    xLabel: xColumn,
    yLabel: valueColumn ? `${valueColumn} ${AGGREGATION_LABELS[aggregation]}` : "행 개수",
    omitted,
  }
}

function compareX(a: string, b: string, xType?: string): number {
  if (xType === "date") {
    const left = toDateOrder(a)
    const right = toDateOrder(b)
    if (left !== null && right !== null) return left - right
  }
  if (xType === "number") {
    const left = toNumber(a)
    const right = toNumber(b)
    if (left !== null && right !== null) return left - right
  }
  return a.localeCompare(b)
}

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
    if (kept >= MAX_POINTS) {
      omitted += 1
      continue
    }
    const name = seriesColumn ? (row[seriesColumn]?.trim() || "(없음)") : ""
    const points = grouped.get(name) ?? []
    points.push({ x, y })
    grouped.set(name, points)
    kept += 1
  }

  if (kept === 0) return null

  return {
    series: [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, points]) => ({ key: name || "points", label: name || yColumn, points })),
    xLabel: xColumn,
    yLabel: yColumn,
    omitted,
  }
}
