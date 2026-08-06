import type { ChartType } from "@/shared/lib/chart-types"
import { MAPPING_SLOTS } from "@/shared/lib/mapping-slots/slots"
import type { Mapping, MappingKey } from "@/shared/lib/mapping-slots/types"

/**
 * 지금 종류에 **실제로 있는 슬롯의 값만** 남긴다.
 *
 * 매핑은 종류에 없는 슬롯의 값도 들고 있다 — 그게 "같은 key면 유지"의 대가다(종류를
 * 되돌리면 고른 값이 살아난다). 그대로 읽으면 분할 슬롯이 없는 원형이 시리즈로 쪼개지고,
 * 막대에서 선으로 바꾼 카드가 잠자는 `category`를 부제에 적는 식으로 틀어진다.
 *
 * 집계와 카드 머리줄이 **같은 것을 봐야** 그린 것과 적힌 것이 어긋나지 않는다.
 */
export function activeMapping(chartType: ChartType, mapping: Mapping): Mapping {
  const keys = new Set(MAPPING_SLOTS[chartType].map((slot) => slot.key))
  const active: Mapping = {}
  for (const [key, value] of Object.entries(mapping) as [MappingKey, string][]) {
    if (keys.has(key)) active[key] = value
  }
  return active
}
