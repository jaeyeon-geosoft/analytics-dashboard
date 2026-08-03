import type { ChartType } from "@/lib/chart-types"
import type { Aggregation, Reference } from "@/lib/aggregate"
import type { ColumnInfo } from "@/lib/infer-types"
import { fillMapping, pruneMapping, type Mapping, type MappingKey } from "@/lib/mapping-slots"

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
