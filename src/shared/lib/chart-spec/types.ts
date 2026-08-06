import type { Aggregation, CategoryOrder, Reference } from "@/shared/lib/chart-options"
import type { ChartType } from "@/shared/lib/chart-types"
import type { Mapping } from "@/shared/lib/mapping-slots"

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

/** `spec.order`가 없을 때의 뜻. 계약에 optional로 둔 필드는 기본값을 한 곳에 적는다. */
export const DEFAULT_CATEGORY_ORDER: CategoryOrder = "file"
