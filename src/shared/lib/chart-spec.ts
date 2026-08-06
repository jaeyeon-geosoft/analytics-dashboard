import type { ChartType } from "@/shared/lib/chart-types"
import type { Aggregation, CategoryOrder, Reference } from "@/shared/lib/aggregate"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import {
  fillMapping,
  MAPPING_SLOTS,
  pruneMapping,
  rightValueColumn,
  type Mapping,
  type MappingKey,
} from "@/shared/lib/mapping-slots"

/**
 * 한 화면에 올릴 수 있는 차트 수.
 *
 * 색 슬롯(8개)과는 무관하다. 카드가 좁아질수록 눈금 라벨과 범례가 먼저 무너지고,
 * 집계는 카드마다 따로 도는데 산점도는 한 장에 389ms를 쓴다.
 */
export const MAX_CHARTS = 4

/** 차트 한 장을 그리는 데 필요한 것 전부. 데이터는 파일 단위라 여기 없다. */
export type ChartSpec = {
  id: string
  chartType: ChartType
  mapping: Mapping
  aggregation: Aggregation
  reference: Reference
  /**
   * 범주 축 정렬. **없으면 파일 순서**로 읽는다 — 이 필드가 생기기 전에 저장된
   * 대시보드가 그대로 열려야 한다(그때는 값 큰 순이었으므로 모양이 바뀐다. 순서가
   * 의미인 범주를 되살리는 것이 이 필드를 넣은 이유다).
   */
  order?: CategoryOrder
}

// 세션 안에서만 겹치지 않으면 된다. 번호가 그대로 드러나 디버깅도 쉽다.
let counter = 0

export function createChart(columns: ColumnInfo[], chartType: ChartType = "bar"): ChartSpec {
  counter += 1
  return {
    id: `chart-${counter}`,
    chartType,
    mapping: fillMapping({}, chartType, columns),
    aggregation: "sum",
    reference: "none",
    order: "file",
  }
}

/**
 * 보고 있던 차트를 그대로 한 장 더. 빈 카드에서 매핑을 처음부터 고르는 것보다,
 * 옆에 붙여놓고 한 군데만 바꿔 비교하는 쪽이 이 도구를 쓰는 방식에 가깝다.
 */
export function duplicateChart(spec: ChartSpec): ChartSpec {
  counter += 1
  return { ...spec, id: `chart-${counter}` }
}

/**
 * 매핑을 지금의 종류·컬럼에 다시 맞춘다. 후보에서 빠진 선택은 걷어내고(`prune`),
 * 비어버린 필수 슬롯은 다시 채운다(`fill`).
 *
 * 두 함수는 **언제나 이 순서로 짝을 이룬다** — 걷어내기만 하면 필수 슬롯이 빈 채로
 * 남아 차트가 사라지고, 채우기만 하면 후보가 아닌 값이 그대로 남아 Select가 빈칸이
 * 된다. 짝을 흩어놓지 않으려고 여기 하나로 둔다.
 */
function refit(mapping: Mapping, chartType: ChartType, columns: ColumnInfo[]): Mapping {
  return fillMapping(pruneMapping(mapping, chartType, columns), chartType, columns)
}

/** 차트 종류를 바꾼다. 같은 key의 선택은 살아남고 나머지만 다시 맞춰진다. */
export function withChartType(
  spec: ChartSpec,
  chartType: ChartType,
  columns: ColumnInfo[]
): ChartSpec {
  return { ...spec, chartType, mapping: refit(spec.mapping, chartType, columns) }
}

/**
 * 컬럼 타입이 바뀐 뒤 다시 맞춘다. 종류는 그대로다 — 사용자가 "숫자"라고 고친
 * 컬럼이 값 슬롯의 후보로 새로 들어오거나, 반대로 빠질 수 있다.
 */
export function withColumns(spec: ChartSpec, columns: ColumnInfo[]): ChartSpec {
  return { ...spec, mapping: refit(spec.mapping, spec.chartType, columns) }
}

/** 슬롯 하나의 선택. `column`이 없으면 "없음"이라 키째 지운다. */
export function withMapping(spec: ChartSpec, key: MappingKey, column?: string): ChartSpec {
  const mapping = { ...spec.mapping }
  if (column) mapping[key] = column
  else delete mapping[key]
  return { ...spec, mapping }
}

/**
 * 카드가 무엇을 그리고 있는지 한 줄로. 네 장이 나란히 서면 종류만으로는 구분이 안 된다.
 * 분할과 오른쪽 축은 X→Y의 흐름이 아니므로 화살표에 끼우지 않고 뒤에 덧붙인다.
 *
 * 내보낼 때 차트 제목으로도 쓴다 — 카드 머리와 뷰어가 같은 문장을 쓰게 하려고 export한다.
 */
export function describeMapping(spec: ChartSpec): { axes: string; aside?: string } {
  const slots = MAPPING_SLOTS[spec.chartType]
  const axes = slots
    .filter((slot) => slot.key !== "series" && slot.key !== "y2")
    .map((slot) => spec.mapping[slot.key])
    .filter(Boolean)
    .join(" → ")

  const right = rightValueColumn(spec.chartType, spec.mapping, spec.aggregation === "count")
  const hasSeries = slots.some((slot) => slot.key === "series")
  const aside = [
    right && `${right}(우)`,
    hasSeries ? spec.mapping.series : undefined,
  ].filter(Boolean)

  return { axes, aside: aside.length > 0 ? aside.join(" · ") : undefined }
}
