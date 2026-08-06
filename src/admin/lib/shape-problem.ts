import type { ParsedFile } from "@/admin/lib/parse-file"

/**
 * 읽기는 성공했는데 그릴 것이 없는 경우. **파싱 실패와 문구가 달라야 한다** —
 * "파일을 읽지 못했습니다"로 뭉뚱그리면 헤더 행을 잘못 고른 것인지 시트가 빈 것인지
 * 알 수가 없다.
 */
export function shapeProblem(data: ParsedFile): string | null {
  if (data.columns.length === 0) {
    return data.sheet
      ? `"${data.sheet}" 시트가 비어 있습니다.`
      : `${data.headerRow}행에서 컬럼을 찾지 못했습니다. 헤더가 다른 줄에 있는지 확인해 주세요.`
  }
  if (data.rows.length === 0) return "헤더만 있고 데이터 행이 없습니다."
  return null
}
