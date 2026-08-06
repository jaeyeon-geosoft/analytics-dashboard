import type { ChartType } from "@/shared/lib/chart-types"

/**
 * 차트 종류를 성질로 묶는 자리.
 *
 * 종류 리터럴(`chartType === "line"`)을 화면·집계 곳곳에 흩뿌리면 종류를 하나 더할 때
 * 어디를 고쳐야 하는지 알 수 없다. 묻는 말을 여기 이름으로 세워둔다.
 */

/** 집계하지 않고 행 하나를 점 하나로 그리는 종류. 집계 UI와 계산 경로가 갈린다. */
export function isPointChart(chartType: ChartType): boolean {
  return chartType === "scatter" || chartType === "path"
}

/**
 * 집계(합계/평균/개수)를 **고를 수 있는** 종류.
 * 산점도·궤적은 행 하나가 점 하나라 묶을 일이 없다.
 */
export function usesAggregation(chartType: ChartType): boolean {
  return !isPointChart(chartType)
}

/**
 * 점을 하나의 `<path>`로 잇는 종류.
 *
 * 창(`usePlotWindow`)이 필요한 이유는 마크 하나가 SVG 노드 하나이기 때문인데, 여기는
 * 점이 몇 개든 노드가 하나다. 자를 이유가 없고, 자르면 시계열의 모양 자체를 못 본다.
 */
export function isTimeline(chartType: ChartType): boolean {
  return chartType === "line" || chartType === "area"
}

/**
 * 기준선(평균·중앙값)을 걸 수 있는 종류.
 *
 * 값 축이 하나로 정해지는 곳만이다. 누적 막대는 "무엇의 평균"인지 모호하고, 이중 축이
 * 켜진 선 차트는 어느 축의 선인지 말할 수 없어 계산 쪽에서 다시 걸러낸다.
 */
export function allowsReference(chartType: ChartType): boolean {
  return (
    chartType === "line" || chartType === "area" || chartType === "bar" || chartType === "hbar"
  )
}

/** 오른쪽 축을 세울 수 있는 종류. 영역은 채움이 서로를 가려서 주지 않는다. */
export function allowsRightAxis(chartType: ChartType): boolean {
  return chartType === "line"
}
