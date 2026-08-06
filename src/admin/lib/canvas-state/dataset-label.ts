import type { AdminDataset } from "@/admin/lib/canvas-state/types"

/**
 * 화면에 보일 이름. 시트가 여럿인 워크북이면 **어느 시트인지까지** 밝힌다.
 *
 * 사이드바·요약 바·내보내기가 모두 이 기준을 본다 — 한 곳에서 시트를 빼면 같은 파일의
 * 두 데이터셋이 화면에서 같은 이름으로 보인다.
 */
export function datasetLabel(dataset: AdminDataset): string {
  const { sheet, sheets } = dataset.data
  return sheet && sheets.length > 1 ? `${dataset.name} › ${sheet}` : dataset.name
}
