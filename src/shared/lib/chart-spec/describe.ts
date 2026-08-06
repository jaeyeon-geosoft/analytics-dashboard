import { MAPPING_SLOTS, rightValueColumn } from "@/shared/lib/mapping-slots"
import type { ChartSpec } from "@/shared/lib/chart-spec/types"

/** 매핑을 사람이 읽는 문장으로 푼 것. 카드 머리줄과 내보내기 제목이 같은 것을 본다. */
export type MappingDescription = {
  /** `지역 → 매출`처럼 축의 흐름 하나로 이은 것 */
  axes: string
  /** 흐름에 끼우지 않는 것들(분할·오른쪽 축) */
  aside?: string
  /** 무엇을 재는 차트인가 — 값(또는 Y축) 컬럼. 카드 제목이 된다. */
  measure?: string
  /** 무엇을 기준으로 갈랐나 — 범주(또는 X축) 컬럼. 제목 아래 줄로 간다. */
  by?: string
}

/** 축의 흐름에 끼우지 않는 슬롯. X→Y의 방향이 아니라 그 위에 얹히는 것들이다. */
const ASIDE_KEYS = new Set(["series", "y2"])

/**
 * 카드가 무엇을 그리고 있는지 한 줄로. 네 장이 나란히 서면 종류만으로는 구분이 안 된다.
 * 분할과 오른쪽 축은 X→Y의 흐름이 아니므로 화살표에 끼우지 않고 뒤에 덧붙인다.
 *
 * 내보낼 때 차트 제목으로도 쓴다 — 카드 머리와 뷰어가 같은 문장을 쓰게 하려고 export한다.
 */
export function describeMapping(spec: ChartSpec): MappingDescription {
  const slots = MAPPING_SLOTS[spec.chartType]
  const axes = slots
    .filter((slot) => !ASIDE_KEYS.has(slot.key))
    .map((slot) => spec.mapping[slot.key])
    .filter(Boolean)
    .join(" → ")

  const right = rightValueColumn(spec.chartType, spec.mapping, spec.aggregation === "count")
  const hasSeries = slots.some((slot) => slot.key === "series")
  const aside = [
    right && `${right}(우)`,
    hasSeries ? spec.mapping.series : undefined,
  ].filter(Boolean)

  /*
    카드 머리줄의 위계를 위해 둘을 따로 낸다. 한 줄로 이어 붙인 `axes`는 카드가 좁아질 때
    **앞에서부터** 잘려서, 정작 무엇을 재는 차트인지가 먼저 사라졌다.

    슬롯 이름이 종류마다 다르다(막대는 `범주`/`값`, 선은 `X축`/`Y축`). 개수 집계는 값
    컬럼이 없으므로 `measure`도 없다 — 그때는 카드가 "행 개수"를 제목으로 쓴다.
  */
  return {
    axes,
    aside: aside.length > 0 ? aside.join(" · ") : undefined,
    measure: spec.mapping.value ?? spec.mapping.y,
    by: spec.mapping.category ?? spec.mapping.x,
  }
}
