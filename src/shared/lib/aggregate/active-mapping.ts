import type { ChartType } from "@/shared/lib/chart-types"
import { MAPPING_SLOTS, type Mapping, type MappingKey } from "@/shared/lib/mapping-slots"

/**
 * 매핑은 지금 종류에 없는 슬롯의 값도 들고 있다("같은 key면 유지"의 대가). 그대로 읽으면
 * 분할 슬롯이 없는 원형이 시리즈로 쪼개지는 식으로 틀어진다.
 */
export function activeMapping(chartType: ChartType, mapping: Mapping): Mapping {
  const keys = new Set(MAPPING_SLOTS[chartType].map((slot) => slot.key))
  const active: Mapping = {}
  for (const [key, value] of Object.entries(mapping) as [MappingKey, string][]) {
    if (keys.has(key)) active[key] = value
  }
  return active
}
