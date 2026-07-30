import type { ChartType } from "@/components/chart-type-picker"
import type { ColumnInfo, ColumnType } from "@/lib/infer-types"

/**
 * 슬롯 key는 차트 종류를 넘나든다. 막대의 `series`와 선의 `series`는 같은 역할이므로,
 * 종류를 바꿔도 선택한 컬럼이 그대로 남는다. 반대로 `category`와 `x`는 다른 역할이라
 * 서로 넘어가지 않는다.
 */
export type MappingKey = "category" | "value" | "series" | "x" | "y"

export type Mapping = Partial<Record<MappingKey, string>>

export type MappingSlot = {
  key: MappingKey
  label: string
  optional?: boolean
  /** 이 슬롯에 넣을 수 있는 컬럼 타입. 나머지는 후보에서 뺀다. */
  accepts: ColumnType[]
  /** 시리즈 슬롯처럼 고유값이 적어야만 쓸 수 있는 경우 */
  maxDistinct?: number
}

/**
 * 색 슬롯이 8개라 시리즈도 8개가 상한이다. CLAUDE.md: "9번째 시리즈는 색을 새로
 * 만들지 말 것 — 기타로 묶거나 차트를 분할한다."
 */
const MAX_SERIES = 8

const VALUE: MappingSlot = { key: "value", label: "값", accepts: ["number"] }
const CATEGORY: MappingSlot = { key: "category", label: "범주", accepts: ["category", "date"] }
const SERIES: MappingSlot = {
  key: "series",
  label: "분할",
  optional: true,
  accepts: ["category", "date"],
  maxDistinct: MAX_SERIES,
}

/** 선·영역의 X축은 순서만 있으면 되므로 셋 다 받는다 (분기 같은 범주도 정당하다). */
const ORDERED_X: MappingSlot = { key: "x", label: "X축", accepts: ["date", "category", "number"] }
const NUMERIC_Y: MappingSlot = { key: "y", label: "Y축", accepts: ["number"] }

export const MAPPING_SLOTS: Record<ChartType, MappingSlot[]> = {
  bar: [CATEGORY, VALUE, SERIES],
  hbar: [CATEGORY, VALUE, SERIES],
  // 무엇으로 쌓을지가 없으면 그냥 막대라서 필수다.
  stacked: [CATEGORY, VALUE, { ...SERIES, label: "누적 기준", optional: false }],
  line: [ORDERED_X, NUMERIC_Y, SERIES],
  area: [ORDERED_X, NUMERIC_Y, SERIES],
  // 산점도는 두 축이 모두 수치여야 관계를 볼 수 있다.
  scatter: [
    { key: "x", label: "X축", accepts: ["number"] },
    NUMERIC_Y,
    SERIES,
  ],
  pie: [CATEGORY, VALUE],
}

export function candidatesFor(slot: MappingSlot, columns: ColumnInfo[]): ColumnInfo[] {
  return columns.filter((column) => {
    if (!slot.accepts.includes(column.type)) return false
    if (slot.maxDistinct === undefined) return true
    return !column.distinctCapped && column.distinctCount <= slot.maxDistinct
  })
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
    const pick = candidatesFor(slot, columns).find((column) => !used.has(column.name))
    if (pick) {
      filled[slot.key] = pick.name
      used.add(pick.name)
    }
  }
  return filled
}
