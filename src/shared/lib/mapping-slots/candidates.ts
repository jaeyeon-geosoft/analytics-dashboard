import type { ChartType } from "@/shared/lib/chart-types"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import { MIN_INFORMATIVE_DISTINCT } from "@/shared/lib/mapping-slots/constants"
import { MAPPING_SLOTS } from "@/shared/lib/mapping-slots/slots"
import type { Mapping, MappingKey, MappingSlot } from "@/shared/lib/mapping-slots/types"

/** 이 슬롯에 넣을 수 있는 컬럼들. 선호하는 타입이 위로 온다. */
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
    const informative = free.filter(
      (column) => column.sampled > 0 && column.distinctCount >= MIN_INFORMATIVE_DISTINCT
    )
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
