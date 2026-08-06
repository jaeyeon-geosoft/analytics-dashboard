import type { ColumnType } from "@/shared/lib/infer-types/types"

/** 컬럼 타입의 이름. 컬럼 목록의 선택지와 매핑 슬롯의 "후보 없음" 문구가 같은 표를 본다. */
export const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  number: "숫자",
  date: "날짜",
  category: "범주",
}
