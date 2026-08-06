import type { ChartType } from "@/shared/lib/chart-types"
import { pickedColumns } from "@/shared/lib/mapping-slots/picked"
import { MAPPING_SLOTS } from "@/shared/lib/mapping-slots/slots"
import type { Mapping } from "@/shared/lib/mapping-slots/types"

/**
 * 지금 종류에 **실제로 있는 슬롯의 값만** 남긴다.
 *
 * 매핑은 종류에 없는 슬롯의 값도 들고 있다 — 그게 "같은 key면 유지"의 대가다(종류를
 * 되돌리면 고른 값이 살아난다). 그대로 읽으면 분할 슬롯이 없는 원형이 시리즈로 쪼개지고,
 * 막대에서 선으로 바꾼 카드가 잠자는 `category`를 부제에 적는 식으로 틀어진다.
 *
 * 집계와 카드 머리줄이 **같은 것을 봐야** 그린 것과 적힌 것이 어긋나지 않는다.
 *
 * **모양도 여기서 맞춘다.** 같은 `값` key가 누적 막대에서는 컬럼 여럿, 막대에서는
 * 하나다. 저장된 목록은 그대로 두고(누적 막대로 돌아오면 층이 살아나야 한다) 읽을 때
 * 지금 종류의 모양으로 줄인다 — 안 줄이면 막대가 층 둘을 시리즈 둘로 나란히 그린다.
 */
export function activeMapping(chartType: ChartType, mapping: Mapping): Mapping {
  const active: Mapping = {}
  for (const slot of MAPPING_SLOTS[chartType]) {
    const picked = pickedColumns(mapping[slot.key])
    if (picked.length === 0) continue
    // key마다 값의 타입이 다르다(`value`만 배열이 될 수 있다). 색인 대입으로는
    // 그 짝이 좁혀지지 않아 한 key씩 쓴다.
    Object.assign(active, { [slot.key]: slot.multiple ? picked : picked[0] })
  }
  return active
}
