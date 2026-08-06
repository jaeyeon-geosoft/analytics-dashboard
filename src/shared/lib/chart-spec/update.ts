import type { ChartType } from "@/shared/lib/chart-types"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import {
  fillMapping,
  pruneMapping,
  type Mapping,
  type MappingKey,
} from "@/shared/lib/mapping-slots"
import type { ChartSpec } from "@/shared/lib/chart-spec/types"

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
