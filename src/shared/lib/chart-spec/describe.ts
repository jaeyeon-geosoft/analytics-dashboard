import {
  MAPPING_SLOTS,
  activeMapping,
  pickedColumns,
  rightValueColumn,
  valueColumns,
} from "@/shared/lib/mapping-slots"
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
  /*
    **지금 종류에 있는 슬롯만 본다.** 매핑은 종류에 없는 슬롯의 값도 들고 있어서
    (종류를 되돌리면 살아나라고 지우지 않는다) 그대로 읽으면 딴 차트의 컬럼이 적힌다 —
    막대(범주=지역)를 선(X축=월)으로 바꾼 카드가 부제에 "지역 기준"을 계속 달고 있었다.
  */
  const mapping = activeMapping(spec.chartType, spec.mapping)

  // 값 슬롯은 컬럼을 여럿 들 수 있다(누적 막대의 층). 한 칸 안에서 이어 붙이고
  // 화살표는 축의 흐름에만 쓴다 — 층 셋이 `→`로 이어지면 그게 축인 줄 읽힌다.
  const axes = slots
    .filter((slot) => !ASIDE_KEYS.has(slot.key))
    .map((slot) => pickedColumns(mapping[slot.key]).join(" · "))
    .filter(Boolean)
    .join(" → ")

  const right = rightValueColumn(spec.chartType, mapping, spec.aggregation === "count")
  const hasSeries = slots.some((slot) => slot.key === "series")
  const aside = [
    right && `${right}(우)`,
    hasSeries ? mapping.series : undefined,
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
    measure: valueColumns(mapping).join(" · ") || mapping.y,
    by: mapping.category ?? mapping.x,
  }
}
