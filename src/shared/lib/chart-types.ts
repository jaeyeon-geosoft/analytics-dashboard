/**
 * 차트 종류. 집계·슬롯·명세가 전부 이 값으로 갈리므로 도메인 쪽에 둔다 —
 * 피커 컴포넌트에 두면 `lib/`이 `components/`를 import하게 된다.
 */
export type ChartType =
  | "bar"
  | "hbar"
  | "stacked"
  | "line"
  | "area"
  | "scatter"
  | "path"
  | "pie"
