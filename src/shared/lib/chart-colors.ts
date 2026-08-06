/**
 * 차트 색은 **여기서만** 고른다. hex/rgb를 하드코딩하지 말 것 — 라이트/다크 값이
 * `src/shared/index.css`에 각각 따로 정의돼 있어서, 박아 넣으면 한쪽 테마가 깨진다.
 */

/**
 * 색은 엔티티(시리즈)에 고정한다. 슬롯 순서대로 1번부터 배정하고 절대 순환시키지
 * 않는다 — 필터로 시리즈가 줄어도 남은 시리즈의 색이 바뀌면 안 된다. 슬롯이 8개라
 * 9번째 시리즈는 애초에 매핑 단계에서 막혀 있다.
 */
export const SLOTS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
]

/** 단일 시리즈 막대는 전부 한 색이다. 길이가 이미 값을 보여주는데 색으로 또 칠하지 않는다. */
export const SINGLE = "var(--chart-1)"

/** "기타"는 엔티티가 아니라 나머지를 접은 자리라서 무채색으로 물러난다. */
export const OTHER_FILL = "var(--muted-foreground)"

/** 격자선·축선. 데이터 마크보다 눈에 띄면 안 되므로 테두리 색으로 물러난다. */
export const GRID = "var(--border)"

/** 카드 표면. 겹치는 점의 링, 누적 조각 사이의 틈, 기준선 뒤의 후광이 이 색이다. */
export const SURFACE = "var(--card)"

/** 글자 색. 값·라벨·범례는 시리즈 색이 아니라 이 색을 입는다(CLAUDE.md). */
export const TEXT = "var(--foreground)"

export const MUTED_TEXT = "var(--muted-foreground)"

/** 시리즈가 하나뿐이면 색을 나눌 이유가 없다. 여럿일 때만 슬롯 순서대로. */
export function seriesColor(index: number, multi: boolean): string {
  return multi ? SLOTS[index] : SINGLE
}
