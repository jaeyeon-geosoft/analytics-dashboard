import type { ColumnType } from "@/shared/lib/infer-types"

/**
 * 슬롯 key는 차트 종류를 넘나든다. 막대의 `series`와 선의 `series`는 같은 역할이므로,
 * 종류를 바꿔도 선택한 컬럼이 그대로 남는다. 반대로 `category`와 `x`는 다른 역할이라
 * 서로 넘어가지 않는다.
 */
export type MappingKey = "category" | "value" | "series" | "x" | "y" | "y2"

export type Mapping = Partial<Record<MappingKey, string>>

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
   * 자동 선택에서 고유값이 너무 많거나(막대 수천 개) 하나뿐인(막대 하나) 컬럼을 뒤로
   * 미룰지. 후보에서 빼지는 않으니 직접 고르는 건 된다.
   */
  preferModerateCardinality?: boolean
}
