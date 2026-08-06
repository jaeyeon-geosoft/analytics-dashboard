/**
 * 컬럼 타입은 **3종에서 늘리지 않는다.** 포맷 추측 엔진을 만들 자리가 아니다 —
 * 애매하면 범주로 두고 사용자가 고치게 한다.
 */
export type ColumnType = "number" | "date" | "category"

export type ColumnInfo = {
  name: string
  /** 현재 타입. 사용자가 고쳤을 수 있다. */
  type: ColumnType
  /** 추론 원본. `type`과 다르면 사용자가 손댄 것이다. */
  inferred: ColumnType
  /** 샘플 중 추론된 타입으로 읽힌 비율 (0~1). 낮으면 값이 섞여 있다는 뜻. */
  confidence: number
  /** 실제로 들여다본 값의 개수. 0이면 컬럼이 통째로 비어 있다. */
  sampled: number
  /** 고유값 개수. `distinctCapped`면 세다 멈춘 값이라 "그 이상"이라는 뜻만 갖는다. */
  distinctCount: number
  distinctCapped: boolean
}
