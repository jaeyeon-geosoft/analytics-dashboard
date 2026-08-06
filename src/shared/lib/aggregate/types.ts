import type { ChartType } from "@/shared/lib/chart-types"
import type { Aggregation, CategoryOrder, Reference } from "@/shared/lib/chart-options"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import type { Mapping } from "@/shared/lib/mapping-slots"

/** 값 축 위의 한 점. */
export type ChartReference = {
  value: number
  /** 축 이름에 그대로 나가는 글자 */
  label: string
}

export type ChartSeries = {
  key: string
  label: string
  /** 선 차트에서 두 지표를 나란히 볼 때만. 없으면 축이 하나다. */
  axis?: "left" | "right"
}

export type ChartFrame = {
  /** `{ x: 범주/축값, [series.key]: 집계값 }` */
  rows: Record<string, string | number>[]
  series: ChartSeries[]
  xLabel: string
  yLabel: string
  /** 오른쪽 축 이름. 축이 하나면 없다. */
  y2Label?: string
  /** 원형에서 "기타"로 접힌 범주 수. 다른 종류는 자르지 않으므로 항상 0 */
  folded: number
  /** 기준선. 고르지 않았으면 없다. */
  reference?: ChartReference
  /** 화면 해상도에 맞춰 줄였을 때의 **원래** 점 수. 줄이지 않았으면 없다. */
  sampledFrom?: number
}

export type ScatterFrame = {
  series: { key: string; label: string; points: { x: number; y: number }[] }[]
  xLabel: string
  yLabel: string
  /** 점 상한에 걸려 빠진 행 수 */
  omitted: number
}

/** 차트 한 장을 그리는 데 필요한 입력 전부. 이 묶음이 같으면 결과도 같다. */
export type PlotRequest = {
  chartType: ChartType
  mapping: Mapping
  aggregation: Aggregation
  reference: Reference
  /** 범주 축 정렬. 날짜·숫자 축과 시계열에는 쓰이지 않는다. */
  order: CategoryOrder
  columns: ColumnInfo[]
  rows: Record<string, string>[]
}

/**
 * 그릴 것. 어느 프레임이 들어 있는지가 `kind`로 드러난다.
 *
 * 예전에는 `frame`·`scatter`를 둘 다 nullable로 들고 다녔는데, 그러면 "차트 종류"와
 * "실제로 찬 프레임"이 어긋난 상태가 타입상 가능하고 읽는 쪽마다 `isPointChart`를
 * 다시 물어야 했다. 여기서 한 번 갈라 놓으면 그 물음이 사라진다.
 */
export type PlotData =
  | { kind: "cartesian"; frame: ChartFrame }
  | { kind: "scatter"; frame: ScatterFrame }
