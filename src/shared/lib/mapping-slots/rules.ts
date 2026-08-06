import type { ChartType } from "@/shared/lib/chart-types"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import { allowsRightAxis, isTimeline, usesAggregation } from "@/shared/lib/mapping-slots/chart-kind"
import type { Mapping, MappingSlot } from "@/shared/lib/mapping-slots/types"

/**
 * 잠긴 이유. 트리거 폭이 좁아서 **무엇이 막고 있는지만** 같은 길이로 적는다 —
 * 규칙 전체는 매핑 섹션의 설명(ⓘ)이 한 번에 말한다.
 */
const LOCK_REASONS = {
  counting: "개수 집계 중",
  series: "분할 사용 중",
  rightAxis: "Y축(우) 사용 중",
} as const

/**
 * 지금 실제로 오른쪽 축에 그려질 컬럼. 집계·카드 헤더·사이드바가 **같은 규칙**을 봐야
 * 고른 컬럼이 조용히 무시되는 일이 없다.
 *
 * - 분할과 함께면 시리즈가 두 갈래(컬럼 2개 × 범주 N개)로 늘어나 색이 모자란다.
 * - 개수 집계는 값 컬럼을 세지 않아서 두 선이 똑같아진다.
 */
export function rightValueColumn(
  chartType: ChartType,
  mapping: Mapping,
  counting: boolean
): string | undefined {
  if (!allowsRightAxis(chartType)) return undefined
  if (mapping.series || counting) return undefined
  return mapping.y2
}

/**
 * 정렬을 고를 수 있는가.
 *
 * 범주 축을 세우는 종류(막대 3종·원형)이면서 그 컬럼이 **범주**일 때만이다. 날짜·숫자
 * 축과 시계열(선·영역)은 축 자체가 순서라 정렬이 끼어들 자리가 없고, 산점도·궤적은
 * 범주로 묶지도 않는다.
 *
 * 집계가 보는 규칙(`axisIsOrder`)과 짝이다 — 여기서 내놓은 선택지를 저쪽이 무시하면
 * 고른 값이 조용히 안 먹는다.
 */
export function allowsCategoryOrder(
  chartType: ChartType,
  mapping: Mapping,
  columns: ColumnInfo[]
): boolean {
  const categoryType = columns.find((column) => column.name === mapping.category)?.type
  return usesAggregation(chartType) && !isTimeline(chartType) && categoryType === "category"
}

/**
 * 이 슬롯이 지금 잠겨 있다면 그 이유. 트리거에 그대로 띄운다 — 비활성만 시켜두면
 * 왜 못 고르는지 알 수가 없다. 잠긴 동안에도 고른 값은 들고 있다가 잠금이 풀리면
 * 되살아난다(차트 종류를 오갈 때와 같은 방식).
 */
export function lockedReason(
  slot: MappingSlot,
  chartType: ChartType,
  mapping: Mapping,
  counting: boolean
): string | null {
  if (slot.key === "y2") {
    if (counting) return LOCK_REASONS.counting
    if (mapping.series) return LOCK_REASONS.series
    return null
  }
  // 잠자는 y2가 막대의 분할까지 잠그면 안 된다. 실제로 그려지고 있을 때만 잠근다.
  if (slot.key === "series" && rightValueColumn(chartType, mapping, counting)) {
    return LOCK_REASONS.rightAxis
  }
  return null
}
