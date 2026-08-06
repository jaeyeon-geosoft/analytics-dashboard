import { MUTED_TEXT } from "@/shared/lib/chart-colors"

/*
  차트 안 글자는 세 층이다. **값 라벨(읽는 수) > 축 이름(무엇의 축인지) > 눈금(눈금)**.
  예전에는 셋이 전부 11px muted라 위계가 없었고, 축 이름이 눈금 사이에 떠 있는
  글자처럼 보였다. 크기와 자간으로 가른다 — 색을 더 쓰면 마크보다 눈에 띈다.
*/
export const AXIS_TICK = { fontSize: 10, fill: MUTED_TEXT }

/** 값 축이 먹는 폭(px). 눈금 라벨이 `1.2M`까지 들어갈 만큼. */
export const VALUE_AXIS_WIDTH = 52

/** 가로 막대의 범주 축 폭(px). 넓히면 그만큼 플롯이 좁아진다. */
export const CATEGORY_AXIS_WIDTH = 96

/** 가로 막대의 범주 라벨은 축 폭이 고정이라 글자 수도 고정이다. */
export const CATEGORY_AXIS_MAX_CHARS = 12

/** 마크 하나가 이보다 좁아지면 못 읽는다. 이 밑으로 내려가면 창을 잘라 스크롤로 넘긴다. */
export const MIN_SLOT = 28

/** 막대 하나의 최대 두께. 범주가 적을 때 막대가 띠처럼 퍼지지 않게 한다. */
export const MAX_BAR_SIZE = 24

/** 마크 끝을 둥글리는 반지름. 데이터 끝만 둥글고 베이스라인 쪽은 각지다. */
export const BAR_RADIUS = 4

/** 누적 조각 사이를 벌리는 카드 색 틈(px). 테두리가 아니라 틈이다. */
export const STACK_GAP = 2

/** 마우스를 올린 점의 크기와 링 두께. */
export const ACTIVE_DOT = { r: 4, strokeWidth: 2 }

/** 원형 조각의 안·바깥 반지름과 사이 각도. */
export const PIE_INNER_RADIUS = "35%"
export const PIE_OUTER_RADIUS = "72%"
export const PIE_PADDING_ANGLE = 1
/** 조각 라벨의 범주명은 이 길이에서 자른다. */
export const PIE_LABEL_MAX_CHARS = 10

/** 툴팁이 이보다 좁으면 값과 이름이 붙는다. */
export const TOOLTIP_CLASS = "min-w-44"
