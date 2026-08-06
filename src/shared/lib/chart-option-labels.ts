import type { Aggregation, CategoryOrder, Reference } from "@/shared/lib/chart-options"

/**
 * 설정 값 → 화면에 보일 이름.
 *
 * **키 순서가 곧 목록 순서다** — 사이드바의 선택지가 이 객체를 그대로 훑는다.
 * 집계 이름은 차트 제목·Y축 이름에도 그대로 나가므로(집계 방식을 화면에 밝힌다)
 * 사이드바와 렌더러가 같은 표를 봐야 한다.
 */

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
  sum: "합계",
  avg: "평균",
  count: "개수",
}

export const ORDER_LABELS: Record<CategoryOrder, string> = {
  file: "파일 순서",
  value: "값 큰 순",
  name: "이름순",
}

export const REFERENCE_LABELS: Record<Reference, string> = {
  none: "없음",
  mean: "평균",
  median: "중앙값",
}
