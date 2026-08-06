/** 타입 추론의 공개 얼굴 — 값을 읽는 규칙 · 추론 · 경고. */
export { inferColumns } from "@/shared/lib/infer-types/infer-columns"
export { columnWarning } from "@/shared/lib/infer-types/column-warning"
export { toDateOrder, toNumber } from "@/shared/lib/infer-types/parse-value"
export { COLUMN_TYPE_LABELS } from "@/shared/lib/infer-types/labels"
export type { ColumnInfo, ColumnType } from "@/shared/lib/infer-types/types"
