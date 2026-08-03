import type { ChartType } from "@/components/chart-type-picker"
import type { ColumnInfo, ColumnType } from "@/lib/infer-types"

/**
 * 슬롯 key는 차트 종류를 넘나든다. 막대의 `series`와 선의 `series`는 같은 역할이므로,
 * 종류를 바꿔도 선택한 컬럼이 그대로 남는다. 반대로 `category`와 `x`는 다른 역할이라
 * 서로 넘어가지 않는다.
 */
export type MappingKey = "category" | "value" | "series" | "x" | "y" | "y2"

export type Mapping = Partial<Record<MappingKey, string>>

export type MappingSlot = {
  key: MappingKey
  label: string
  /** 이 슬롯이 차트에서 무엇이 되는지. 라벨만으로는 안 읽혀서 아래에 한 줄 붙인다. */
  hint: string
  optional?: boolean
  /**
   * 이 슬롯에 넣을 수 있는 컬럼 타입. 나머지는 후보에서 뺀다.
   * **순서가 곧 선호도다** — 앞쪽 타입이 목록 위에 오고 자동 선택에서 먼저 잡힌다.
   */
  accepts: ColumnType[]
  /** 시리즈 슬롯처럼 고유값이 적어야만 쓸 수 있는 경우 */
  maxDistinct?: number
  /**
   * 자동 선택에서 고유값이 너무 많거나(막대 수천 개) 하나뿐인(막대 하나) 컬럼을 뒤로
   * 미룰지. 후보에서 빼지는 않으니 직접 고르는 건 된다.
   */
  preferModerateCardinality?: boolean
}

/**
 * 색 슬롯이 8개라 시리즈도 8개가 상한이다. CLAUDE.md: "9번째 시리즈는 색을 새로
 * 만들지 말 것 — 기타로 묶거나 차트를 분할한다."
 */
const MAX_SERIES = 8

const VALUE: MappingSlot = {
  key: "value",
  label: "값",
  hint: "크기가 될 숫자",
  accepts: ["number"],
}
const CATEGORY: MappingSlot = {
  key: "category",
  label: "범주",
  hint: "막대·조각 하나하나가 될 기준",
  accepts: ["category", "date"],
  // 자동 선택이 극단을 피하게 한다. ID처럼 행마다 다른 컬럼은 막대 수천 개가 되고,
  // 값이 하나뿐인 컬럼은 막대 하나짜리 차트가 된다(둘 다 아무것도 못 보여준다).
  preferModerateCardinality: true,
}
const SERIES: MappingSlot = {
  key: "series",
  label: "분할",
  hint: "색으로 한 번 더 나눌 기준",
  optional: true,
  accepts: ["category", "date"],
  maxDistinct: MAX_SERIES,
}

/**
 * 선·영역의 X축은 순서만 있으면 되므로 셋 다 받는다 — 분기(`2026-Q2`)처럼 순서가 있는
 * 범주도 정당하다. 다만 날짜·숫자를 먼저 고른다. 지역처럼 순서 없는 범주를 선으로 이으면
 * 데이터에 없는 추세를 만들어낸다.
 */
const ORDERED_X: MappingSlot = {
  key: "x",
  label: "X축",
  hint: "가로로 늘어놓을 순서",
  accepts: ["date", "number", "category"],
}
const NUMERIC_Y: MappingSlot = {
  key: "y",
  label: "Y축",
  hint: "세로 높이가 될 숫자",
  accepts: ["number"],
}
/**
 * 선 차트에만 있는 두 번째 값. 왼쪽과 스케일이 다른 지표(매출 vs 전환율)를 한 화면에서
 * 보려고 오른쪽에 축을 하나 더 세운다.
 *
 * 두 축의 눈금을 어떻게 맞추느냐에 따라 선이 교차하는 자리가 달라져서, 데이터에 없는
 * 상관관계가 보일 수 있다. 그래서 **두 축 모두 0에서 시작**하고, 범례에 (좌)/(우)를
 * 적고, 축 이름 옆에 그 선의 색을 붙인다. 분할·개수 집계와는 함께 쓰지 않는다.
 */
const RIGHT_Y: MappingSlot = {
  key: "y2",
  label: "Y축(우)",
  hint: "오른쪽 축에 겹쳐 그릴 다른 숫자",
  optional: true,
  accepts: ["number"],
}

/**
 * 산점도와 궤적은 같은 슬롯을 쓴다 — 둘 다 행 하나가 점 하나고 두 축이 모두 수치다.
 * 다른 건 점을 잇느냐뿐이라, 슬롯을 하나로 묶어 두 종류가 갈라지지 않게 한다.
 *
 * 시리즈는 3개까지. 아무 두 점이나 나란히 놓일 수 있어서 4개부터 색 구분이
 * 무너진다(CLAUDE.md, dataviz의 series-count ladder).
 */
const POINT_SLOTS: MappingSlot[] = [
  { key: "x", label: "X축", hint: "가로 위치가 될 숫자", accepts: ["number"] },
  NUMERIC_Y,
  { ...SERIES, maxDistinct: 3 },
]

/** 집계하지 않고 행 하나를 점 하나로 그리는 종류. 집계 UI와 계산 경로가 갈린다. */
export function isPointChart(chartType: ChartType): boolean {
  return chartType === "scatter" || chartType === "path"
}

/**
 * 집계(합계/평균/개수)를 **고를 수 있는** 종류.
 * 산점도·궤적은 행 하나가 점 하나라 묶을 일이 없다.
 */
export function usesAggregation(chartType: ChartType): boolean {
  return !isPointChart(chartType)
}

/**
 * 점을 하나의 `<path>`로 잇는 종류.
 *
 * 창(`usePlotWindow`)이 필요한 이유는 마크 하나가 SVG 노드 하나이기 때문인데, 여기는
 * 점이 몇 개든 노드가 하나다. 자를 이유가 없고, 자르면 시계열의 모양 자체를 못 본다.
 */
export function isTimeline(chartType: ChartType): boolean {
  return chartType === "line" || chartType === "area"
}

/**
 * 기준선(평균·중앙값)을 걸 수 있는 종류.
 *
 * 값 축이 하나로 정해지는 곳만이다. 누적 막대는 "무엇의 평균"인지 모호하고, 이중 축이
 * 켜진 선 차트는 어느 축의 선인지 말할 수 없어 계산 쪽에서 다시 걸러낸다.
 */
export function allowsReference(chartType: ChartType): boolean {
  return (
    chartType === "line" || chartType === "area" || chartType === "bar" || chartType === "hbar"
  )
}

export const MAPPING_SLOTS: Record<ChartType, MappingSlot[]> = {
  bar: [CATEGORY, VALUE, SERIES],
  hbar: [CATEGORY, VALUE, SERIES],
  // 무엇으로 쌓을지가 없으면 그냥 막대라서 필수다.
  stacked: [CATEGORY, VALUE, { ...SERIES, label: "누적 기준", hint: "쌓아 올릴 기준", optional: false }],
  // 축이 둘이 될 수 있으므로 왼쪽도 이름에 자리를 밝힌다. 영역은 채움이 서로를 가려서
  // 오른쪽 축을 주지 않는다.
  line: [ORDERED_X, { ...NUMERIC_Y, label: "Y축(좌)", hint: "왼쪽 축 높이가 될 숫자" }, RIGHT_Y, SERIES],
  area: [ORDERED_X, NUMERIC_Y, SERIES],
  scatter: POINT_SLOTS,
  path: POINT_SLOTS,
  pie: [CATEGORY, VALUE],
}

/**
 * 지금 실제로 오른쪽 축에 그려질 컬럼. 집계·카드 헤더·사이드바가 **같은 규칙**을 봐야
 * 고른 컬럼이 조용히 무시되는 일이 없다.
 *
 * - 분할과 함께면 시리즈가 두 갈래(컬럼 2개 × 범주 N개)로 늘어나 색이 모자란다.
 * - 개수 집계는 값 컬럼을 세지 않아서 두 선이 똑같아진다.
 */
export function rightValueColumn(
  chartType: ChartType,
  mapping: Mapping,
  counting: boolean
): string | undefined {
  if (chartType !== "line") return undefined
  if (mapping.series || counting) return undefined
  return mapping.y2
}

/**
 * 이 슬롯이 지금 잠겨 있다면 그 이유. 트리거에 그대로 띄운다 — 비활성만 시켜두면
 * 왜 못 고르는지 알 수가 없다. 잠긴 동안에도 고른 값은 들고 있다가 잠금이 풀리면
 * 되살아난다(차트 종류를 오갈 때와 같은 방식).
 */
export function lockedReason(
  slot: MappingSlot,
  chartType: ChartType,
  mapping: Mapping,
  counting: boolean
): string | null {
  // 트리거 폭이 좁다. 이유는 "무엇이 막고 있는지"만 같은 길이로 적는다.
  if (slot.key === "y2") {
    if (counting) return "개수 집계 중"
    if (mapping.series) return "분할 사용 중"
    return null
  }
  // 잠자는 y2가 막대의 분할까지 잠그면 안 된다. 실제로 그려지고 있을 때만 잠근다.
  if (slot.key === "series" && rightValueColumn(chartType, mapping, counting)) {
    return "Y축(우) 사용 중"
  }
  return null
}

export function candidatesFor(slot: MappingSlot, columns: ColumnInfo[]): ColumnInfo[] {
  return columns
    .filter((column) => {
      // 값이 하나도 없는 컬럼은 어떤 슬롯에서도 그릴 게 없다. 후보로 두면 자동 선택이
      // 집어가서 "그릴 수 있는 값이 없습니다"로 끝난다 — 컬럼 목록에는 남아 있고
      // 거기서 "값이 모두 비어 있습니다"로 알려준다.
      //
      // 판정은 전수로 센 `distinctCount`로 한다. `sampled`는 띄엄띄엄 뽑은 결과라
      // 값이 드문드문 있는 컬럼에서 0이 나올 수 있다.
      if (column.distinctCount === 0) return false
      if (!slot.accepts.includes(column.type)) return false
      if (slot.maxDistinct === undefined) return true
      return !column.distinctCapped && column.distinctCount <= slot.maxDistinct
    })
    // 선호하는 타입이 위로. 같은 타입끼리는 원래 컬럼 순서를 지킨다.
    .sort((a, b) => slot.accepts.indexOf(a.type) - slot.accepts.indexOf(b.type))
}

/**
 * 차트 종류나 컬럼 타입이 바뀌면 예전 선택이 더는 후보가 아닐 수 있다. 그대로 두면
 * Select가 목록에 없는 값을 들고 빈칸으로 보이므로 걷어낸다.
 *
 * 지금 종류에 없는 슬롯의 값은 남겨둔다 — 그게 "같은 key면 유지"의 근거다. 그 값은
 * 해당 슬롯이 다시 나타날 때 그때의 후보와 대조된다.
 */
export function pruneMapping(
  mapping: Mapping,
  chartType: ChartType,
  columns: ColumnInfo[]
): Mapping {
  const known = new Set(columns.map((column) => column.name))
  const pruned: Mapping = {}

  for (const [key, selected] of Object.entries(mapping) as [MappingKey, string][]) {
    if (!known.has(selected)) continue // 컬럼 자체가 사라졌다
    const slot = MAPPING_SLOTS[chartType].find((candidate) => candidate.key === key)
    if (slot && !candidatesFor(slot, columns).some((column) => column.name === selected)) continue
    pruned[key] = selected
  }
  return pruned
}

/**
 * 비어 있는 필수 슬롯을 첫 후보로 채운다. 파일을 열자마자, 그리고 종류를 바꾼 직후에도
 * 차트가 보여야 하기 때문이다. 선택 슬롯(분할)은 건드리지 않는다 — 묻지도 않았는데
 * 시리즈를 쪼개면 놀란다.
 */
export function fillMapping(
  mapping: Mapping,
  chartType: ChartType,
  columns: ColumnInfo[]
): Mapping {
  const slots = MAPPING_SLOTS[chartType]
  const filled: Mapping = { ...mapping }
  // 지금 쓰이는 슬롯의 값만 "이미 쓴 컬럼"으로 본다. 잠자는 슬롯의 값까지 세면
  // 같은 컬럼을 다른 역할로 쓸 수 있는데도 막힌다.
  const used = new Set(slots.map((slot) => filled[slot.key]).filter(Boolean) as string[])

  for (const slot of slots) {
    if (slot.optional || filled[slot.key]) continue
    const free = candidatesFor(slot, columns).filter((column) => !used.has(column.name))

    // 값이 하나뿐이면 막대 하나짜리 차트고, 샘플에 값이 없었으면 대부분 빈 컬럼이다.
    // 둘 다 열자마자 보여줄 첫 차트로는 못 쓴다.
    const informative = free.filter((column) => column.sampled > 0 && column.distinctCount >= 2)
    // 범주 쪽은 반대 극단(ID처럼 행마다 다른 값)도 피한다.
    const pool = slot.preferModerateCardinality
      ? informative.filter((column) => !column.distinctCapped)
      : informative
    // 셋 다 비면 어쩔 수 없이 첫 후보. 아무것도 안 고르는 것보단 낫다.
    const preferred = pool[0] ?? informative[0] ?? free[0]
    if (preferred) {
      filled[slot.key] = preferred.name
      used.add(preferred.name)
    }
  }
  return filled
}
