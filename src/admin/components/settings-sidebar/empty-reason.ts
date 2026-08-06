import { COLUMN_TYPE_LABELS } from "@/shared/lib/infer-types"
import type { MappingSlot } from "@/shared/lib/mapping-slots"

/** 후보가 없을 때 왜 없는지 말해준다. 빈 드롭다운만 보여주면 알 수가 없다. */
export function emptyReason(slot: MappingSlot, hasColumns: boolean): string {
  if (!hasColumns) return "—"
  const types = slot.accepts.map((type) => COLUMN_TYPE_LABELS[type]).join("·")
  if (slot.maxDistinct !== undefined) return `${types} 중 고유값 ${slot.maxDistinct}개 이하 없음`
  return `${types} 컬럼 없음`
}
