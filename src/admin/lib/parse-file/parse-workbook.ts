import { shape } from "@/admin/lib/parse-file/shape"
import type { ParseOptions, ParsedFile } from "@/admin/lib/parse-file/types"

/** 날짜 셀을 이 서식으로 받는다. `read`에 줘야 먹는다 — `sheet_to_json`에 주면 늦다. */
const DATE_FORMAT = "yyyy-mm-dd"

/**
 * 시트를 행 배열의 배열로 읽는다.
 *
 * `raw: false`로 서식이 적용된 문자열을 받는다 — 숫자·날짜 판정은 우리 추론이 하므로
 * 여기서 타입을 정해버리면 안 되고, 통화·퍼센트는 분석가가 Excel에서 보던 모양 그대로
 * 오는 편이 낫다.
 *
 * `dateNF`는 `sheet_to_json`이 아니라 `read`에 줘야 먹는다. 안 주면 셀 서식이 이겨서
 * `7/30/26`으로 나오고 날짜 추론에 걸리지 않는다. `raw: true`는 Date 객체를 주지만
 * 시간대 때문에 하루가 밀리므로 쓰지 않는다.
 */
export async function parseWorkbook(
  buffer: ArrayBuffer,
  options: ParseOptions
): Promise<ParsedFile> {
  // SheetJS는 gzip 기준 100KB가 넘는다. CSV만 쓰는 경우가 대부분이라 그때 받는다.
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    dateNF: DATE_FORMAT,
  })
  const sheets = workbook.SheetNames

  if (sheets.length === 0) {
    return {
      ...shape([], options.headerRow),
      encoding: null,
      sheets,
      sheet: null,
    }
  }

  const sheet = options.sheet && sheets.includes(options.sheet) ? options.sheet : sheets[0]
  const grid = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheet], {
    header: 1,
    raw: false,
    defval: "",
    // 빈 행도 남긴다. 그래야 "헤더 행" 번호가 시트의 실제 행 번호와 맞는다.
    // 데이터에서 빼는 건 shape()가 한다.
    blankrows: true,
  })

  return {
    ...shape(
      grid.map((cells) => cells.map((cell) => String(cell ?? ""))),
      options.headerRow
    ),
    encoding: null,
    sheets,
    sheet,
  }
}
