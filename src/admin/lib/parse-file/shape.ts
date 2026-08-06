import {
  MAX_ROWS,
  PREVIEW_ROWS,
  UNNAMED_COLUMN_PREFIX,
} from "@/admin/lib/parse-file/constants"

/** 같은 이름이 여러 번 나오면 뒤엣것에 번호를 붙인다. 안 그러면 조용히 덮어쓴다. */
function dedupe(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const count = seen.get(name) ?? 0
    seen.set(name, count + 1)
    return count === 0 ? name : `${name} (${count + 1})`
  })
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === "")
}

/**
 * 행 배열에서 헤더를 뽑고 나머지를 객체 행으로 만든다. CSV든 Excel이든 여기로 모인다.
 * 헤더가 1행이 아닌 파일(제목 줄이 위에 붙은 리포트)을 지원하려면 이 단계가 공통이어야 한다.
 */
export function shape(grid: string[][], requestedHeaderRow: number | undefined) {
  const headerRow = Math.min(Math.max(requestedHeaderRow ?? 1, 1), Math.max(grid.length, 1))
  const headerCells = grid[headerRow - 1] ?? []
  const columns = dedupe(
    headerCells.map((cell, index) => cell.trim() || `${UNNAMED_COLUMN_PREFIX}${index + 1}`)
  )

  const rows: Record<string, string>[] = []
  let truncated = false
  let errorCount = 0

  for (const cells of grid.slice(headerRow)) {
    if (isBlankRow(cells)) continue
    if (cells.length !== columns.length) errorCount += 1
    if (rows.length >= MAX_ROWS) {
      truncated = true
      break
    }
    const row: Record<string, string> = {}
    columns.forEach((name, index) => {
      row[name] = cells[index] ?? ""
    })
    rows.push(row)
  }

  return {
    columns,
    rows,
    truncated,
    errorCount,
    headerRow,
    preview: grid.slice(0, PREVIEW_ROWS),
  }
}
