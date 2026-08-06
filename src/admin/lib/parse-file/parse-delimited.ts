import Papa from "papaparse"

import {
  DELIMITER_PROBE_BYTES,
  DELIMITER_PROBE_ROWS,
} from "@/admin/lib/parse-file/constants"
import { detectEncoding } from "@/admin/lib/parse-file/encoding"
import { shape } from "@/admin/lib/parse-file/shape"
import type { ParseOptions, ParsedFile } from "@/admin/lib/parse-file/types"

/**
 * 구분자를 먼저 정해서 본 파싱에 넘긴다.
 *
 * papaparse에 맡기면 **빈 줄이 하나만 있어도**(끝 개행 포함) 추측이 쉼표로 잘못 떨어져서
 * TSV가 1컬럼이 된다. 우리는 헤더 행 번호를 파일과 맞추려고 빈 줄을 남기기 때문에 항상
 * 걸린다. 빈 줄을 뺀 앞부분 샘플로만 추측하면 된다.
 */
function guessDelimiter(text: string): string {
  const probe = Papa.parse<string[]>(text.slice(0, DELIMITER_PROBE_BYTES), {
    header: false,
    skipEmptyLines: "greedy",
    preview: DELIMITER_PROBE_ROWS,
  })
  return probe.meta.delimiter || ","
}

/**
 * 파일 전체를 한 번에 디코딩한 뒤 파싱한다.
 *
 * papaparse의 청크 스트리밍(`chunk` 콜백)을 쓰면 청크마다 따로 디코딩하기 때문에
 * 10MB 경계에 걸친 멀티바이트 문자가 조용히 깨진다 — 37MB 한글 파일에서 실제로 재현됐다.
 * 한 번에 디코딩하면 그 문제가 사라진다. 대신 파싱이 동기라 상한(50MB)에서 200~300ms
 * 정도 메인스레드를 잡는다. 그보다 커지면 Worker로 옮길 것.
 *
 * `header: false`로 행 배열을 받는다. 헤더 행을 우리가 고르기 때문이다.
 */
export function parseDelimited(buffer: ArrayBuffer, options: ParseOptions): ParsedFile {
  const encoding = detectEncoding(buffer)
  const text = new TextDecoder(encoding).decode(buffer)

  const result = Papa.parse<string[]>(text, {
    header: false,
    delimiter: guessDelimiter(text),
    // 빈 줄을 지우지 않는다. 지우면 "헤더 행" 번호가 사용자가 파일에서 세는 줄 번호와
    // 어긋난다. 데이터에서 빈 행을 빼는 건 shape()가 한다.
    skipEmptyLines: false,
    // 끄고 간다. 켜면 "007"을 조용히 7로 바꿔서 타입 추론이 무의미해진다.
    dynamicTyping: false,
  })

  return {
    ...shape(result.data, options.headerRow),
    encoding,
    sheets: [],
    sheet: null,
  }
}
