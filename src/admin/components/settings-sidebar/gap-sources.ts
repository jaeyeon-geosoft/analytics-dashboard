import { canDeriveGap, gapColumnName } from "@/admin/lib/derive-column"
import type { AdminDataset } from "@/admin/lib/canvas-state"

/**
 * 시차 컬럼을 만들 수 있는 컬럼 이름들.
 *
 * 시각이 든 날짜 컬럼이고, 아직 안 만든 것만. 컬럼마다 버튼이 서 있으면 어수선해지므로
 * 만들 수 있는 자리에만 내놓고 한 번 만들면 목록에서 빠진다.
 */
export function gapSourcesOf(dataset: AdminDataset): Set<string> {
  const names = new Set(dataset.columns.map((column) => column.name))
  return new Set(
    dataset.columns
      .filter(
        (column) =>
          column.type === "date" &&
          !names.has(gapColumnName(column.name)) &&
          canDeriveGap(dataset.data.rows, column.name)
      )
      .map((column) => column.name)
  )
}
