/**
 * 색 슬롯이 8개라 시리즈도 8개가 상한이다. CLAUDE.md: "9번째 시리즈는 색을 새로
 * 만들지 말 것 — 기타로 묶거나 차트를 분할한다."
 */
export const MAX_SERIES = 8

/**
 * 산점도·궤적의 시리즈 상한.
 *
 * 이 형태는 아무 두 마크나 나란히 놓일 수 있어서 4개부터 색 구분이 무너진다
 * (`--chart-4` 노랑과 `--chart-2` 주황이 함께 등장한다).
 */
export const MAX_POINT_SERIES = 3

/**
 * 자동 선택에서 이만큼은 고유값이 있어야 쓸 만하다. 값이 하나뿐이면 막대 하나짜리
 * 차트가 되어 아무것도 보여주지 못한다.
 */
export const MIN_INFORMATIVE_DISTINCT = 2
