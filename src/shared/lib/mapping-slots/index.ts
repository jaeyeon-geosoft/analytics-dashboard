/** 매핑 슬롯의 공개 얼굴 — 슬롯표 · 종류 판별 · 잠금 규칙 · 후보 고르기. */
export { MAPPING_SLOTS } from "@/shared/lib/mapping-slots/slots"
export {
  allowsReference,
  allowsRightAxis,
  isPointChart,
  isTimeline,
  usesAggregation,
} from "@/shared/lib/mapping-slots/chart-kind"
export {
  allowsCategoryOrder,
  lockedReason,
  rightValueColumn,
} from "@/shared/lib/mapping-slots/rules"
export { candidatesFor, fillMapping, pruneMapping } from "@/shared/lib/mapping-slots/candidates"
export type { Mapping, MappingKey, MappingSlot } from "@/shared/lib/mapping-slots/types"
