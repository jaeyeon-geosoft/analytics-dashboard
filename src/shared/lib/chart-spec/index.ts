/** 차트 명세의 공개 얼굴. 만드는 것·고치는 것·읽는 것이 여기로 모인다. */
export { MAX_CHARTS } from "@/shared/lib/chart-spec/constants"
export { createChart, duplicateChart } from "@/shared/lib/chart-spec/factory"
export { withChartType, withColumns, withMapping } from "@/shared/lib/chart-spec/update"
export { describeMapping, type MappingDescription } from "@/shared/lib/chart-spec/describe"
export { DEFAULT_CATEGORY_ORDER, type ChartSpec } from "@/shared/lib/chart-spec/types"
