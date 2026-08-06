import { ROW_HEIGHT } from "@/shared/components/data-table/constants"

/** 그리지 않은 행이 차지하던 높이. 스크롤 막대가 전체 길이를 유지한다. */
export function RowSpacer({ rows, span }: { rows: number; span: number }) {
  if (rows <= 0) return null
  return (
    <tr aria-hidden style={{ height: rows * ROW_HEIGHT }}>
      <td colSpan={span} className="p-0" />
    </tr>
  )
}
