import type { ChartType } from "@/shared/lib/chart-types"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import { fillMapping } from "@/shared/lib/mapping-slots"
import { CHART_ID_PREFIX } from "@/shared/lib/chart-spec/constants"
import type { ChartSpec } from "@/shared/lib/chart-spec/types"

// 세션 안에서만 겹치지 않으면 된다. 번호가 그대로 드러나 디버깅도 쉽다.
let counter = 0

function nextId(): string {
  counter += 1
  return `${CHART_ID_PREFIX}${counter}`
}

export function createChart(columns: ColumnInfo[], chartType: ChartType = "bar"): ChartSpec {
  return {
    id: nextId(),
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
  return { ...spec, id: nextId() }
}
