/**
 * 집계 모듈의 공개 얼굴. 안쪽 파일을 직접 가리키지 말고 여기서 가져갈 것 —
 * 계산 단계를 쪼개고 합치는 것이 바깥에 새지 않아야 한다.
 *
 * 설정 값의 타입(`Aggregation`·`Reference`·`CategoryOrder`)과 그 라벨은 여기 없다.
 * 명세가 들고 다니는 값이라 `chart-options.ts`·`chart-option-labels.ts`에 있다.
 */
export { buildPlot } from "@/shared/lib/aggregate/build-plot"
export { COUNT_LABEL, OTHER_LABEL } from "@/shared/lib/aggregate/constants"
export type {
  ChartFrame,
  ChartReference,
  ChartSeries,
  PlotData,
  PlotRequest,
  ScatterFrame,
} from "@/shared/lib/aggregate/types"
