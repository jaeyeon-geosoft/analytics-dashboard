import type { ChartType } from "@/components/chart-type-picker"
import type { Aggregation, Reference } from "@/lib/aggregate"
import type { ColumnInfo } from "@/lib/infer-types"
import { fillMapping, type Mapping } from "@/lib/mapping-slots"

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
