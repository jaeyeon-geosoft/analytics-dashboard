import type { ColumnType } from "@/shared/lib/infer-types"

/**
 * 슬롯 key는 차트 종류를 넘나든다. 막대의 `series`와 선의 `series`는 같은 역할이므로,
 * 종류를 바꿔도 선택한 컬럼이 그대로 남는다. 반대로 `category`와 `x`는 다른 역할이라
 * 서로 넘어가지 않는다.
 */
export type MappingKey = "category" | "value" | "series" | "x" | "y" | "y2"

/**
 * 슬롯 → 고른 컬럼.
 *
 * **`value`만 여럿을 받는다.** 누적 막대에서 숫자 컬럼 하나하나가 층이 되는 모양
 * (엑셀·Power BI·Tableau가 하는 방식)을 위해서다. 분석가가 엑셀로 뽑는 요약표는
 * 층이 컬럼으로 펼쳐진 채 나오는 일이 흔하고, 그때 층을 가를 범주 컬럼은 파일
 * 어디에도 없다 — 컬럼 **이름**이 그 역할을 한다.
 *
 * 나머지 슬롯은 언제나 컬럼 하나다. 전부 `string | string[]`로 열어두면 배열이 될 수
 * 없는 자리마다 좁히기가 붙어서, 읽는 코드가 규칙보다 잡음으로 채워진다.
 */
export type Mapping = {
  category?: string
  value?: string | string[]
  series?: string
  x?: string
  y?: string
  y2?: string
}

export type MappingSlot = {
  key: MappingKey
  label: string
  /** 이 슬롯이 차트에서 무엇이 되는지. 라벨만으로는 안 읽혀서 아래에 한 줄 붙인다. */
  hint: string
  optional?: boolean
  /**
   * 이 슬롯에 넣을 수 있는 컬럼 타입. 나머지는 후보에서 뺀다.
   * **순서가 곧 선호도다** — 앞쪽 타입이 목록 위에 오고 자동 선택에서 먼저 잡힌다.
   */
  accepts: ColumnType[]
  /** 시리즈 슬롯처럼 고유값이 적어야만 쓸 수 있는 경우 */
  maxDistinct?: number
  /**
   * 컬럼을 여럿 고를 수 있는 슬롯. **고른 컬럼 하나하나가 시리즈가 된다** —
   * 상한은 색 슬롯 수(`MAX_SERIES`)이지, 여기서 따로 세지 않는다.
   */
  multiple?: boolean
  /**
   * 자동 선택에서 고유값이 너무 많거나(막대 수천 개) 하나뿐인(막대 하나) 컬럼을 뒤로
   * 미룰지. 후보에서 빼지는 않으니 직접 고르는 건 된다.
   */
  preferModerateCardinality?: boolean
}
