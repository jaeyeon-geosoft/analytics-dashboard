const X_SUFFIX = /_X$/
const Y_SUFFIX = /_Y(\d*)$/

/** `_X`/`_Y`(`_Y1`, `_Y2`, …) 접미사를 뗀 컬럼 이름과, 그 이름으로 다시 꽂은 행. */
export type ParsedTable = {
  xName: string
  /** `_Y` 뒤 번호 순. 번호가 없으면(그냥 `_Y`) 0으로 취급해 맨 앞에 온다. */
  yNames: string[]
  rows: Record<string, string>[]
}

export type ParseTableResult = { ok: true; table: ParsedTable } | { ok: false; reason: string }

/**
 * API 응답 하나를 검증하고 `_X`/`_Y` 접미사로 축 역할을 읽는다. **API 응답을 그대로
 * 믿지 않는다**(절대 원칙 3) — 어긋나면 빈 차트 대신 무엇이 잘못됐는지 반환한다.
 */
export function parseTable(tableName: string, raw: unknown): ParseTableResult {
  if (!Array.isArray(raw)) {
    return { ok: false, reason: `${tableName}: 응답이 배열이 아닙니다.` }
  }
  if (raw.length === 0) {
    return { ok: false, reason: `${tableName}: 응답에 행이 없습니다.` }
  }

  const first = raw[0]
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return { ok: false, reason: `${tableName}: 첫 행이 객체가 아닙니다.` }
  }

  const keys = Object.keys(first)
  const xKeys = keys.filter((key) => X_SUFFIX.test(key))
  if (xKeys.length !== 1) {
    return {
      ok: false,
      reason: `${tableName}: X축 컬럼(_X로 끝나는 키)이 ${xKeys.length}개입니다 — 1개여야 합니다.`,
    }
  }

  const yColumns = keys
    .map((key) => ({ key, match: Y_SUFFIX.exec(key) }))
    .filter((entry): entry is { key: string; match: RegExpExecArray } => entry.match !== null)
    .sort((a, b) => Number(a.match[1] || 0) - Number(b.match[1] || 0))
    .map((entry) => ({ key: entry.key, name: entry.key.replace(Y_SUFFIX, "") }))
  if (yColumns.length === 0) {
    return { ok: false, reason: `${tableName}: Y축 컬럼(_Y로 끝나는 키)이 없습니다.` }
  }

  const xKey = xKeys[0]
  const xName = xKey.replace(X_SUFFIX, "")

  const rows: Record<string, string>[] = []
  for (const [index, row] of raw.entries()) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      return { ok: false, reason: `${tableName}: ${index + 1}번째 행이 객체가 아닙니다.` }
    }
    const record = row as Record<string, unknown>
    const converted: Record<string, string> = { [xName]: String(record[xKey] ?? "") }
    for (const column of yColumns) {
      converted[column.name] = String(record[column.key] ?? "")
    }
    rows.push(converted)
  }

  return { ok: true, table: { xName, yNames: yColumns.map((column) => column.name), rows } }
}
