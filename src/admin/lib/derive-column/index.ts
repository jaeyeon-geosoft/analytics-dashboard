import { toInstant } from "@/admin/lib/derive-column/iso-instant"
import type { ParsedFile } from "@/admin/lib/parse-file"
import { inferColumns, type ColumnInfo } from "@/shared/lib/infer-types"

/**
 * 직전 행과의 시차 컬럼.
 *
 * 장비 로그에서 "규칙적으로 쏘고 있나"를 보려면 값이 아니라 **행과 행 사이**를 봐야
 * 하는데, 그 수는 파일 어디에도 없다. 그래서 여기서 한 번 만들어 숫자 컬럼으로 세운다.
 *
 * **여기서 멈춘다.** 임의 수식을 계산하는 자리가 아니다 — 그 순간부터 이 도구는
 * 시각화 도구가 아니라 ETL이 된다(CLAUDE.md: "ETL 파이프라인이 아니다").
 */

/** 시차 값의 소수 자릿수. 밀리초까지 남긴다. */
const GAP_DIGITS = 3

const MS_PER_SECOND = 1000

export function gapColumnName(source: string): string {
  return `${source} 시차(초)`
}

/**
 * 이 컬럼으로 시차를 만들 수 있는지. 날짜로 추론됐어도 시각이 없으면 대상이 아니다.
 * 앞에서 처음 만나는 값 하나로 판단한다 — 형식이 섞인 컬럼이면 어차피 타입 추론
 * 단계에서 경고가 붙는다.
 */
export function canDeriveGap(rows: Record<string, string>[], source: string): boolean {
  for (const row of rows) {
    const value = row[source]
    if (typeof value !== "string" || value.trim() === "") continue
    return toInstant(value) !== null
  }
  return false
}

/**
 * 시차 컬럼을 붙인 새 `ParsedFile`과 그 컬럼의 추론 결과를 돌려준다.
 *
 * 기준은 **파일에 적힌 직전 행**이다. 정렬한 순서가 아니다 — 로그는 이미 시간 순으로
 * 쌓여 있고, 여기서 다시 정렬하면 원본에 없던 순서를 지어내게 된다. 첫 행과 값이
 * 비는 행은 빈 칸으로 둔다(추론이 빈 값을 세지 않는다).
 */
export function addGapColumn(
  data: ParsedFile,
  source: string
): { data: ParsedFile; column: ColumnInfo } | null {
  const name = gapColumnName(source)
  if (data.columns.includes(name)) return null

  let previous: number | null = null
  const rows = data.rows.map((row) => {
    const current = toInstant(row[source] ?? "")
    const gap =
      current !== null && previous !== null ? (current - previous) / MS_PER_SECOND : null
    if (current !== null) previous = current
    return { ...row, [name]: gap === null ? "" : gap.toFixed(GAP_DIGITS) }
  })

  const column = inferColumns([name], rows)[0]
  return {
    data: { ...data, columns: [...data.columns, name], rows },
    // 만든 값이라 무엇인지 이미 안다. 샘플 일치율로 다시 의심하게 만들지 않는다.
    column: { ...column, type: "number", inferred: "number" },
  }
}
