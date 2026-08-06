/** dataviz: 원형은 한눈에 보는 용도라 조각 6개까지. 나머지는 "기타"로 접는다. */
export const MAX_SLICES = 6

/** 접힌 조각의 이름. 렌더러가 이 이름을 보고 무채색을 입힌다(엔티티가 아니므로). */
export const OTHER_LABEL = "기타"

/**
 * 선·영역이 한 번에 그릴 점 수.
 *
 * 창으로 자르지 않는 이유는 시계열은 모양이 곧 정보이기 때문인데, 그렇다고 다 그릴 수도
 * 없다 — 100,000점을 넘기면 `<path>`의 `d` 속성만 4.7MB가 되고 렌더가 **39초** 걸린다
 * (재렌더마다 40초씩 다시 든다. 실제로 탭이 얼어붙었다). 플롯 폭이 1,500px을 넘는 일이
 * 없으니 그 두 배면 픽셀당 두 점 — 눈으로 구분할 수 있는 한계다.
 */
export const MAX_TIMELINE_POINTS = 3000

/**
 * 산점도·궤적이 그릴 점의 상한. 넘는 행은 **버린다** — 위 `MAX_TIMELINE_POINTS`가
 * 줄이되 남기는 것과 달리 여기는 잘라내는 것이라, 같은 3,000이어도 뜻이 다르다.
 * 점 하나가 SVG 노드 하나라서 줄일 방법이 없다(줄이면 관계 자체가 달라진다).
 */
export const MAX_SCATTER_POINTS = 3000

/**
 * 시리즈 필드 이름의 접두사.
 *
 * 시리즈 이름을 필드 이름으로 그대로 쓰면 "x"라는 이름의 시리즈가 범주 필드를 덮어쓴다.
 * 번호로 만들어 그 충돌을 없앤다.
 */
export const SERIES_KEY_PREFIX = "s"

export function seriesKey(index: number): string {
  return `${SERIES_KEY_PREFIX}${index}`
}

/** 분할 컬럼의 값이 비어 있는 행이 모이는 시리즈. 빈 이름으로 두면 범례가 비어 보인다. */
export const EMPTY_SERIES_LABEL = "(없음)"

/** 값 컬럼 없이 행을 세기만 할 때의 값 축 이름. */
export const COUNT_LABEL = "행 개수"
