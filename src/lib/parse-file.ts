import Papa from "papaparse"

/** 브라우저 메모리에 다 들고 있는 구조라 행 수에도 상한이 필요하다. */
export const MAX_ROWS = 100_000

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

export async function parseFile(file: File, sheetName?: string): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer()
  return isSpreadsheet(file) ? parseWorkbook(buffer, sheetName) : parseDelimited(buffer)
}

/**
 * 파일 전체를 한 번에 디코딩한 뒤 파싱한다.
 *
 * papaparse의 청크 스트리밍(`chunk` 콜백)을 쓰면 청크마다 따로 디코딩하기 때문에
 * 10MB 경계에 걸친 멀티바이트 문자가 조용히 깨진다 — 37MB 한글 파일에서 실제로 재현됐다.
 * 한 번에 디코딩하면 그 문제가 사라진다. 대신 파싱이 동기라 상한(50MB)에서 200~300ms
 * 정도 메인스레드를 잡는다. 그보다 커지면 Worker로 옮길 것.
 */
function parseDelimited(buffer: ArrayBuffer): ParsedFile {
  const encoding = detectEncoding(buffer)
  const text = new TextDecoder(encoding).decode(buffer)

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    // 끄고 간다. 켜면 "007"을 조용히 7로 바꿔서 타입 추론이 무의미해진다.
    dynamicTyping: false,
  })

  const truncated = result.data.length > MAX_ROWS

  return {
    columns: result.meta.fields ?? [],
    rows: truncated ? result.data.slice(0, MAX_ROWS) : result.data,
    encoding,
    truncated,
    // FieldMismatch만 센다. 단일 컬럼 파일에서 나오는 UndetectableDelimiter 같은
    // 파일 단위 경고까지 세면 "N개 행 모양이 다름"이 거짓말이 된다.
    errorCount: result.errors.filter((error) => error.type === "FieldMismatch").length,
    sheets: [],
    sheet: null,
  }
}

/**
 * 시트를 행 배열의 배열로 읽고 CSV와 같은 모양으로 맞춘다.
 *
 * `raw: false`로 서식이 적용된 문자열을 받는다 — 숫자·날짜 판정은 우리 추론이 하므로
 * 여기서 타입을 정해버리면 안 되고, 통화·퍼센트는 분석가가 Excel에서 보던 모양 그대로
 * 오는 편이 낫다.
 *
 * `dateNF`는 `sheet_to_json`이 아니라 `read`에 줘야 먹는다. 안 주면 셀 서식이 이겨서
 * `7/30/26`으로 나오고 날짜 추론에 걸리지 않는다. `raw: true`는 Date 객체를 주지만
 * 시간대 때문에 하루가 밀리므로 쓰지 않는다.
 */
async function parseWorkbook(buffer: ArrayBuffer, requested?: string): Promise<ParsedFile> {
  // SheetJS는 gzip 기준 100KB가 넘는다. CSV만 쓰는 경우가 대부분이라 그때 받는다.
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    dateNF: "yyyy-mm-dd",
  })
  const sheets = workbook.SheetNames

  if (sheets.length === 0) {
    return { columns: [], rows: [], encoding: null, truncated: false, errorCount: 0, sheets, sheet: null }
  }

  const sheet = requested && sheets.includes(requested) ? requested : sheets[0]
  const grid = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheet], {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  })

  const [headerRow = [], ...dataRows] = grid
  const columns = dedupe(
    headerRow.map((cell, index) => String(cell ?? "").trim() || `열${index + 1}`)
  )

  let errorCount = 0
  const rows: Record<string, string>[] = []
  let truncated = false

  for (const cells of dataRows) {
    if (cells.length > columns.length) errorCount += 1
    // 전부 빈 행은 버린다. Excel은 서식만 남은 빈 행을 흔히 들고 있다.
    if (cells.every((cell) => String(cell ?? "").trim() === "")) continue
    if (rows.length >= MAX_ROWS) {
      truncated = true
      break
    }
    const row: Record<string, string> = {}
    columns.forEach((name, index) => {
      row[name] = String(cells[index] ?? "")
    })
    rows.push(row)
  }

  return { columns, rows, encoding: null, truncated, errorCount, sheets, sheet }
}
