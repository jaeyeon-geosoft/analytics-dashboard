import type { ChartType } from "@/shared/lib/chart-types"
import { MAX_POINT_SERIES, MAX_SERIES } from "@/shared/lib/mapping-slots/constants"
import type { MappingSlot } from "@/shared/lib/mapping-slots/types"

const VALUE: MappingSlot = {
  key: "value",
  label: "값",
  hint: "크기가 될 숫자",
  accepts: ["number"],
}

const CATEGORY: MappingSlot = {
  key: "category",
  label: "범주",
  hint: "막대·조각 하나하나가 될 기준",
  accepts: ["category", "date"],
  // 자동 선택이 극단을 피하게 한다. ID처럼 행마다 다른 컬럼은 막대 수천 개가 되고,
  // 값이 하나뿐인 컬럼은 막대 하나짜리 차트가 된다(둘 다 아무것도 못 보여준다).
  preferModerateCardinality: true,
}

const SERIES: MappingSlot = {
  key: "series",
  label: "분할",
  hint: "색으로 한 번 더 나눌 기준",
  optional: true,
  accepts: ["category", "date"],
  maxDistinct: MAX_SERIES,
}

/**
 * 선·영역의 X축은 순서만 있으면 되므로 셋 다 받는다 — 분기(`2026-Q2`)처럼 순서가 있는
 * 범주도 정당하다. 다만 날짜·숫자를 먼저 고른다. 지역처럼 순서 없는 범주를 선으로 이으면
 * 데이터에 없는 추세를 만들어낸다.
 */
const ORDERED_X: MappingSlot = {
  key: "x",
  label: "X축",
  hint: "가로로 늘어놓을 순서",
  accepts: ["date", "number", "category"],
}

const NUMERIC_Y: MappingSlot = {
  key: "y",
  label: "Y축",
  hint: "세로 높이가 될 숫자",
  accepts: ["number"],
}

/**
 * 선 차트에만 있는 두 번째 값. 왼쪽과 스케일이 다른 지표(매출 vs 전환율)를 한 화면에서
 * 보려고 오른쪽에 축을 하나 더 세운다.
 *
 * 두 축의 눈금을 어떻게 맞추느냐에 따라 선이 교차하는 자리가 달라져서, 데이터에 없는
 * 상관관계가 보일 수 있다. 그래서 범례에 (좌)/(우)를 적고, 축 이름 옆에 그 선의 색을
 * 붙이고, 표 보기를 함께 준다. 분할·개수 집계와는 함께 쓰지 않는다.
 */
const RIGHT_Y: MappingSlot = {
  key: "y2",
  label: "Y축(우)",
  hint: "오른쪽 축에 겹쳐 그릴 다른 숫자",
  optional: true,
  accepts: ["number"],
}

/**
 * 산점도와 궤적은 같은 슬롯을 쓴다 — 둘 다 행 하나가 점 하나고 두 축이 모두 수치다.
 * 다른 건 점을 잇느냐뿐이라, 슬롯을 하나로 묶어 두 종류가 갈라지지 않게 한다.
 */
const POINT_SLOTS: MappingSlot[] = [
  { key: "x", label: "X축", hint: "가로 위치가 될 숫자", accepts: ["number"] },
  NUMERIC_Y,
  { ...SERIES, maxDistinct: MAX_POINT_SERIES },
]

export const MAPPING_SLOTS: Record<ChartType, MappingSlot[]> = {
  bar: [CATEGORY, VALUE, SERIES],
  hbar: [CATEGORY, VALUE, SERIES],
  /*
    쌓을 것을 정하는 길이 둘이다. 어느 쪽이든 하나는 있어야 층이 생긴다.

    - **값 컬럼을 여럿 고른다**(wide). 숫자 컬럼 하나하나가 층이고 컬럼 이름이 곧
      층 이름이다. 엑셀에서 표를 통째로 잡아 누적 막대를 만드는 것이 이 방식이고,
      분석가가 뽑아오는 요약표가 대개 이 모양이다.
    - **누적 기준으로 가른다**(long). 층 이름이 범주 컬럼의 값으로 들어 있다.

    둘은 함께 쓰지 않는다 — 켜지는 순간 시리즈가 컬럼 N개 × 범주 M개로 늘어 색이
    모자란다(`Y축(우)`와 `분할`이 서로를 잠그는 것과 같은 이유다). 값이 여럿이면
    누적 기준이 잠기고, 누적 기준이 켜져 있으면 값은 하나로 줄어든다.
  */
  stacked: [
    CATEGORY,
    { ...VALUE, multiple: true, hint: "쌓아 올릴 숫자. 여럿 고르면 하나하나가 층이 된다" },
    { ...SERIES, label: "누적 기준", hint: "한 컬럼 안의 값으로 층을 가를 때" },
  ],
  // 축이 둘이 될 수 있으므로 왼쪽도 이름에 자리를 밝힌다. 영역은 채움이 서로를 가려서
  // 오른쪽 축을 주지 않는다.
  line: [
    ORDERED_X,
    { ...NUMERIC_Y, label: "Y축(좌)", hint: "왼쪽 축 높이가 될 숫자" },
    RIGHT_Y,
    SERIES,
  ],
  area: [ORDERED_X, NUMERIC_Y, SERIES],
  scatter: POINT_SLOTS,
  path: POINT_SLOTS,
  pie: [CATEGORY, VALUE],
}
