import type { ChartType } from "@/shared/lib/chart-types"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import { activeMapping } from "@/shared/lib/mapping-slots/active-mapping"
import { allowsRightAxis, isTimeline, usesAggregation } from "@/shared/lib/mapping-slots/chart-kind"
import { MAX_SERIES } from "@/shared/lib/mapping-slots/constants"
import { valueColumns } from "@/shared/lib/mapping-slots/picked"
import type { Mapping, MappingSlot } from "@/shared/lib/mapping-slots/types"

/**
 * 잠긴 이유. 트리거 폭이 좁아서 **무엇이 막고 있는지만** 같은 길이로 적는다 —
 * 규칙 전체는 매핑 섹션의 설명(ⓘ)이 한 번에 말한다.
 */
const LOCK_REASONS = {
  counting: "개수 집계 중",
  series: "분할 사용 중",
  rightAxis: "Y축(우) 사용 중",
  multiValue: "값 컬럼 여럿 사용 중",
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
  // 값 컬럼이 이미 층을 만들고 있으면 누적 기준으로 또 가르지 않는다. y2와 같이
  // **실제로 그려지고 있을 때만** 잠근다 — 막대는 층 목록을 들고 있어도 하나만 쓴다.
  if (slot.key === "series" && stackedValueColumns(chartType, mapping).length > 1) {
    return LOCK_REASONS.multiValue
  }
  return null
}

/**
 * 지금 종류에서 **실제로 층이 되는** 값 컬럼들.
 *
 * 매핑은 지금 종류가 안 쓰는 모양까지 들고 있다 — 누적 막대에서 고른 층 목록은 막대로
 * 넘어가도 지워지지 않는다(되돌리면 살아나야 한다). 그 잠자는 목록을 그대로 세면 막대의
 * 분할이 쓰지도 않는 이유로 잠긴다.
 */
export function stackedValueColumns(chartType: ChartType, mapping: Mapping): string[] {
  return valueColumns(activeMapping(chartType, mapping))
}

/**
 * 값 슬롯에 고를 수 있는 컬럼 수.
 *
 * 상한은 색 슬롯 수다 — 시리즈가 9개가 되는 순간 색을 새로 만들어야 하는데, 그건
 * 하지 않는다(CLAUDE.md). **누적 기준이 켜져 있으면 하나로 줄어든다** — 컬럼도 층이고
 * 범주도 층이면 시리즈가 두 갈래로 곱해져 색이 금방 모자란다. 잠그는 쪽을 값이 아니라
 * 개수로 두는 것은 값 슬롯이 필수라서다. 통째로 잠그면 차트가 사라진다.
 */
export function valueColumnLimit(slot: MappingSlot, mapping: Mapping): number {
  if (!slot.multiple) return 1
  return mapping.series ? 1 : MAX_SERIES
}
