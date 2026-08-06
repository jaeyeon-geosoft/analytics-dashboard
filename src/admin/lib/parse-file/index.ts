import { parseDelimited } from "@/admin/lib/parse-file/parse-delimited"
import { parseWorkbook } from "@/admin/lib/parse-file/parse-workbook"
import type { ParseOptions, ParsedFile } from "@/admin/lib/parse-file/types"

/**
 * xlsx·xls는 zip 또는 OLE 컨테이너다. **확장자만 보고 텍스트로 읽지 말 것** —
 * papaparse에 넘기면 에러 없이 그럴듯한 가짜 컬럼과 행이 나온다(랜덤 바이너리에서
 * "15행 2컬럼"이 나왔다).
 */
function isSpreadsheet(file: File): boolean {
  return /\.(xlsx|xlsm|xlsb|xls)$/i.test(file.name)
}

/** 파일 하나를 표로. 어느 파서로 갈지는 여기서만 갈린다. */
export async function parseFile(file: File, options: ParseOptions = {}): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer()
  return isSpreadsheet(file) ? parseWorkbook(buffer, options) : parseDelimited(buffer, options)
}

export { MAX_ROWS, PREVIEW_ROWS } from "@/admin/lib/parse-file/constants"
export type { ParseOptions, ParsedFile } from "@/admin/lib/parse-file/types"
