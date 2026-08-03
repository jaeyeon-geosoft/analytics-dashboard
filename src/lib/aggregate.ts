import type { ChartType } from "@/components/chart-type-picker"
import { toDateOrder, toNumber, type ColumnInfo } from "@/lib/infer-types"
import {
  MAPPING_SLOTS,
  rightValueColumn,
  type Mapping,
  type MappingKey,
} from "@/lib/mapping-slots"

export type Aggregation = "sum" | "avg" | "count"

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
  sum: "합계",
  avg: "평균",
  count: "개수",
}

/** dataviz: 원형은 한눈에 보는 용도라 조각 6개까지. 나머지는 "기타"로 접는다. */
const MAX_SLICES = 6

export const OTHER_LABEL = "기타"

/**
 * 기준선으로 그을 통계치. 임의의 숫자를 받지 않는 것은, 두 가지가 실제로 필요한 전부이고
 * (명목 주기 = 중앙값, 평균 주기 = 평균) 자유 입력을 열면 그 값이 무엇인지 아무도 모르는
 * 선이 차트에 남기 때문이다.
 */
export type Reference = "none" | "mean" | "median"

export const REFERENCE_LABELS: Record<Reference, string> = {
  none: "없음",
  mean: "평균",
  median: "중앙값",
}

/** 값 축 위의 한 점. */
export type ChartReference = {
  value: number
  /** 축 이름에 그대로 나가는 글자 */
  label: string
}

function statistic(sorted: number[], reference: Reference): number | null {
  if (reference === "none" || sorted.length === 0) return null
  if (reference === "median") {
    const middle = sorted.length >> 1
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
  }
  return sorted.reduce((sum, value) => sum + value, 0) / sorted.length
}

function referenceLabel(reference: Reference, value: number): string {
  return `${REFERENCE_LABELS[reference]} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`
}

export type ChartSeries = {
  key: string
  label: string
  /** 선 차트에서 두 지표를 나란히 볼 때만. 없으면 축이 하나다. */
  axis?: "left" | "right"
}

export type ChartFrame = {
  /** `{ x: 범주/축값, [series.key]: 집계값 }` */
  rows: Record<string, string | number>[]
  series: ChartSeries[]
  xLabel: string
  yLabel: string
  /** 오른쪽 축 이름. 축이 하나면 없다. */
  y2Label?: string
  /** 원형에서 "기타"로 접힌 범주 수. 다른 종류는 자르지 않으므로 항상 0 */
  folded: number
  /** 기준선. 고르지 않았으면 없다. */
  reference?: ChartReference
  /** 화면 해상도에 맞춰 줄였을 때의 **원래** 점 수. 줄이지 않았으면 없다. */
  sampledFrom?: number
}

/**
 * 선·영역이 한 번에 그릴 점 수.
 *
 * 창으로 자르지 않는 이유는 시계열은 모양이 곧 정보이기 때문인데, 그렇다고 다 그릴 수도
 * 없다 — 100,000점을 넘기면 `<path>`의 `d` 속성만 4.7MB가 되고 렌더가 **39초** 걸린다
 * (재렌더마다 40초씩 다시 든다. 실제로 탭이 얼어붙었다). 플롯 폭이 1,500px을 넘는 일이
 * 없으니 그 두 배면 픽셀당 두 점 — 눈으로 구분할 수 있는 한계다.
 */
const MAX_PLOT_POINTS = 3000

/**
 * 화면에 그릴 만큼으로 줄인다.
 *
 * 구간마다 **최솟값·최댓값 행을 남긴다.** 등간격으로 솎으면 한 점짜리 스파이크가 통째로
 * 사라지는데, 장비 로그에서는 그 튐이 찾으려는 것 자체다(22초 지연 한 번이 그렇다).
 * 남기는 것은 원본 행이라 라벨·툴팁·표는 그대로다.
 */
function downsample(
  rows: Record<string, string | number>[],
  series: ChartSeries[]
): Record<string, string | number>[] {
  if (rows.length <= MAX_PLOT_POINTS) return rows

  const buckets = Math.floor(MAX_PLOT_POINTS / 2)
  const span = rows.length / buckets
  // 양 끝은 무조건 남긴다 — 시계열의 시작과 끝이 잘리면 기간 자체가 달라 보인다.
  const keep = new Set<number>([0, rows.length - 1])

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const from = Math.floor(bucket * span)
    const to = Math.min(rows.length, Math.floor((bucket + 1) * span))
    let lowAt = from
    let highAt = from
    let low = Infinity
    let high = -Infinity
    for (let index = from; index < to; index += 1) {
      for (const entry of series) {
        const value = Number(rows[index][entry.key] ?? 0)
        if (value < low) {
          low = value
          lowAt = index
        }
        if (value > high) {
          high = value
          highAt = index
        }
      }
    }
    keep.add(lowAt)
    keep.add(highAt)
  }

  return [...keep].sort((a, b) => a - b).map((index) => rows[index])
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
 * 정렬은 축이 순서를 가졌느냐로 갈린다 — 날짜·숫자는 그 순서대로, 순서 없는 범주만
 * 값 큰 순으로. 순서를 뒤섞으면 추이가 거짓말이 된다.
 */
export function buildChartFrame(
  chartType: ChartType,
  rawMapping: Mapping,
  aggregation: Aggregation,
  columns: ColumnInfo[],
  rows: Record<string, string>[],
  reference: Reference = "none"
): ChartFrame | null {
  const mapping = activeMapping(chartType, rawMapping)
  const orderedByX = chartType === "line" || chartType === "area"
  const xColumn = orderedByX ? mapping.x : mapping.category
  const valueColumn = orderedByX ? mapping.y : mapping.value
  if (!xColumn) return null
  if (aggregation !== "count" && !valueColumn) return null

  const seriesColumn = mapping.series
  // 값 컬럼이 둘이면 그 둘이 곧 시리즈가 된다. 분할과는 함께 쓰지 않으므로
  // (사이드바에서도 잠긴다) 시리즈가 늘어나는 길은 언제나 한 갈래다.
  const rightColumn = rightValueColumn(chartType, mapping, aggregation === "count")
  const valueColumns = valueColumn ? [valueColumn, ...(rightColumn ? [rightColumn] : [])] : []
  const dual = valueColumns.length > 1

  // 범주 → (시리즈 이름 → 값들). `values[i]`가 `valueColumns[i]`의 값이다.
  const buckets = new Map<string, Map<string, { values: number[][]; count: number }>>()
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
      cell = { values: valueColumns.map(() => []), count: 0 }
      bucket.set(seriesName, cell)
    }
    cell.count += 1
    for (let index = 0; index < valueColumns.length; index += 1) {
      const value = toNumber(row[valueColumns[index]] ?? "")
      if (value !== null) cell.values[index].push(value)
    }
  }

  if (buckets.size === 0) return null

  // key는 s0, s1… 로 만든다. 시리즈 이름을 그대로 쓰면 "x"라는 이름의 시리즈가
  // 범주 필드를 덮어쓴다. `slot`은 그 시리즈가 어느 값 컬럼에서 나왔는지.
  const resolved: (ChartSeries & { name: string; slot: number })[] = dual
    ? valueColumns.map((column, index) => ({
        key: `s${index}`,
        label: column,
        axis: index === 0 ? ("left" as const) : ("right" as const),
        name: "",
        slot: index,
      }))
    : [...seriesNames]
        .sort((a, b) => a.localeCompare(b))
        .map((name, index) => ({
          key: `s${index}`,
          label: name || (valueColumn ?? "개수"),
          name,
          slot: 0,
        }))
  const series: ChartSeries[] = resolved.map(({ key, label, axis }) => ({ key, label, axis }))

  let entries = [...buckets.entries()].map(([x, bucket]) => {
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
    정렬은 축이 **순서를 가진 것이냐**로 갈린다.

    날짜·숫자는 그 자체로 순서가 있다. 값 큰 순으로 세우면 10월 16일이 10월 3일보다
    앞에 오는 식이 되어 축이 거짓말을 한다(실제로 시계열 막대가 시간 역순으로 나왔다).
    순서가 없는 범주(제품명·지역)만 값 큰 순으로 세운다 — 그때는 순위가 곧 차트의 일이다.
  */
  const xType = columns.find((column) => column.name === xColumn)?.type
  if (orderedByX || xType === "date" || xType === "number") {
    entries.sort((a, b) => compareX(String(a.row.x), String(b.row.x), xType))
  } else {
    entries.sort((a, b) => b.total - a.total)
  }

  // 범주는 자르지 않는다. 몇 개든 전부 그린다 — 잘라내면 분석가가 찾는 값이
  // 조용히 빠질 수 있다. 많으면 읽기 어려워지는 건 화면에서 알린다.
  let folded = 0
  if (chartType === "pie" && entries.length > MAX_SLICES) {
    // 원형만은 접는다. 조각을 잘라내면 합이 100%가 아니게 되고, 조각이 많으면
    // 각도로 순위를 가릴 수 없어 애초에 원형으로 볼 수 없는 데이터다.
    const kept = entries.slice(0, MAX_SLICES - 1)
    const rest = entries.slice(MAX_SLICES - 1)
    const otherRow: Record<string, string | number> = { x: OTHER_LABEL }
    for (const { key } of series) {
      otherRow[key] = rest.reduce((sum, entry) => sum + Number(entry.row[key] ?? 0), 0)
    }
    folded = rest.length
    entries = [...kept, { row: otherRow, total: 0 }]
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
    yLabel: valueColumn ? `${valueColumn} ${AGGREGATION_LABELS[aggregation]}` : "행 개수",
    y2Label: rightColumn ? `${rightColumn} ${AGGREGATION_LABELS[aggregation]}` : undefined,
    folded,
    reference: stat === null ? undefined : { value: stat, label: referenceLabel(reference, stat) },
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
