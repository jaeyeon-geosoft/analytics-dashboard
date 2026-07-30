import Papa from "papaparse"

/** 브라우저 메모리에 다 들고 있는 구조라 행 수에도 상한이 필요하다. */
export const MAX_ROWS = 100_000

/** 헤더 행 후보로 보여줄 앞부분 행 수. 제목 줄이 이보다 많이 붙는 파일은 드물다. */
export const PREVIEW_ROWS = 10

export type ParsedFile = {
  columns: string[]
  rows: Record<string, string>[]
  /** 실제로 디코딩에 쓴 인코딩. Excel은 해당 없어서 null. */
  encoding: string | null
  /** 상한에 걸려 뒷부분을 버렸는지 */
  truncated: boolean
  /** 컬럼 수가 헤더와 안 맞는 행의 수 */
  errorCount: number
  /** 워크북의 시트 이름들. CSV면 빈 배열. */
  sheets: string[]
  /** 실제로 읽은 시트 */
  sheet: string | null
  /** 헤더로 쓴 행 (1부터) */
  headerRow: number
  /** 헤더 행을 고르게 하려고 들고 있는 앞부분 원본 행 */
  preview: string[][]
}

export type ParseOptions = {
  sheet?: string
  /** 1부터. 이 행을 헤더로 쓰고 그 아래를 데이터로 본다. */
  headerRow?: number
}

/** xlsx·xls는 zip 또는 OLE 컨테이너다. 텍스트로 읽으면 그럴듯한 쓰레기가 나온다. */
function isSpreadsheet(file: File): boolean {
  return /\.(xlsx|xlsm|xlsb|xls)$/i.test(file.name)
}

/**
 * 앞부분을 UTF-8로 디코딩해보고 치환 문자(U+FFFD)가 섞이면 CP949로 본다.
 * 한국 Excel의 "CSV(쉼표로 분리)"가 CP949로 저장되기 때문에 필요하다.
 * `stream: true`는 끝에서 잘린 멀티바이트 문자를 치환 문자로 만들지 않게 한다.
 */
function detectEncoding(buffer: ArrayBuffer): string {
  const head = buffer.slice(0, 64 * 1024)
  const text = new TextDecoder("utf-8").decode(head, { stream: true })
  return text.includes("�") ? "euc-kr" : "utf-8"
}

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
 * 구분자를 먼저 정해서 본 파싱에 넘긴다.
 *
 * papaparse에 맡기면 **빈 줄이 하나만 있어도**(끝 개행 포함) 추측이 쉼표로 잘못 떨어져서
 * TSV가 1컬럼이 된다. 우리는 헤더 행 번호를 파일과 맞추려고 빈 줄을 남기기 때문에 항상
 * 걸린다. 빈 줄을 뺀 앞부분 샘플로만 추측하면 된다.
 */
function guessDelimiter(text: string): string {
  const probe = Papa.parse<string[]>(text.slice(0, 64 * 1024), {
    header: false,
    skipEmptyLines: "greedy",
    preview: 20,
  })
  return probe.meta.delimiter || ","
}

/**
 * 행 배열에서 헤더를 뽑고 나머지를 객체 행으로 만든다. CSV든 Excel이든 여기로 모인다.
 * 헤더가 1행이 아닌 파일(제목 줄이 위에 붙은 리포트)을 지원하려면 이 단계가 공통이어야 한다.
 */
function shape(grid: string[][], requestedHeaderRow: number | undefined) {
  const headerRow = Math.min(Math.max(requestedHeaderRow ?? 1, 1), Math.max(grid.length, 1))
  const headerCells = grid[headerRow - 1] ?? []
  const columns = dedupe(
    headerCells.map((cell, index) => cell.trim() || `열${index + 1}`)
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

export async function parseFile(file: File, options: ParseOptions = {}): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer()
  return isSpreadsheet(file)
    ? parseWorkbook(buffer, options)
    : parseDelimited(buffer, options)
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
function parseDelimited(buffer: ArrayBuffer, options: ParseOptions): ParsedFile {
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
async function parseWorkbook(buffer: ArrayBuffer, options: ParseOptions): Promise<ParsedFile> {
  // SheetJS는 gzip 기준 100KB가 넘는다. CSV만 쓰는 경우가 대부분이라 그때 받는다.
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    dateNF: "yyyy-mm-dd",
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
