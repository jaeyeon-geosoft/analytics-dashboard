import { LOW_CONFIDENCE } from "@/shared/lib/infer-types/constants"
import { COLUMN_TYPE_LABELS } from "@/shared/lib/infer-types/labels"
import type { ColumnInfo } from "@/shared/lib/infer-types/types"

/**
 * 이 컬럼의 추론을 왜 못 미더워하는지. 믿을 만하면 `null`.
 *
 * 규칙이 컬럼 목록과 파일 목록 배지 두 곳에서 필요해서 여기 둔다 — 컴포넌트에
 * 두면 한쪽이 "확인할 컬럼 2개"라고 세는 동안 다른 쪽이 다른 기준으로 표시한다.
 */
export function columnWarning(column: ColumnInfo): string | null {
  if (column.type !== column.inferred) return null // 사용자가 이미 손댔다
  // distinctCount는 전수, sampled는 띄엄띄엄 뽑은 것이라 둘을 구분해서 말해야 정확하다.
  if (column.distinctCount === 0) return "값이 모두 비어 있습니다. 차트에 쓸 수 없습니다."
  if (column.sampled === 0) {
    return "샘플에 값이 없었습니다. 대부분 비어 있는 컬럼이라 추론을 믿기 어렵습니다."
  }
  if (column.confidence >= LOW_CONFIDENCE) return null

  const percent = Math.round(column.confidence * 100)
  if (column.inferred === "category") {
    return `샘플의 ${100 - percent}%는 숫자나 날짜로도 읽힙니다. 우편번호·사번처럼 숫자로 보이는 범주인지 확인해 주세요.`
  }
  return `샘플의 ${percent}%만 ${COLUMN_TYPE_LABELS[column.inferred]}로 읽혔습니다. 값이 섞여 있는지 확인해 주세요.`
}
